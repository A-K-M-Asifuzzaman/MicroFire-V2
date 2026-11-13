// Film capture (not a test): one paced visitor journey through all five missions and the Passport.
// Same stack as tests/backend/public-campaign-browser.test.ts: the production Next build (campaign UI opted in) and the real public
// handler on disposable PostgreSQL behind one HTTPS origin. Every accepted step is a genuine server response; nothing is mocked.
// Usage: node --conditions=react-server --import tsx tests/visual/film-campaign-record.ts <out-dir> [--dry]
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync, spawn } from 'node:child_process';
import { createServer as httpsServer } from 'node:https';
import { createServer as netServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { Readable } from 'node:stream';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium, type Locator } from '@playwright/test';
import { partDefinitions } from '@microfire/shared';
import { claimTrialStatements } from '@microfire/game-core';
import { createPublicCampaignHandler } from '../../apps/web/lib/public-campaign';
import { testDatabase } from '../backend/campaign-security-harness';
import { appraise } from '../unit/campaign-helpers';

const [out = 'film-out'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry');
mkdirSync(out, { recursive: true });
const secret = () => randomBytes(32).toString('base64url');
const freePort = async () => { const s = netServer().listen(0, '127.0.0.1'); await once(s, 'listening'); const p = (s.address() as { port: number }).port; s.close(); return p; };

// ---- stack (verbatim from the acceptance harness)
const database = await testDatabase();
const dir = mkdtempSync('/tmp/microfire-film-tls-');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', dir + '/key.pem', '-out', dir + '/cert.pem'], { stdio: 'ignore' });
const nextPort = await freePort();
const web = path.resolve('apps/web'), nextBin = createRequire(web + '/package.json').resolve('next/dist/bin/next');
const next = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(nextPort)], { cwd: web, stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'production', MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1' } });
let origin = '';
const keys = { csrf: secret(), abuse: secret(), realm: randomUUID(), runtime: randomUUID() };
const env = () => ({ MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1', MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin,
  MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: keys.csrf, MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: keys.abuse, MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: keys.realm, MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: keys.runtime });
const apiLog: { segment: string; t: string; method: string; path: string; status: number; ok?: boolean }[] = [];
let current = 'setup';
let handle: (r: Request, a: string) => Promise<Response> = async () => new Response(null, { status: 503 });
const server = httpsServer({ key: readFileSync(dir + '/key.pem'), cert: readFileSync(dir + '/cert.pem') }, async (inc, res) => {
  if (inc.url!.startsWith('/api/game/public-campaign/v1/')) {
    const headers = new Headers(); for (const [k, v] of Object.entries(inc.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join('; ') : v);
    const req = new Request(new URL(inc.url!, origin), { method: inc.method, headers, ...(inc.method === 'POST' ? { body: Readable.toWeb(inc) as ReadableStream<Uint8Array>, duplex: 'half' } : {}) } as RequestInit);
    const r = await handle(req, inc.socket.remoteAddress!).catch(() => new Response('harness failure', { status: 500 }));
    const buf = Buffer.from(await r.arrayBuffer());
    let ok: boolean | undefined; try { ok = JSON.parse(buf.toString()).data?.ok; } catch { /* non-JSON */ }
    apiLog.push({ segment: current, t: new Date().toISOString(), method: inc.method!, path: inc.url!, status: r.status, ...(ok === undefined ? {} : { ok }) });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(buf); return;
  }
  const fwd = httpRequest({ host: '127.0.0.1', port: nextPort, method: inc.method, path: inc.url, headers: inc.headers }, (r) => { res.writeHead(r.statusCode!, r.headers); r.pipe(res); });
  fwd.on('error', () => { res.writeHead(502); res.end(); }); inc.pipe(fwd);
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
origin = `https://127.0.0.1:${(server.address() as { port: number }).port}`;
handle = createPublicCampaignHandler(env(), database.pool);
for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${nextPort}/`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }

// ---- browser: 1440×810 CSS px at 4/3 scale = 1920×1080 frames (readable UI text)
const W = 1440, H = 810, SCALE = 4 / 3;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: W, height: H }, deviceScaleFactor: SCALE, acceptDownloads: true });
// A visible cursor and click ripple (cosmetic overlay only; it does not intercept input).
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div'); c.id = 'film-cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.4 L13.4 19.1 L10.4 12.7 L16.6 12.5 Z" fill="#fff" stroke="#15153d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;border:3px solid #ffb020;z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.3);opacity:1`;
      document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600);
    }, true);
  });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
let mx = W / 2, my = H / 2;
const wait = (ms: number) => page.waitForTimeout(DRY ? Math.min(ms, 60) : ms);
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
async function glideScroll(dy: number, ms = 900) {
  if (Math.abs(dy) < 4) return;
  // A string body: tsx's keepNames helper (__name) does not exist inside the page.
  await page.evaluate(`new Promise((done) => { const d = ${dy}, t = ${DRY ? 1 : ms}, y0 = scrollY, t0 = performance.now(); function step(n) { const k = Math.min(1, (n - t0) / t); scrollTo(0, y0 + d * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)); if (k < 1) requestAnimationFrame(step); else done(); } requestAnimationFrame(step); })`);
}
/** Bring an element comfortably into view with a smooth scroll (never a jump). */
async function show(loc: Locator, margin = 140) {
  await loc.waitFor({ state: 'visible', timeout: 20000 });
  const b = (await loc.boundingBox())!;
  if (b.y < 90) await glideScroll(b.y - margin);
  else if (b.y + b.height > H - 60) await glideScroll(Math.min(b.y - margin, b.y + b.height - H + margin));
}
async function moveTo(loc: Locator) {
  await show(loc);
  const b = (await loc.boundingBox())!;
  const x = b.x + Math.min(b.width / 2, 60), y = b.y + b.height / 2;
  const d = Math.hypot(x - mx, y - my), ms = DRY ? 1 : Math.min(750, 260 + d * 0.55), n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) { const k = ease(i / n); await page.mouse.move(mx + (x - mx) * k, my + (y - my) * k); if (!DRY) await page.waitForTimeout(12); }
  mx = x; my = y;
}
async function click(loc: Locator, hold = 220) { await moveTo(loc); await wait(hold); await page.mouse.down(); await page.mouse.up(); }
const ready = () => page.locator('.mf-play[data-phase="ready"]').waitFor({ timeout: 20000 });
const rev = async () => Number(await page.locator('.mf-play').getAttribute('data-revision'));
async function send(name: string | RegExp, after = 900) {
  const before = await rev();
  await click(page.getByRole('button', { name, exact: typeof name === 'string' }));
  await ready(); await wait(after);
  return { before, after: await rev() };
}
async function accepted(name: string | RegExp, after = 900) {
  const r = await send(name, after);
  if (r.after !== r.before + 1) throw new Error(`server did not accept "${name}"`);
}
const spot = async (name: RegExp) => { await click(page.getByRole('group', { name: 'Station hotspots' }).getByRole('button', { name })); await wait(700); };
const check = async (loc: Locator) => { await click(loc, 120); await wait(260); };
async function type(loc: Locator, text: string) { await click(loc); await loc.fill(''); await loc.pressSequentially(text, { delay: DRY ? 0 : 34 }); await wait(400); }
async function select(loc: Locator, value: string) { await moveTo(loc); await wait(200); await loc.selectOption(value); await wait(380); }

// ---- recording (Chrome screencast frames → constant 30 fps H.264), as in demo-record.mjs
let frames: { data: string; t: number }[] = [], recording = false;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { if (recording) frames.push({ data, t: metadata.timestamp! }); await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
const marks: Record<string, { label: string; t: number }[]> = {};
let segStart = 0;
let shotN = 0;
const mark = async (label: string) => {
  (marks[current] ??= []).push({ label, t: +(Date.now() / 1000 - segStart).toFixed(2) });
  if (DRY) await page.screenshot({ path: path.join(out, `${current}-${String(++shotN).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 30)}.png`) });
};
async function segment(name: string, fn: () => Promise<void>) {
  current = name; frames = []; recording = !DRY; segStart = Date.now() / 1000;
  if (!DRY) await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await fn(); await wait(600);
  await page.screenshot({ path: path.join(out, `${name}-end.png`) });
  if (DRY) { console.log(`${name}: ok`); return; }
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast'); recording = false;
  const fdir = path.join(out, `.frames-${name}`); rmSync(fdir, { recursive: true, force: true }); mkdirSync(fdir);
  const list = frames.map((f, i) => { const file = `f${String(i).padStart(5, '0')}.jpg`; writeFileSync(path.join(fdir, file), Buffer.from(f.data, 'base64')); const nx = frames[i + 1]?.t ?? Math.max(f.t + 1 / 30, tEnd); return `file '${file}'\nduration ${Math.max(1 / 60, nx - f.t).toFixed(4)}`; });
  writeFileSync(path.join(fdir, 'list.txt'), list.join('\n') + `\nfile 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(fdir, 'list.txt'), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-movflags', '+faststart', path.join(out, `${name}.mp4`)]);
  rmSync(fdir, { recursive: true, force: true });
  console.log(`${name}: ${(tEnd - segStart).toFixed(1)} s, ${frames.length} frames`);
}

try {
  await page.goto(origin + '/missions/play'); await ready(); await wait(400);
  await segment('m1-station-arrival', async () => {
    await wait(1600); await mark('case open, revision 0');
    await spot(/Research terminal/); await mark('research terminal'); await accepted('Open the source record', 1400); await mark('source record accepted');
    await spot(/Evidence scanner/);
    await check(page.getByRole('group', { name: 'The B20 observation is…' }).getByLabel('Documented research'));
    await check(page.getByRole('group', { name: 'The station fire alarm in this story is…' }).getByLabel('Authored fiction'));
    await accepted('Submit the source review', 1400); await mark('source review accepted');
    await spot(/Evidence lockers/); await accepted('Collect the documented observation', 1200); await mark('observation collected');
    await spot(/Training-bay hatch/); await accepted('Complete Station Arrival', 1800); await mark('mission 1 complete');
  });
  await segment('m2-training-bay', async () => {
    await accepted('Enter the training bay', 1400); await mark('bay entered');
    for (const p of partDefinitions) {
      const row = page.locator(`tr[data-part="${p.id}"]`);
      await select(row.getByRole('combobox', { name: /Mount for/ }), p.anchorId);
      await click(row.getByRole('button', { name: 'Fit' }), 150); await ready(); await wait(350);
    }
    await mark('all parts fitted');
    await accepted('Run a Training check', 2200); await mark('training check: found 1 issue');
    await select(page.getByRole('combobox', { name: 'Part' }), 'fan');
    await select(page.getByRole('combobox', { name: 'Fault' }), 'REVERSED');
    await accepted('Submit diagnosis', 2000); await mark('diagnosis accepted');
    for (const p of ['fan', 'exit-plate']) { await click(page.locator(`tr[data-part="${p}"]`).getByRole('button', { name: 'Remove' }), 150); await ready(); await wait(350); }
    for (const id of ['exit-plate', 'fan']) {
      const row = page.locator(`tr[data-part="${id}"]`);
      await select(row.getByRole('combobox', { name: /Mount for/ }), partDefinitions.find((p) => p.id === id)!.anchorId);
      await click(row.getByRole('button', { name: 'Fit' }), 150); await ready(); await wait(350);
    }
    await mark('repaired');
    await accepted('Qualify the training rig', 2000); await mark('rig qualified');
    await accepted('Open the B20 result', 2000); await mark('B20 result opened');
    await accepted('Complete the training bay', 1800); await mark('mission 2 complete');
  });
  await segment('m3-flame-detective', async () => {
    await accepted('Start Flame Detective', 1200);
    await spot(/Test selector/); await type(page.getByLabel('Oxygen (vol%)'), '17.4'); await accepted('Select this test', 1400); await mark('B20 selected at 17.4');
    await spot(/Prediction panel/); await type(page.getByLabel('What do you predict happened to the sample?'), 'Some of the sample may remain.'); await accepted('Lock my prediction', 1400); await mark('prediction locked');
    await spot(/Observation window/); await accepted('Reveal the documented result', 2400); await mark('documented result revealed');
    await spot(/Analysis bench/);
    await check(page.getByLabel('The source documents this observation'));
    for (const l of ['One run cannot show what caused the outcome', 'Pressure for this run is unknown', 'This is not evidence about a lunar habitat']) await check(page.getByLabel(l));
    await accepted('Submit my explanation', 2400); await mark('explanation accepted');
    await spot(/Case report/); await accepted('Complete Flame Detective', 1600); await mark('mission 3 complete');
  });
  await segment('m4-claim-trial', async () => {
    const KIND: Record<string, string> = { observed: 'Observed in the source', derived: 'Derived from recorded values', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown / not established' };
    const LEVEL: Record<string, string> = { direct: 'Direct evidence', analogous: 'Analogous evidence', mechanistic: 'Mechanistic reasoning', gap: 'Evidence gap' };
    const SUPPORT: Record<string, string> = { supports: 'The evidence supports it', contradicts: 'The evidence contradicts it', insufficient: 'The evidence is insufficient' };
    const CONF: Record<string, string> = { 'flow-history': 'Airflow changed during the run', gravity: 'Gravity differs or is unknown', pressure: 'Pressure differs or is unknown' };
    await accepted('Start Claim Trial', 1200);
    await spot(/Review desk/);
    let wrongDone = false;
    for (const st of claimTrialStatements) {
      const a = appraise(st.id) as Extract<ReturnType<typeof appraise>, { type: 'APPRAISE_CLAIM' }>;
      await click(page.getByRole('group', { name: 'Statement on trial' }).locator(`button[data-statement="${st.id}"]`)); await wait(500);
      await check(page.getByLabel(KIND[a.kind]!, { exact: true })); await check(page.getByLabel(LEVEL[a.evidenceLevel]!, { exact: true }));
      for (const box of await page.getByRole('group', { name: /Which source evidence applies/ }).getByRole('checkbox').all()) if (await box.isChecked()) await check(box);
      await check(page.getByLabel(st.id === 'trial-b20-thickness' ? 'B20 sample thickness (recorded condition)' : 'B20 observation log (Table A.1)'));
      const wrongNow = !wrongDone && a.support !== 'supports';
      if (wrongNow) {
        // One honest mistake: claim the evidence supports a statement it does not. The server explains why not.
        await check(page.getByLabel(SUPPORT.supports!));
        for (const [k, l] of Object.entries(CONF)) if (a.confounders.includes(k as 'gravity')) await check(page.getByLabel(l));
        await send('Submit appraisal', 400); await show(page.locator('.mf-verdict').first(), 200); await wait(4200); await mark(`appraisal rejected (${st.id})`);
        await check(page.getByLabel(SUPPORT[a.support]!));
      } else {
        await check(page.getByLabel(SUPPORT[a.support]!));
        for (const [k, l] of Object.entries(CONF)) if ((await page.getByLabel(l).isChecked()) !== a.confounders.includes(k as 'gravity')) await check(page.getByLabel(l));
      }
      await accepted('Submit appraisal', wrongNow ? 2600 : 1200); await mark(`appraisal accepted (${st.id})`);
      if (wrongNow) wrongDone = true;
    }
    await spot(/Statement board/); await wait(1800); await mark('statement board');
    await spot(/Case lectern/); await accepted('File the case report', 1800); await mark('mission 4 complete');
  });
  await segment('m5-lunar-habitat', async () => {
    await accepted('Start Lunar Habitat', 1400);
    await spot(/Evidence terminal/); await wait(2000); await mark('recorded B20 conditions');
    await spot(/Life-support bay/);
    const verdict = page.getByRole('group', { name: /What can the evidence conclude/ });
    await check(verdict.getByLabel('The habitat is fire safe'));
    for (const d of ['Gravity', 'Pressure']) await check(page.getByRole('group', { name: /Which measurements should come next/ }).getByLabel(d));
    await send('Submit assessment', 400); await show(page.locator('.mf-verdict').first(), 200); await wait(4600); await mark('safety verdict refused');
    await check(verdict.getByLabel('Insufficient evidence to decide'));
    for (const d of ['Gravity', 'Oxygen', 'Pressure', 'Ventilation', 'Material']) await check(page.getByRole('group', { name: /Where does B20 not apply/ }).getByLabel(d));
    await accepted('Submit assessment', 2600); await mark('assessment accepted');
    await spot(/Decision station/); await check(page.getByRole('group', { name: 'Provisional decision' }).getByLabel('Insufficient evidence to decide')); await accepted('Record decision', 1400); await mark('decision recorded');
    await spot(/Airlock log/); await type(page.getByLabel('Proposed next test'), 'Measure PMMA flame spread at lunar gravity and habitat pressure.'); await accepted('Propose this test', 1400); await mark('next test proposed');
    await accepted('File the case report', 2200); await mark('mission 5 complete');
  });
  await segment('passport', async () => {
    const done = page.getByRole('region', { name: 'Campaign complete' }); await done.waitFor(); await show(done); await wait(1600); await mark('campaign complete');
    const pass = page.getByRole('region', { name: 'Evidence Passport' }); await show(pass.locator('li[data-scenario]').first(), 120); await wait(1200);
    await glideScroll(320, 1600); await wait(1600); await mark('passport entries');
    const btn = page.getByRole('button', { name: 'Download Passport (JSON)' });
    const [download] = await Promise.all([page.waitForEvent('download'), click(btn)]);
    await download.saveAs(path.join(out, 'passport-export.json')); await wait(1400); await mark('passport exported');
    await page.reload(); await ready(); await page.getByRole('region', { name: 'Campaign complete' }).waitFor(); await wait(1600); await mark('reload: server record restored');
  });
} finally {
  writeFileSync(path.join(out, 'api-log.json'), JSON.stringify({ origin: 'local production build behind same-origin HTTPS gateway', apiLog, marks }, null, 1));
  await browser.close(); next.kill(); server.closeAllConnections(); server.close(); await database.close(); rmSync(dir, { recursive: true, force: true });
}
