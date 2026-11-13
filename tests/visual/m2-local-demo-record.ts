// Records the REAL BASS-II training loop against a loopback-only, credentialed local preview server, at human pace,
// for a separately labelled "restricted local preview" clip. Not public, not release approval.
// Usage (after `npm run build`): node --import tsx tests/visual/m2-local-demo-record.ts <out-dir>
// Fresh random secrets per run, never printed; recording starts only AFTER authorization, so no credential is filmed.
// The mission sequence mirrors tests/backend/m2-live-browser.test.ts (3D mode) and drives only real UI controls.
import { chromium, type Locator } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { equipmentDefinitions } from '@microfire/shared';

const out = path.resolve(process.argv[2] ?? 'm2-local-demo');
mkdirSync(out, { recursive: true });
const port = 3380, origin = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString('base64url');
const server = spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/local-game-preview.ts'], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: origin, MICROFIRE_PREVIEW_ACCESS_TOKEN: token,
    MICROFIRE_PREVIEW_SIGNING_KEY: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_REALM_ID: randomUUID(), MICROFIRE_PREVIEW_KEY_ID: 'local-demo-recording' },
  stdio: 'ignore'
});
const stopServer = () => new Promise<void>((done) => { if (server.exitCode !== null) return done(); server.once('exit', () => done()); server.kill('SIGTERM'); });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(origin + '/api/health')).ok) break; } catch { /* starting */ } if (i > 150) throw new Error('preview server did not start'); await new Promise((r) => setTimeout(r, 400)); }
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const pause = (ms: number) => page.waitForTimeout(ms);
  const frames: { data: string; t: number }[] = []; let rec = false;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { if (rec) frames.push({ data, t: metadata.timestamp ?? Date.now() / 1000 }); await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
  const act = async (target: Locator, hold = 900) => { await target.scrollIntoViewIfNeeded(); await target.click(); await page.waitForLoadState('networkidle').catch(() => {}); await pause(hold); };
  const pick = async (target: Locator) => { await target.locator('..').click(); await pause(350); };
  const selectPart = (label: string) => act(page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: new RegExp('^' + label) }), 600);
  const closePart = async () => { const c = page.getByRole('button', { name: 'Back to bench: close part details' }); if (await c.count()) await act(c, 400); };

  await page.goto(origin + '/missions/bass-assembly?preview=bass-b20-training-v1');
  await page.getByLabel('Operator access token').fill(token);
  await page.getByRole('button', { name: 'Authorize', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new training case' }).waitFor();
  // ---- recording starts here: the credential has already been submitted and is never on screen ----
  await page.locator('.m2').scrollIntoViewIfNeeded();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 }); rec = true;
  await pause(1500);
  await act(page.getByRole('button', { name: 'Start a new training case' }), 2500);
  const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) { await pause(4000); if (await skip.isVisible()) await act(skip); }
  for (const name of ['Open the source record', 'Collect the documented observation', 'Complete Station Arrival', 'Enter the training bay']) await act(page.getByRole('button', { name, exact: true }), 1600);
  await act(page.getByRole('button', { name: '3D bench', exact: true }), 1200);
  await page.locator('.m2-bench[data-ready="true"][data-frame="true"] canvas').waitFor({ timeout: 30000 }).catch(() => {});
  await pause(1500);
  for (const part of equipmentDefinitions) {
    await selectPart(part.label);
    await pick(page.locator(`input[name="m2-mount"][value="${part.anchorId}"]`));
    await pick(page.locator('input[name="m2-orient"][value="correct"]'));
    await act(page.getByRole('button', { name: 'Install ' + part.label.toLowerCase(), exact: true }), 1100);
    await closePart();
  }
  await page.locator('.m2-fault-banner').waitFor({ timeout: 10000 }).catch(() => {}); await pause(3000);
  await act(page.getByRole('button', { name: 'Run Training check', exact: true }), 2500);
  await page.getByLabel('Component').selectOption('fan'); await pause(700);
  await pick(page.getByRole('radio', { name: 'Reversed orientation', exact: true }));
  await act(page.getByRole('button', { name: 'Submit diagnosis', exact: true }), 2500);
  const fan = equipmentDefinitions.find((p) => p.id === 'fan')!;
  await selectPart(fan.label); await act(page.getByRole('button', { name: 'Remove fan', exact: true }), 1500);
  await pick(page.locator('input[name="m2-mount"][value="duct-inlet"]'));
  await pick(page.locator('input[name="m2-orient"][value="correct"]'));
  await act(page.getByRole('button', { name: 'Install fan', exact: true }), 1500); await closePart();
  await act(page.getByRole('button', { name: 'Request training qualification', exact: true }), 2500);
  await act(page.getByRole('button', { name: 'Open NASA’s B20 record', exact: true }), 3500);
  const note = page.getByLabel(/Your interpretation/); await note.scrollIntoViewIfNeeded();
  await note.pressSequentially('B20 is source evidence; the repair is authored training.', { delay: 30 });
  await act(page.getByRole('button', { name: 'Add note', exact: true }), 1500);
  await act(page.getByRole('button', { name: 'Complete the training episode', exact: true }), 2000);
  await page.locator('.m2-passport').scrollIntoViewIfNeeded(); await pause(3500);
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast'); rec = false;
  await browser.close();

  const dir = path.join(out, '.frames'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const list = frames.map((f, i) => { const file = `f${String(i).padStart(5, '0')}.jpg`; writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
    const next = frames[i + 1]?.t ?? Math.max(f.t + 1 / 30, tEnd); return `file '${file}'\nduration ${Math.max(1 / 60, next - f.t).toFixed(4)}`; });
  writeFileSync(path.join(dir, 'list.txt'), list.join('\n') + `\nfile 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', path.join(out, 'm2-local-preview.mp4')]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`m2-local-preview.mp4: ${frames.length} frames`);
} finally { await stopServer(); }
