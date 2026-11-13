// Real Chromium on one HTTPS origin: pages come from the production Next build (`next start`, campaign UI opted in),
// /api/game/public-campaign/v1/* goes to the real public handler with disposable PostgreSQL through a test TLS gateway.
// The mounted Next hosting adapter must remain disabled outside Vercel. Requires `npm run build` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync, spawn } from 'node:child_process';
import { createServer as httpsServer } from 'node:https';
import { createServer as netServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { Readable } from 'node:stream';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Pool } from 'pg';
import { chromium, devices, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { partDefinitions } from '@microfire/shared';
import { claimTrialStatements } from '@microfire/game-core';
import { createPublicCampaignHandler } from '../../apps/web/lib/public-campaign';
import { testDatabase } from './campaign-security-harness';
import { appraise } from '../unit/campaign-helpers';

const secret = () => randomBytes(32).toString('base64url');
const freePort = async () => { const s = netServer().listen(0, '127.0.0.1'); await once(s, 'listening'); const p = (s.address() as { port: number }).port; s.close(); return p; };
const shots = process.env.MICROFIRE_CAMPAIGN_SHOTS ?? null;

async function stack() {
  const database = await testDatabase();
  const dir = mkdtempSync('/tmp/microfire-play-tls-');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', dir + '/key.pem', '-out', dir + '/cert.pem'], { stdio: 'ignore' });
  const nextPort = await freePort();
  const web = path.resolve('apps/web'), nextBin = createRequire(web + '/package.json').resolve('next/dist/bin/next');
  const next = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(nextPort)], { cwd: web, stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'production', MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1' } });
  let origin = '', handle: (r: Request, a: string) => Promise<Response> = async () => new Response(null, { status: 503 });
  const env = () => ({ MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1', MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin,
    MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: keys.csrf, MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: keys.abuse, MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: keys.realm, MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: keys.runtime });
  const keys = { csrf: secret(), abuse: secret(), realm: randomUUID(), runtime: randomUUID() };
  const apiCalls: { method: string; path: string; status: number }[] = [];
  const server = httpsServer({ key: readFileSync(dir + '/key.pem'), cert: readFileSync(dir + '/cert.pem') }, async (inc, out) => {
    if (inc.url!.startsWith('/api/game/public-campaign/v1/')) {
      const headers = new Headers(); for (const [k, v] of Object.entries(inc.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join('; ') : v);
      const req = new Request(new URL(inc.url!, origin), { method: inc.method, headers, ...(inc.method === 'POST' ? { body: Readable.toWeb(inc) as ReadableStream<Uint8Array>, duplex: 'half' } : {}) } as RequestInit);
      const res = await handle(req, inc.socket.remoteAddress!).catch(() => new Response('harness failure', { status: 500 }));
      apiCalls.push({ method: inc.method!, path: inc.url!, status: res.status });
      out.writeHead(res.status, Object.fromEntries(res.headers)); out.end(Buffer.from(await res.arrayBuffer())); return;
    }
    const fwd = httpRequest({ host: '127.0.0.1', port: nextPort, method: inc.method, path: inc.url, headers: inc.headers }, (r) => { out.writeHead(r.statusCode!, r.headers); r.pipe(out); });
    fwd.on('error', () => { out.writeHead(502); out.end(); }); inc.pipe(fwd);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  origin = `https://127.0.0.1:${(server.address() as { port: number }).port}`;
  const route = (pool: Pool) => { handle = createPublicCampaignHandler(env(), pool); };
  route(database.pool);
  for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://127.0.0.1:${nextPort}/`); if (r.ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }
  return { origin, nextPort, database, route, apiCalls, async close() { next.kill(); server.closeAllConnections(); server.close(); await database.close(); rmSync(dir, { recursive: true, force: true }); } };
}

const ready = (page: Page) => page.locator('.mf-play[data-phase="ready"]').waitFor({ timeout: 20000 });
const rev = async (page: Page) => Number(await page.locator('.mf-play').getAttribute('data-revision'));
const sessionId = (page: Page) => page.evaluate(async () => (await (await fetch('/api/game/public-campaign/v1/session', { headers: { 'X-MicroFire-Campaign': '1' } })).json()).data.sessionId as string);
/** Press a control the way this device would; wait until the server has answered (phase back to ready). */
async function press(page: Page, locator: ReturnType<Page['locator']>, touch: boolean) { if (touch) await locator.tap(); else await locator.click(); }
async function send(page: Page, name: string | RegExp, touch = false) {
  const before = await rev(page);
  await press(page, page.getByRole('button', { name, exact: typeof name === 'string' }), touch);
  await ready(page);
  return { before, after: await rev(page) };
}
const spot = (page: Page, name: RegExp, touch = false) => press(page, page.getByRole('group', { name: 'Station hotspots' }).getByRole('button', { name }), touch);
async function accepted(page: Page, name: string | RegExp, touch = false) {
  const r = await send(page, name, touch);
  assert.equal(r.after, r.before + 1, `server did not accept "${name}" (notice: ${await page.locator('.mf-status').textContent()}; verdict: ${await page.locator('.mf-verdict').allTextContents()})`);
}
async function noOverflow(page: Page, label: string) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `horizontal overflow: ${label}`); }
async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).include('.mf-play').withTags(['wcag2a', 'wcag2aa']).analyze();
  assert.deepEqual(r.violations.map((v) => `${v.id}: ${v.nodes.length}`), [], `axe: ${label}`);
}
const shot = async (page: Page, name: string) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true }); };

async function stationArrival(page: Page, touch: boolean, afterInspect?: () => Promise<void>) {
  await spot(page, /Research terminal/, touch); await accepted(page, 'Open the source record', touch);
  if (afterInspect) await afterInspect();
  await spot(page, /Evidence scanner/, touch);
  await page.getByRole('group', { name: 'The B20 observation is…' }).getByLabel('Documented research').check();
  await page.getByRole('group', { name: 'The station fire alarm in this story is…' }).getByLabel('Authored fiction').check();
  await accepted(page, 'Submit the source review', touch);
  await spot(page, /Evidence lockers/, touch); await accepted(page, 'Collect the documented observation', touch);
  await spot(page, /Training-bay hatch/, touch); await accepted(page, 'Complete Station Arrival', touch);
}

test('public campaign UI in Chromium: five missions end to end, reload recovery, stale tab, outage, expiry; desktop and mobile', { timeout: 300000 }, async () => {
  const s = await stack();
  const browser = await chromium.launch({ headless: true }).catch(async (error) => { await s.close(); throw error; });
  try {
    // UI flags alone cannot activate the hosting adapter without Vercel and full validated configuration.
    for (const p of ['/api/game/public-campaign/v1/session', '/api/game/campaign/v1/capability']) {
      const r = await fetch(`http://127.0.0.1:${s.nextPort}${p}`, { method: 'POST', headers: { 'X-MicroFire-Campaign': '1', 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(r.status, 404, `Next must not serve ${p}`);
    }
    // ---- Desktop: the complete five-mission journey through the real mission scenes.
    const desk = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 860 } });
    const page = await desk.newPage();
    const boot = page.waitForResponse((r) => r.url().endsWith('/api/game/public-campaign/v1/session') && r.request().method() === 'POST');
    await page.goto(s.origin + '/missions/play'); await ready(page);
    assert.equal(await rev(page), 0);
    // CSRF proof stays in controller memory: not in Web Storage, IndexedDB, the DOM or the URL.
    const csrf = (await (await boot).json()).data.csrfToken as string; assert.match(csrf, /^[A-Za-z0-9_-]{43}$/);
    const stored = await page.evaluate(async () => ({ web: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }), idb: (await indexedDB.databases()).length }));
    assert(!stored.web.includes(csrf) && stored.idb === 0, 'CSRF proof not persisted');
    assert(!(await page.content()).includes(csrf) && !page.url().includes(csrf), 'CSRF proof not in DOM or URL');
    await assert.doesNotReject(page.getByRole('list', { name: 'Mission progress (saved on the server)' }).waitFor());
    assert.equal(await page.locator('.mf-rail li').count(), 5);
    assert.equal(await page.locator('.mf-rail li[data-state="current"]').textContent().then((t) => t!.includes('Station Arrival')), true);
    const cookies = await desk.cookies(); const visitor = cookies.find((c) => c.name === '__Host-microfire_campaign_session')!;
    assert(visitor.httpOnly && visitor.secure && visitor.sameSite === 'Strict', 'visitor cookie is HttpOnly, Secure, SameSite=Strict');
    assert.equal(await page.evaluate(() => document.cookie.includes('microfire_campaign')), false, 'cookie unreadable from script');
    await axe(page, 'desktop start'); await shot(page, 'desktop-01-start');
    const id = await sessionId(page);

    await stationArrival(page, false, async () => {
      // Reload mid-mission: the same durable case comes back (cookie + server), CSRF re-issued in memory.
      await page.reload(); await ready(page);
      assert.equal(await rev(page), 1); assert.equal(await sessionId(page), id);
      assert.equal(await page.getByRole('region', { name: 'Station Arrival objectives' }).getByText('Open the source record at the research terminal').getAttribute('data-done'), 'true');
      // A second tab of the same visitor advances the case; the first tab's next intent is reconciled, not replayed.
      const tab2 = await desk.newPage(); await tab2.goto(s.origin + '/missions/play'); await ready(tab2);
      // (The same intent at the same revision would carry the same campaignIdentity and simply return the stored result.)
      await spot(tab2, /Evidence scanner/);
      await tab2.getByRole('group', { name: 'The B20 observation is…' }).getByLabel('Documented research').check();
      await tab2.getByRole('group', { name: 'The station fire alarm in this story is…' }).getByLabel('Authored fiction').check();
      await accepted(tab2, 'Submit the source review');
      await spot(page, /Evidence lockers/); const stale = await send(page, 'Collect the documented observation');
      assert.equal(stale.after, 2, 'first tab shows the head the second tab created');
      assert.match((await page.locator('.mf-notice').textContent())!, /already moved on/);
      await tab2.close();
    });
    assert.equal(await page.locator('.mf-rail li[data-state="done"]').count(), 1);
    await shot(page, 'desktop-02-m1-done');

    // Mission 02: fit parts at the mounts the learner chooses; the server introduces the authored fault.
    await accepted(page, 'Enter the training bay');
    for (const p of partDefinitions) {
      const row = page.locator(`tr[data-part="${p.id}"]`);
      await row.getByRole('combobox', { name: /Mount for/ }).selectOption(p.anchorId);
      await row.getByRole('button', { name: 'Fit' }).click(); await ready(page);
    }
    await accepted(page, 'Run a Training check');
    assert.match((await page.locator('.mf-findings').textContent())!, /found 1 issue/);
    await shot(page, 'desktop-03-m2-check');
    // Storage outage mid-mission: alert, identical retry after recovery.
    const broken = new Pool(s.database.options); await broken.end(); s.route(broken);
    await page.getByRole('combobox', { name: 'Part' }).selectOption('fan');
    await page.getByRole('combobox', { name: 'Fault' }).selectOption('REVERSED');
    const before = await rev(page);
    await page.getByRole('button', { name: 'Submit diagnosis' }).click();
    await page.locator('.mf-play[data-phase="unavailable"]').waitFor();
    assert.match((await page.locator('.mf-alert').textContent())!, /may or may not have been saved/);
    await shot(page, 'desktop-04-outage');
    s.route(s.database.pool);
    await page.getByRole('button', { name: 'Retry' }).click(); await ready(page);
    assert.equal(await rev(page), before + 1);
    for (const p of ['fan', 'exit-plate']) { await page.locator(`tr[data-part="${p}"]`).getByRole('button', { name: 'Remove' }).click(); await ready(page); }
    for (const id of ['exit-plate', 'fan']) {
      const row = page.locator(`tr[data-part="${id}"]`);
      await row.getByRole('combobox', { name: /Mount for/ }).selectOption(partDefinitions.find((p) => p.id === id)!.anchorId);
      await row.getByRole('button', { name: 'Fit' }).click(); await ready(page);
    }
    await accepted(page, 'Qualify the training rig');
    await accepted(page, 'Open the B20 result');
    await accepted(page, 'Complete the training bay');
    assert.equal(await page.locator('.mf-rail li[data-state="done"]').count(), 2);

    // Mission 03.
    await accepted(page, 'Start Flame Detective');
    await spot(page, /Test selector/); await page.getByLabel('Oxygen (vol%)').fill('17.4'); await accepted(page, 'Select this test');
    await spot(page, /Prediction panel/); await page.getByLabel('What do you predict happened to the sample?').fill('Some of the sample may remain.'); await accepted(page, 'Lock my prediction');
    await page.reload(); await ready(page); await spot(page, /Prediction panel/);
    assert.match((await page.locator('#mf-panel').textContent())!, /Locked prediction: “Some of the sample may remain\.”/);
    await spot(page, /Observation window/); await accepted(page, 'Reveal the documented result');
    await spot(page, /Analysis bench/);
    await page.getByLabel('The source documents this observation').check();
    for (const l of ['One run cannot show what caused the outcome', 'Pressure for this run is unknown', 'This is not evidence about a lunar habitat']) await page.getByLabel(l).check();
    await accepted(page, 'Submit my explanation');
    assert.equal(await page.locator('.mf-verdict[data-kind="correct"]').count(), 1);
    await page.reload(); await ready(page);
    assert.equal(await page.getByRole('region', { name: 'Flame Detective objectives' }).getByText('Explain it with the source and its limits').getAttribute('data-done'), 'true');
    await spot(page, /Case report/); await accepted(page, 'Complete Flame Detective');

    // Mission 04: statements come from the server DTO; the test (not the browser) knows the rubric.
    await accepted(page, 'Start Claim Trial');
    const KIND: Record<string, string> = { observed: 'Observed in the source', derived: 'Derived from recorded values', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown / not established' };
    const LEVEL: Record<string, string> = { direct: 'Direct evidence', analogous: 'Analogous evidence', mechanistic: 'Mechanistic reasoning', gap: 'Evidence gap' };
    const SUPPORT: Record<string, string> = { supports: 'The evidence supports it', contradicts: 'The evidence contradicts it', insufficient: 'The evidence is insufficient' };
    const CONF: Record<string, string> = { 'flow-history': 'Airflow changed during the run', gravity: 'Gravity differs or is unknown', pressure: 'Pressure differs or is unknown' };
    await spot(page, /Review desk/);
    for (const st of claimTrialStatements) {
      const a = appraise(st.id) as Extract<ReturnType<typeof appraise>, { type: 'APPRAISE_CLAIM' }>;
      await page.getByLabel('Statement').selectOption(st.id);
      await page.getByLabel(KIND[a.kind]!, { exact: true }).check(); await page.getByLabel(LEVEL[a.evidenceLevel]!, { exact: true }).check();
      for (const box of await page.getByRole('group', { name: /Which source evidence applies/ }).getByRole('checkbox').all()) await box.uncheck();
      await page.getByLabel(st.id === 'trial-b20-thickness' ? 'B20 sample thickness (recorded condition)' : 'B20 observation log (Table A.1)').check();
      await page.getByLabel(SUPPORT[a.support]!).check();
      for (const [k, l] of Object.entries(CONF)) await page.getByLabel(l).setChecked(a.confounders.includes(k as 'gravity'));
      await accepted(page, 'Submit appraisal');
      assert.equal(await page.locator('.mf-verdict[data-kind="correct"]').count(), 1, `appraisal ${st.id}`);
    }
    await page.reload(); await ready(page); await spot(page, /Statement board/);
    assert.equal(await page.locator('.mf-statements li[data-status="correct"]').count(), 4, 'reload restores every appraisal');
    await spot(page, /Case lectern/); await accepted(page, 'File the case report');
    await shot(page, 'desktop-05-m4-done');

    // Mission 05 (fictional habitat).
    await accepted(page, 'Start Lunar Habitat');
    await spot(page, /Life-support bay/);
    await page.getByRole('group', { name: /What can the evidence conclude/ }).getByLabel('Insufficient evidence to decide').check();
    for (const d of ['Gravity', 'Oxygen', 'Pressure', 'Ventilation', 'Material']) await page.getByRole('group', { name: /Where does B20 not apply/ }).getByLabel(d).check();
    for (const d of ['Gravity', 'Pressure']) await page.getByRole('group', { name: /Which measurements should come next/ }).getByLabel(d).check();
    await accepted(page, 'Submit assessment');
    await spot(page, /Decision station/); await page.getByRole('group', { name: 'Provisional decision' }).getByLabel('Insufficient evidence to decide').check(); await accepted(page, 'Record decision');
    await spot(page, /Airlock log/); await page.getByLabel('Proposed next test').fill('Measure PMMA flame spread at lunar gravity and habitat pressure.'); await accepted(page, 'Propose this test');
    await page.reload(); await ready(page);
    const habitatObjectives = page.getByRole('region', { name: 'Lunar Habitat objectives' });
    for (const label of ['Assessment accepted: evidence, gaps and next measurements', 'Provisional decision recorded', 'Next test proposed']) {
      assert.equal(await habitatObjectives.getByText(label).getAttribute('data-done'), 'true', `reload restores ${label}`);
    }
    await spot(page, /Decision station/);
    assert.match((await page.locator('#mf-panel').textContent())!, /Recorded decision: Insufficient evidence to decide/);
    await spot(page, /Airlock log/); await accepted(page, 'File the case report');
    await page.getByRole('region', { name: 'Campaign complete' }).waitFor();
    assert.equal(await page.locator('.mf-rail li[data-state="done"]').count(), 5);
    assert.equal(await page.getByRole('region', { name: 'Evidence Passport' }).locator('li[data-scenario]').count(), 5);
    await axe(page, 'desktop complete'); await noOverflow(page, 'desktop complete'); await shot(page, 'desktop-06-complete');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Passport (JSON)' }).click()]);
    const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
    assert.equal(exported.sessionId, id); assert.equal(exported.passport.entries.length, 5);
    // A reload after completion still shows the server's record.
    await page.reload(); await ready(page); await page.getByRole('region', { name: 'Campaign complete' }).waitFor();

    // Expiry: an explicit, disclosed restart, never a silent new case.
    await s.database.pool.query("UPDATE microfire_campaign_visitors SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1", [id]);
    await page.reload(); await page.locator('.mf-play[data-phase="expired"]').waitFor();
    assert.match((await page.locator('.mf-alert').textContent())!, /cannot be recovered/);
    await shot(page, 'desktop-07-expired');
    await page.getByRole('button', { name: 'Start a new case' }).click(); await ready(page);
    assert.equal(await rev(page), 0); assert.notEqual(await sessionId(page), id);
    // Keyboard only: focus the hotspot, Enter; focus the action, Enter; the server accepts it.
    await page.getByRole('group', { name: 'Station hotspots' }).getByRole('button', { name: /Research terminal/ }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Open the source record', exact: true }).focus(); await page.keyboard.press('Enter');
    await ready(page); assert.equal(await rev(page), 1, 'keyboard intent accepted');

    // Browser bundle: no game-core rules or rubric text reached the client.
    const html = await page.content();
    for (const st of claimTrialStatements) assert(!html.includes(JSON.stringify(st.expected)), 'expected answers absent');
    await desk.close();

    // ---- Mobile: touch, reload recovery, no overflow, accessible.
    const phone = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true });
    const m = await phone.newPage();
    await m.goto(s.origin + '/missions/play'); await ready(m);
    const mid = await sessionId(m);
    await noOverflow(m, 'mobile start'); await axe(m, 'mobile start'); await shot(m, 'mobile-01-start');
    await stationArrival(m, true, async () => { await m.reload(); await ready(m); assert.equal(await sessionId(m), mid); assert.equal(await rev(m), 1); });
    await accepted(m, 'Enter the training bay', true);
    await noOverflow(m, 'mobile bench'); await axe(m, 'mobile bench'); await shot(m, 'mobile-02-bench');
    await m.reload(); await ready(m);
    assert.equal(await m.locator('.mf-rail li[data-state="current"]').textContent().then((t) => t!.includes('BASS-II')), true, 'reload resumes Mission 02');
    await phone.close();

    // Only the public visitor protocol was used.
    assert(s.apiCalls.every((c) => /^\/api\/game\/public-campaign\/v1\/(session|action|resume|revoke|export)$/.test(c.path)), 'no other campaign endpoint');
  } finally { await browser.close(); await s.close(); }
});
