// Opening-film evidence (not a test): frozen frames at story times, desktop and phone.
// usage: node tests/visual/ignition-frames.mjs <baseURL> <outDir> [t,t,...]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out, list] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const times = (list ?? '0.3,1.0,1.7,2.4,3.6,4.1,4.6,5.4,6.2,6.9,7.4').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
for (const [tag, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['narrow', { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const t of times) {
    await page.goto(`${base}/?intro=1&t=${t}`);
    await page.locator('.ign[data-beat]:not([data-beat=""]):not([data-beat="loading"])').waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${tag}-t${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 80 });
  }
  console.log(tag, 'errors:', JSON.stringify(errors.slice(0, 5)));
  await ctx.close();
}
await browser.close();
