// Visual evidence of the normal site (not a test). Same script before and after a change, identical viewports.
// usage: node tests/visual/capture.mjs <baseURL> <outDir> [--video]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out, flag] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const touch = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const viewports = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, ...touch },
  narrow: { viewport: { width: 320, height: 640 }, ...touch },
  landscape: { viewport: { width: 844, height: 390 }, ...touch }
};
const noWebGL = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); };
};
const browser = await chromium.launch({ args: GPU });
for (const [tag, opts] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ ...opts, ...(flag === '--video' && tag === 'desktop' ? { recordVideo: { dir: out, size: { width: 1440, height: 900 } } } : {}) });
  const page = await ctx.newPage();
  const shot = async (name) => { await page.screenshot({ path: `${out}/${name}-${tag}.jpg`, type: 'jpeg', quality: 72 }); console.log(tag, name); };
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700); await shot('01-home-load');
  await page.waitForTimeout(6500); await shot('02-home-cinematic');
  // PIX interaction: focus the Ask PIX station (keyboard path works on every viewport).
  await page.getByRole('navigation', { name: 'Observatory stations' }).getByRole('link').nth(3).focus();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1500); await shot('03-pix-interaction');
  const entrance = page.getByRole('link', { name: /^(Tour|Enter) the training bay/i }).first();
  await entrance.scrollIntoViewIfNeeded(); await entrance.hover().catch(() => {});
  await page.waitForTimeout(1500); await shot('04-bay-entrance');
  await entrance.click();
  await page.waitForURL('**/missions/bass-assembly/tour');
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }).catch(() => {});
  await page.locator('.m2-bench[data-env="ready"], .m2-bench[data-env="off"]').waitFor({ timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: 'Work view' }).click().catch(() => {});
  await page.locator('.m2-tour').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500); await shot('05-bay-work-view');
  // Research → laboratory: from the B20 dossier through the ordinary navigation.
  await page.goto(base + '/experiments/bass2-b20', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (tag === 'desktop') { await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: /Missions/ }).click(); await page.waitForURL('**/missions'); await page.getByRole('navigation', { name: 'Mission tools' }).getByRole('link', { name: 'Training bay' }).click(); }
  else { await page.getByText('Menu').click(); await page.locator('details.mobile-nav').getByRole('link', { name: 'Training bay tour' }).click(); }
  await page.waitForTimeout(250); await shot('06-research-to-lab');
  await ctx.close();
  // Reduced motion and no-WebGL: fresh contexts on the homepage.
  const rm = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
  const p2 = await rm.newPage(); await p2.goto(base + '/', { waitUntil: 'networkidle' }); await p2.waitForTimeout(2500);
  await p2.screenshot({ path: `${out}/07-reduced-motion-${tag}.jpg`, type: 'jpeg', quality: 72 }); await rm.close();
  const ng = await browser.newContext(opts); await ng.addInitScript(noWebGL);
  const p3 = await ng.newPage(); await p3.goto(base + '/', { waitUntil: 'networkidle' }); await p3.waitForTimeout(2000);
  await p3.screenshot({ path: `${out}/08-no-webgl-${tag}.jpg`, type: 'jpeg', quality: 72 }); await ng.close();
  console.log(tag, 'done');
}
await browser.close();
