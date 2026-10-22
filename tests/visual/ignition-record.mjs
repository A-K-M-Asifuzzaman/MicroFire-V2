// Opening-film evidence (not a test): a real-time first visit, recorded, with timed stills through the hand-off to the
// homepage; plus the reduced-motion and software-graphics entries. usage: node tests/visual/ignition-record.mjs <base> <out>
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out] = process.argv.slice(2);
fs.mkdirSync(`${out}/recordings`, { recursive: true });
const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
let browser = await chromium.launch({ args: GPU });
for (const [tag, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const size = opts.viewport;
  const ctx = await browser.newContext({ ...opts, recordVideo: { dir: `${out}/recordings`, size } });
  const page = await ctx.newPage();
  await page.goto(base + '/');
  await page.locator('html[data-ignition="play"]').waitFor();
  const t0 = Date.now();
  for (const at of [7.0, 7.7, 8.4, 10.5]) {
    await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - t0)));
    await page.screenshot({ path: `${out}/live-${tag}-${String(at).replace('.', '_')}s.jpg`, type: 'jpeg', quality: 80 });
  }
  const video = page.video(); await ctx.close();
  fs.renameSync(await video.path(), `${out}/recordings/opening-film-${tag}.webm`);
  console.log(tag, 'recorded');
}
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p1 = await rm.newPage(); await p1.goto(base + '/'); await p1.waitForTimeout(3000);
await p1.screenshot({ path: `${out}/reduced-motion-desktop.jpg`, type: 'jpeg', quality: 78 }); await rm.close();
await browser.close();
browser = await chromium.launch({ args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sw = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await sw.newPage(); await p2.goto(base + '/'); await p2.waitForTimeout(4000);
await p2.screenshot({ path: `${out}/software-graphics-desktop.jpg`, type: 'jpeg', quality: 78 }); await browser.close();
console.log('fallbacks captured');
