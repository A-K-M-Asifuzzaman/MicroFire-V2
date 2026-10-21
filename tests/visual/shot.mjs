// One page at chosen review viewports, review chrome hidden (not a test).
// usage: node tests/visual/shot.mjs <url> <outPrefix> [waitMs] [desktop,mobile,narrow,landscape] [js-to-run-before-shot]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [url, prefix, wait = '4000', which = 'desktop,mobile', js = ''] = process.argv.slice(2);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const touch = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const all = { desktop: { viewport: { width: 1440, height: 900 } }, mobile: { viewport: { width: 390, height: 844 }, ...touch },
  narrow: { viewport: { width: 320, height: 640 }, ...touch }, landscape: { viewport: { width: 844, height: 390 }, ...touch } };
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
for (const tag of which.split(',')) {
  const ctx = await browser.newContext(all[tag]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(Number(wait));
  if (js) { await page.evaluate(js); await page.waitForTimeout(1500); }
  await page.evaluate(() => { document.documentElement.dataset.clean = '1'; });
  await page.screenshot({ path: `${prefix}-${tag}.jpg`, type: 'jpeg', quality: 78, fullPage: process.env.FULL === '1' });
  console.log(tag, errors.length ? JSON.stringify(errors.slice(0, 4)) : 'ok');
  await ctx.close();
}
await browser.close();
