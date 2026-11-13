// Hosted acceptance on the PUBLIC origin, no Vercel login: two independent browser contexts play concurrently.
import { chromium, devices } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ORIGIN = process.env.ORIGIN ?? 'https://microfire-v2-campaign-security-stag.vercel.app';
const driver = readFileSync(new URL('./hosted-campaign-driver.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
async function visitor(name, opts) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const api = []; page.on('response', (r) => { if (r.url().includes('/api/game/public-campaign/v1/')) api.push(r.status()); });
  await page.goto(ORIGIN + '/missions/play'); await page.waitForSelector('.mf-play[data-phase="ready"]', { timeout: 30000 });
  const t0 = Date.now(); await page.evaluate(driver);
  // Evidence: a frame of the live run whenever the mission changes (SHOTS=dir).
  const tag = name.split(' ')[0]; let lastMission = '', shot = 0;
  for (;;) {
    const st = await page.evaluate(() => ({ done: window.__mfRun.done || !!window.__mfRun.error, m: document.querySelector('.mf-stage')?.dataset.mission ?? '' }));
    if (SHOTS && st.m !== lastMission) { lastMission = st.m; await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}/${tag}-${String(++shot).padStart(2, '0')}.png` }); }
    if (st.done) break; await page.waitForTimeout(500);
    if (Date.now() - t0 > 300000) break;
  }
  const run = await page.evaluate(() => window.__mfRun);
  const exp = await page.evaluate(async () => (await (await fetch('/api/game/public-campaign/v1/export', { headers: { 'X-MicroFire-Campaign': '1' } })).json()).data);
  await page.reload(); await page.waitForSelector('.mf-play[data-phase="ready"]');
  const after = await page.evaluate(() => ({ revision: document.querySelector('.mf-play').dataset.revision, missionsDone: document.querySelectorAll('.mf-rail li[data-state=done]').length, passportShown: document.querySelectorAll('li[data-scenario]').length, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-passport.png`, fullPage: true });
  const cookies = (await ctx.cookies()).filter((c) => c.name.includes('microfire')).map((c) => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }));
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Passport (JSON)' }).click()]);
  const file = JSON.parse(readFileSync(await download.path(), 'utf8'));
  return { name, ok: run.done, error: run.error, steps: run.log.filter((l) => l.includes(' OK ')).length, seconds: Math.round((Date.now() - t0) / 1000), sessionId: exp.sessionId, entries: exp.passport.entries.length,
    downloadEntries: file.passport?.entries?.length, downloadSession: file.sessionId === exp.sessionId, after, cookies, apiStatuses: [...new Set(api)], errors: errors.slice(0, 5), refusal: run.log.find((l) => l.includes('safety verdict')), page, ctx };
}
const [a, b] = await Promise.all([
  visitor('A desktop', { viewport: { width: 1366, height: 860 } }),
  visitor('B iPhone 13 (touch)', { ...devices['iPhone 13'] }),
]);
// Isolation: B's browser cannot read A's case; each sees only its own session.
const crossRead = await b.page.evaluate(async () => (await (await fetch('/api/game/public-campaign/v1/session', { headers: { 'X-MicroFire-Campaign': '1' } })).json()).data?.sessionId);
const report = { origin: ORIGIN, at: new Date().toISOString(), visitors: [a, b].map(({ page, ctx, ...r }) => r), distinctSessions: a.sessionId !== b.sessionId, bSeesOnlyOwnSession: crossRead === b.sessionId };
writeFileSync(process.env.OUT ?? '/private/tmp/claude-501/two-visitors.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await browser.close();
