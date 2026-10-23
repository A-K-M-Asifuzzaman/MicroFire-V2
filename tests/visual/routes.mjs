// Route screenshots at the four review viewports (not a test).
// usage: node tests/visual/routes.mjs <baseURL> <outDir> <path[@waitMs][#name]>...
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out, ...paths] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const touch = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const viewports = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, ...touch },
  narrow: { viewport: { width: 320, height: 640 }, ...touch },
  landscape: { viewport: { width: 844, height: 390 }, ...touch }
};
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
for (const [tag, opts] of Object.entries(viewports)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const p of paths) {
    const [spec, label] = p.split('#');
    const [url, wait = '2500'] = spec.split('@');
    await page.goto(base + url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(Number(wait));
    await page.evaluate(() => { document.documentElement.dataset.clean = '1'; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    const name = label ?? (url.replace(/[/?=&]+/g, '-').replace(/^-|-$/g, '') || 'home');
    await page.screenshot({ path: `${out}/${name}-${tag}.jpg`, type: 'jpeg', quality: 74 });
  }
  console.log(tag, 'errors:', JSON.stringify(errors));
  await ctx.close();
}
await browser.close();
