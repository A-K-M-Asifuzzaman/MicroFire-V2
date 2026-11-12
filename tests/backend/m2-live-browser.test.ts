import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect, type Browser, type Page, type Locator } from '@playwright/test';
import { ActionResponseSchema, StartResponseSchema, equipmentDefinitions, PREVIEW_SAVE_KEY, type Snapshot } from '@microfire/shared';

// Browser plugin not available. This runs real Playwright/UI/HTTP in a disposable integration checkout only.
const root = process.cwd();
const artifacts = path.resolve(process.env.MICROFIRE_LIVE_ARTIFACT_DIR ?? '/tmp/microfire-m2-live-proof');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
let workspace = '';
let created = false;
before(() => {
  assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'Commit the test candidate before verifying a pinned checkout.');
  assert.equal(execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim(), 'https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git');
  mkdirSync(artifacts, { recursive: true });
  workspace = mkdtempSync(path.join(tmpdir(), 'microfire-m2-live-'));
  execFileSync('git', ['worktree', 'add', '--detach', workspace, sourceSha], { stdio: 'pipe' });
  created = true;
  const contractPath = path.join(workspace, 'apps/web/game/contract.ts');
  let contract = readFileSync(contractPath, 'utf8');
  const seam = 'export const contractRuntime: ContractRuntime | null = null;';
  assert(contract.includes(seam), 'The approved integration seam changed; review it before testing.');
  contract = contract.replaceAll("'../../../docs/m2/fixtures/contract-types'", "'@microfire/shared'").replace(seam, `
import {ActionResponseSchema,AuthorizeResponseSchema,CapabilityResponseSchema,HttpFailureSchema,RevokeResponseSchema,StartResponseSchema,requestIdentity,noteIssue} from '@microfire/shared';
export const contractRuntime: ContractRuntime = {
  parse: {capability:v=>CapabilityResponseSchema.parse(v),authorize:v=>AuthorizeResponseSchema.parse(v),revoke:v=>RevokeResponseSchema.parse(v),snapshot:v=>StartResponseSchema.parse(v),action:v=>ActionResponseSchema.parse(v),failure:v=>HttpFailureSchema.parse(v)},
  identify:requestIdentity,noteIssue
};`);
  writeFileSync(contractPath, contract);
  const specsPath = path.join(workspace, 'apps/web/game/contract/specs.ts');
  const specs = readFileSync(specsPath, 'utf8');
  assert(specs.includes("from './equipment-copy'"));
  writeFileSync(specsPath, specs.replace("from './equipment-copy'", "from '@microfire/shared'"));
  writeFileSync(path.join(artifacts, 'integration.patch'), execFileSync('git', ['diff', '--', 'apps/web/game/contract.ts', 'apps/web/game/contract/specs.ts'], { cwd: workspace }));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  writeFileSync(path.join(artifacts, 'install.log'), execFileSync(npm, ['ci', '--offline', '--ignore-scripts'], { cwd: workspace, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  writeFileSync(path.join(artifacts, 'consumer-unit.log'), execFileSync(path.join(workspace, 'node_modules/.bin/vitest'), ['run', '--config', 'vitest.m2-ui.config.ts'], { cwd: workspace, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  writeFileSync(path.join(artifacts, 'build.log'), execFileSync(npm, ['run', 'build'], { cwd: workspace, encoding: 'utf8', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024 }));
  console.log(`Disposable UI integration built from ${sourceSha}; production checkout and public availability unchanged.`);
});
after(() => {
  if (created) execFileSync('git', ['worktree', 'remove', '--force', workspace], { cwd: root, stdio: 'pipe' });
});

async function startServer(port: number) {
  const origin = `http://127.0.0.1:${port}`;
  await assert.rejects(fetch(origin + '/api/health'), 'Refusing an occupied test port');
  const approvalToken = randomBytes(32).toString('base64url');
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: origin,
    MICROFIRE_PREVIEW_ACCESS_TOKEN: approvalToken, MICROFIRE_PREVIEW_SIGNING_KEY: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_REALM_ID: randomUUID(), MICROFIRE_PREVIEW_KEY_ID: 'live-browser-only' };
  const child: ChildProcess = spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/local-game-preview.ts'], { cwd: workspace, env, stdio: 'ignore' });
  const stop = async () => { if (child.exitCode === null) await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill('SIGTERM'); }); };
  try {
    for (let i = 0; i < 150; i++) {
      assert.equal(child.exitCode, null, 'Disposable local preview exited');
      try { if ((await fetch(origin + '/api/health')).ok) return { origin, approvalToken, stop }; } catch { /* starting */ }
      await delay(200);
    }
    throw Error('Disposable local preview did not become ready');
  } catch (error) { await stop(); throw error; }
}

for (const [index, mode] of (['keyboard', 'touch', 'no-webgl', '3d'] as const).entries()) test(`real M2 UI: ${mode} completes, exports and resumes a server-confirmed case`, { timeout: 180000 }, async () => {
  const server = await startServer(3390 + index);
  let browser: Browser | undefined;
  let activePage: Page | undefined;
  try {
    browser = await chromium.launch();
    const touch = mode === 'touch';
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: touch, hasTouch: touch, reducedMotion: mode === '3d' ? 'no-preference' : 'reduce' });
    const page = await context.newPage(); activePage = page;
    const runtimeErrors: string[] = [], consoleErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    if (mode === 'no-webgl') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (/webgl/.test(kind)) return null;
        return Reflect.apply(original, this, [kind, ...args]);
      } as typeof original;
    });
    let posts = 0, snapshot: Snapshot;
    page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/api/game/preview/')) posts++; });
    const activate = async (target: Locator) => {
      await expect(target).toBeEnabled();
      if (mode === 'keyboard') { await target.focus(); await target.press('Enter'); }
      else if (touch) { await target.scrollIntoViewIfNeeded(); await target.tap(); }
      else await target.click();
    };
    const radio = async (target: Locator) => {
      if (mode === 'keyboard') { await target.focus(); await target.press('Space'); }
      else await activate(target.locator('..'));
      await expect(target).toBeChecked();
    };
    const nativeSelect = async (target: Locator, value: string) => {
      await expect(target).toBeVisible();
      if (mode !== 'keyboard') { await target.selectOption(value); return; }
      const values = await target.locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
      const at = values.indexOf(value); assert(at >= 0);
      await target.focus(); await target.press('Home');
      for (let i = 0; i < at; i++) await target.press('ArrowDown');
      await target.press('Enter'); await expect(target).toHaveValue(value);
    };
    const responseFor = (endpoint: string) => page.waitForResponse(response => new URL(response.url()).pathname === '/api/game/preview/' + endpoint && response.request().method() === 'POST', { timeout: 15000 });
    const command = async (target: Locator, refused = false) => {
      const before = snapshot.revision, response = responseFor('action'); await activate(target);
      const r = await response; assert.equal(r.status(), 200);
      const data = ActionResponseSchema.parse(await r.json()).data;
      assert.equal(data.ok, !refused, 'Server must decide whether this UI action was accepted'); snapshot = data.snapshot;
      assert.equal(snapshot.revision, before + (refused ? 0 : 1));
      await expect(page.locator('.m2-banner[data-link="submitting"], .m2-banner[data-link="awaiting"]')).toHaveCount(0);
      return data;
    };
    const closePart = async () => { const close = page.getByRole('button', { name: 'Back to bench: close part details' }); if (await close.count()) await activate(close); };
    const selectPart = async (label: string) => activate(page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: new RegExp('^' + label) }));
    const install = async (part: typeof equipmentDefinitions[number], refused = false) => {
      await selectPart(part.label);
      await radio(page.locator(`input[name="m2-mount"][value="${part.anchorId}"]`));
      await radio(page.locator('input[name="m2-orient"][value="correct"]'));
      await command(page.getByRole('button', { name: 'Install ' + part.label.toLowerCase(), exact: true }), refused);
      await closePart();
    };
    const route = server.origin + '/missions/bass-assembly?preview=bass-b20-training-v1';
    await page.goto(route);
    assert.equal(new URL(page.url()).pathname, '/missions/bass-assembly'); assert.match(await page.title(), /BASS|Assembly/i);
    await expect(page.getByRole('heading', { name: 'Authorize this local preview' })).toBeVisible();
    const token = page.getByLabel('Operator access token');
    if (mode === 'keyboard') { await token.focus(); await token.pressSequentially(server.approvalToken); } else await token.fill(server.approvalToken);
    await activate(page.getByRole('button', { name: 'Authorize', exact: true }));
    await expect(page.getByRole('button', { name: 'Start a new training case' })).toBeVisible();
    assert(!(await page.content()).includes(server.approvalToken), 'Credentials must never render in page content');
    const started = responseFor('start'); await activate(page.getByRole('button', { name: 'Start a new training case' }));
    snapshot = StartResponseSchema.parse(await (await started).json()).data;
    assert.equal(snapshot.revision, 0); assert.equal(snapshot.state.passport.entries.length, 0);
    const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await activate(skip);
    if (mode === 'keyboard') {
      let lost = false;
      await page.route('**/api/game/preview/action', async request => {
        if (lost) { await request.continue(); return; } lost = true;
        const real = await request.fetch(); assert.equal(real.status(), 200);
        const confirmed = ActionResponseSchema.parse(await real.json()).data; assert(confirmed.ok); assert.equal(confirmed.snapshot.revision, 1);
        await request.abort('failed');
      });
      await activate(page.getByRole('button', { name: 'Open the source record', exact: true }));
      await expect(page.getByText('Result unknown.', { exact: true })).toBeVisible();
      const reconciled = page.waitForResponse(r => new URL(r.url()).pathname === '/api/game/preview/session/' + snapshot.sessionId);
      await activate(page.getByRole('button', { name: 'Check what happened', exact: true }));
      snapshot = StartResponseSchema.parse(await (await reconciled).json()).data;
      assert.equal(snapshot.revision, 1); await page.unroute('**/api/game/preview/action');
    } else await command(page.getByRole('button', { name: 'Open the source record', exact: true }));
    for (const name of ['Collect the documented observation', 'Complete Station Arrival', 'Enter the training bay']) await command(page.getByRole('button', { name, exact: true }));
    if (mode === '3d' || mode === 'no-webgl') {
      await activate(page.getByRole('button', { name: '3D bench', exact: true }));
      if (mode === '3d') await expect(page.locator('.m2-bench[data-ready="true"][data-frame="true"] canvas')).toBeVisible({ timeout: 30000 });
      else { await expect(page.getByText(/The 3D bench is not available on this device/)).toBeVisible(); await expect(page.locator('.m2-schematic')).toBeVisible(); }
    }
    if (mode === 'keyboard') await install(equipmentDefinitions.find(p => p.id === 'igniter')!, true);
    for (const part of equipmentDefinitions) await install(part);
    assert.equal(snapshot.training.fault?.id, 'training-fan-reversed-v1');
    await expect(page.locator('.m2-fault-banner')).toBeVisible();
    await page.screenshot({ path: path.join(artifacts, mode + '-fault.png'), fullPage: false });
    await command(page.getByRole('button', { name: 'Run Training check', exact: true }));
    if (mode === 'keyboard') {
      await nativeSelect(page.getByLabel('Component'), 'radiometer');
      await radio(page.getByRole('radio', { name: 'Missing', exact: true }));
      const wrong = await command(page.getByRole('button', { name: 'Submit diagnosis', exact: true }));
      assert(wrong.ok && wrong.feedback?.correct === false); await expect(page.getByText('Not this one.', { exact: true })).toBeVisible();
    }
    await nativeSelect(page.getByLabel('Component'), 'fan');
    await radio(page.getByRole('radio', { name: 'Reversed orientation', exact: true }));
    await command(page.getByRole('button', { name: 'Submit diagnosis', exact: true }));
    const fan = equipmentDefinitions.find(p => p.id === 'fan')!;
    await selectPart(fan.label); await command(page.getByRole('button', { name: 'Remove fan', exact: true }));
    assert(snapshot.training.pendingRepair); await radio(page.locator('input[name="m2-mount"][value="duct-inlet"]'));
    await radio(page.locator('input[name="m2-orient"][value="correct"]'));
    await command(page.getByRole('button', { name: 'Install fan', exact: true })); await closePart();
    assert(snapshot.training.repair); await command(page.getByRole('button', { name: 'Request training qualification', exact: true }));
    assert.equal(snapshot.state.setup.qualifiedRevision, snapshot.state.setup.revision);
    await expect(page.locator('.m2-passport')).toHaveCount(0);
    await command(page.getByRole('button', { name: 'Open NASA’s B20 record', exact: true }));
    await expect(page.locator('.m2-dossier')).toContainText('17.4 vol%');
    await expect(page.locator('.m2-pp-section[data-origin="research"] .m2-pp-entry')).toHaveCount(2);
    await expect(page.locator('.m2-pp-section[data-origin="training"]')).toContainText('not applicable');
    await expect(page.locator('.m2-pp-section[data-origin="training"] [data-prov="source"]')).toHaveCount(0);
    const note = page.getByLabel(/Your interpretation/);
    if (mode === 'keyboard') { await note.focus(); await note.pressSequentially('B20 is source evidence; the repair is authored training.'); }
    else await note.fill('B20 is source evidence; the repair is authored training.');
    await command(page.getByRole('button', { name: 'Add note', exact: true }));
    await command(page.getByRole('button', { name: 'Complete the training episode', exact: true }));
    assert.equal(snapshot.progress.completedChecks, 5); assert.equal(snapshot.state.passport.entries.length, 2);
    assert(snapshot.state.passport.entries.every(e => e.corrections.length === 0));
    await expect(page.getByText('Training episode complete', { exact: true })).toBeVisible();
    await expect(page.getByText('Read-only browser save', { exact: true })).toBeVisible();
    await page.locator('.m2-passport').screenshot({ path: path.join(artifacts, mode + '-passport.png') });
    const download = page.waitForEvent('download'); await activate(page.getByRole('button', { name: 'Download checkpoint', exact: true }));
    const file = await download; await file.saveAs(path.join(artifacts, mode + '.checkpoint.txt'));
    const checkpoint = snapshot.checkpoint;
    assert.equal(readFileSync(path.join(artifacts, mode + '.checkpoint.txt'), 'utf8'), checkpoint);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), PREVIEW_SAVE_KEY), null);
    await page.reload(); await expect(page.getByRole('button', { name: 'Start a new training case' })).toBeVisible();
    const restored = responseFor('resume');
    await page.locator('input[type="file"]').setInputFiles({ name: 'case.checkpoint.txt', mimeType: 'text/plain', buffer: Buffer.from(checkpoint) });
    const resumed = StartResponseSchema.parse(await (await restored).json()).data;
    assert.equal(resumed.checkpoint, checkpoint); assert.equal(resumed.progress.completedChecks, 5);
    await expect(page.getByText('Training episode complete', { exact: true })).toBeVisible();
    assert(posts <= 30, 'Live UI must respect the unchanged server POST budget');
    assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'));
    assert.equal(consoleErrors.filter(e => !/ERR_FAILED|WebGL|WebGLRenderer|Error creating WebGL context|CONTEXT_LOST/i.test(e)).length, 0, 'Unexpected console errors; inspect the sanitized proof record.');
    writeFileSync(path.join(artifacts, mode + '.json'), JSON.stringify({ sourceSha, mode, url: route, viewport: page.viewportSize(), browser: browser.version(), revision: resumed.revision, posts,
      learningChecks: resumed.progress.completedChecks, passportEntries: resumed.state.passport.entries.length, pageErrors: runtimeErrors, consoleErrors, writableSavesEnabled: false,
      integrationScope: 'disposable-local-review-only-not-release-approval' }, null, 2) + '\n');
    console.log(`${mode}: real UI completed and resumed; ${posts} POSTs, ${resumed.progress.completedChecks}/5 checks, two source entries. Public runtime remains disconnected.`);
    await context.close();
  } catch (error) {
    const message = String(error instanceof Error ? error.stack : error).replaceAll(server.approvalToken, '[redacted]');
    writeFileSync(path.join(artifacts, mode + '-failure.txt'), message + '\n');
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: path.join(artifacts, mode + '-failure.png'), fullPage: false }).catch(() => undefined);
      writeFileSync(path.join(artifacts, mode + '-failure.html'), (await activePage.content()).replaceAll(server.approvalToken, '[redacted]'));
    }
    // eslint-disable-next-line preserve-caught-error -- The original cause may contain the operator credential.
    throw Error(message);
  } finally { await browser?.close(); await server.stop(); }
});
