// Directing aid (not a test): frames of the homepage opening, the bay peek and the enter shot.
// usage: node tests/visual/frames.mjs <baseURL> <outDir> [desktop|mobile|landscape]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sizes = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  landscape: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
};
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
for (const [tag, opts] of Object.entries(sizes).filter(([k]) => !only || k === only)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  for (const at of [400, 1600, 3000, 4400, 5800, 8200]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await page.screenshot({ path: `${out}/${tag}-intro-${String(at).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 70 });
  }
  const bay = page.getByRole('link', { name: 'Enter the training bay' });
  if (tag === 'desktop') { await bay.hover(); } else { await bay.focus(); }
  await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/${tag}-peek.jpg`, type: 'jpeg', quality: 70 });
  await page.mouse.move(5, 5); await page.locator('body').press('Escape');
  await page.getByRole('navigation', { name: 'Observatory stations' }).getByRole('link').nth(4).focus();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/${tag}-pix-frontier.jpg`, type: 'jpeg', quality: 70 });
  await page.getByRole('navigation', { name: 'Observatory stations' }).getByRole('link').nth(1).focus();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/${tag}-pix-b20.jpg`, type: 'jpeg', quality: 70 });
  await page.locator('body').click({ position: { x: 5, y: 300 } }).catch(() => {});
  await bay.click();
  for (const at of [500, 1000, 1400]) { await page.waitForTimeout(at === 500 ? 500 : at === 1000 ? 500 : 400); await page.screenshot({ path: `${out}/${tag}-enter-${at}.jpg`, type: 'jpeg', quality: 70 }); }
  await page.waitForURL('**/missions/bass-assembly/tour', { timeout: 5000 }).catch(() => errors.push('did not reach the tour'));
  console.log(tag, 'errors:', JSON.stringify(errors));
  await ctx.close();
}
await browser.close();
