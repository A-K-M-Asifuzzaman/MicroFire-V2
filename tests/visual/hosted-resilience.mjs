// Hosted resilience on a PUBLIC gameplay origin (no login): network loss mid-mission, a second tab, a lost session and a
// no-WebGL visitor, all through the app's own controls. Usage: ORIGIN=https://… SHOTS=dir OUT=report.json node tests/visual/hosted-resilience.mjs
import { chromium, devices } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const ORIGIN = process.env.ORIGIN, SHOTS = process.env.SHOTS ?? 'resilience-shots', OUT = process.env.OUT ?? 'resilience.json';
if (!ORIGIN) throw new Error('ORIGIN required'); mkdirSync(SHOTS, { recursive: true });
const driver = readFileSync(new URL('./hosted-campaign-driver.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const mission = (p) => p.evaluate(() => document.querySelector('.mf-stage')?.dataset.mission ?? '');
const state = (p) => p.evaluate(() => { const e = document.querySelector('.mf-play'); return { phase: e?.dataset.phase, revision: e?.dataset.revision, done: document.querySelectorAll('.mf-rail li[data-state=done]').length, passport: document.querySelectorAll('li[data-scenario]').length }; });

async function run(name, opts, { offlineAt, secondTabAt, noWebGL } = {}) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage(), errors = [], notes = [];
  if (noWebGL) await ctx.addInitScript('HTMLCanvasElement.prototype.getContext = function () { return null; };');
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(ORIGIN + '/missions/play'); await page.waitForSelector('.mf-play[data-phase="ready"]', { timeout: 30000 });
  await page.evaluate(driver);
  const seen = new Set(); let tab2 = null; const t0 = Date.now();
  for (;;) {
    const r = await page.evaluate(() => ({ done: window.__mfRun.done, error: window.__mfRun.error }));
    const m = await mission(page);
    if (m && !seen.has(m)) {
      seen.add(m);
      const vp = page.locator('.mf-viewport').first();
      if (await vp.count()) { await page.waitForTimeout(1800); await vp.scrollIntoViewIfNeeded().catch(() => {}); await vp.screenshot({ path: `${SHOTS}/${name}-${m}.png` }).catch(() => {}); }
      if (m === offlineAt) {
        await ctx.setOffline(true); await page.waitForTimeout(6000);
        notes.push(`offline 6 s during ${m}: ui ${JSON.stringify(await state(page))} message "${(await page.locator('[role=alert],[role=status]').allInnerTexts()).join(' | ').slice(0, 160)}"`);
        await ctx.setOffline(false);
        // A visitor presses Retry; the server applies the same step at most once.
        const retry = page.getByRole('button', { name: 'Retry' });
        if (await retry.count()) { await retry.first().click(); notes.push('pressed Retry after reconnecting'); }
      }
      if (m === secondTabAt) {
        tab2 = await ctx.newPage(); await tab2.goto(ORIGIN + '/missions/play'); await tab2.waitForSelector('.mf-play[data-phase="ready"]', { timeout: 30000 });
        notes.push(`second tab opened during ${m}: ${JSON.stringify(await state(tab2))}`);
      }
    }
    if (r.done || r.error || Date.now() - t0 > 300000) { if (r.error) notes.push('driver error: ' + r.error); break; }
    await page.waitForTimeout(400);
  }
  const run = await page.evaluate(() => window.__mfRun);
  const final = await state(page);
  let tab2After = null;
  if (tab2) { await tab2.reload(); await tab2.waitForSelector('.mf-play[data-phase="ready"]'); tab2After = await state(tab2); }
  await page.reload(); await page.waitForSelector('.mf-play[data-phase="ready"]'); const reloaded = await state(page);
  await page.locator('.mf-passport, [data-scenario]').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SHOTS}/${name}-passport.png`, fullPage: true });
  // Lost session (cookie cleared ≈ expiry from the visitor's side): the app must not show someone else's case or crash.
  await ctx.clearCookies(); await page.reload(); await page.waitForTimeout(4000);
  const lost = { ...(await state(page)), text: (await page.locator('main').innerText()).match(/(start (a )?new case|start over|expired|no saved case|new case)[^.\n]{0,80}/i)?.[0] ?? null };
  await page.screenshot({ path: `${SHOTS}/${name}-session-lost.png` });
  await ctx.close();
  return { name, ok: run.done && !run.error, steps: run.log.filter((l) => l.includes(' OK ')).length, missionsSeen: [...seen], final, reloaded, tab2After, lost, notes, errors: errors.slice(0, 5) };
}
const results = [];
results.push(await run('desktop-offline-2tab', { viewport: { width: 1366, height: 860 } }, { offlineAt: 'flame-detective', secondTabAt: 'claim-trial' }));
results.push(await run('mobile-nowebgl', { ...devices['iPhone 13'] }, { noWebGL: true, offlineAt: 'lunar-habitat' }));
await browser.close();
writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results }, null, 1));
console.log(JSON.stringify(results, null, 1));
