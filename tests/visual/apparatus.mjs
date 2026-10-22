// Apparatus evidence (not a test): identical shots before and after the apparatus overhaul.
// usage: node tests/visual/apparatus.mjs <tourBaseURL> <galleryBaseURL> <outDir>
import { chromium } from 'playwright';
import fs from 'node:fs';

const [tour, gallery, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const step = async (fn) => { try { await fn(); } catch (e) { console.log('skipped:', String(e.message).split('\n')[0]); } };
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let p = await desk.newPage(); p.setDefaultTimeout(8000);
// Full-page captures hide the sticky site header so it never overlaps the stitched page.
const shot = async (name, el = '.m2-bench') => {
  await p.waitForTimeout(1800);
  await p.addStyleTag({ content: 'header, .site-header { position: static !important; }' }).catch(() => {});
  await p.locator(el).first().screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 }); console.log(name);
};
// --- tour: reference configuration ---
await p.goto(tour + '/missions/bass-assembly/tour');
await step(() => p.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }));
await p.locator('.m2-bench[data-env="ready"], .m2-bench[data-env="off"]').waitFor({ timeout: 30000 });
await step(() => p.getByRole('button', { name: 'Work view' }).click());
await shot('01-full-apparatus');
for (const [part, name] of [['Fan', '02-fan-closeup'], ['Honeycomb flow straightener', '03-straightener-closeup'], ['Igniter', '04-sample-igniter-closeup']]) {
  await step(() => p.locator('.m2-tour-parts button', { hasText: part }).first().click());
  await step(() => p.getByRole('button', { name: /^Inspect/ }).click());
  await shot(name);
}
// --- gameplay fixtures: assembly, preview, refusal, fault ---
const openScenario = async (s) => { await p.goto(`${gallery}/m2-fixtures?scenario=${s}`); await step(() => p.getByRole('button', { name: '3D bench' }).click()); await p.locator('.m2-bench[data-frame="true"]').waitFor({ timeout: 30000 }); await p.waitForTimeout(2500); };
await openScenario('assembly-refused');
await step(() => p.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ }).click());
await shot('05-assembly-action', '.m2-play, main');
await step(() => p.getByRole('radio', { name: 'Duct inlet' }).check());
await shot('06-placement-preview', '.m2-play, main');
await step(() => p.getByRole('button', { name: 'Install fan' }).click());
await shot('07-incorrect-placement-and-intent', 'main');
await openScenario('fault');
await step(() => p.getByRole('group', { name: 'Camera view' }).getByRole('button', { name: 'Inspect' }).click());
await shot('08-fault-inspection');
await desk.close();
// --- phone: tap a part, then a mount, in the bottom sheet ---
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p = await phone.newPage(); p.setDefaultTimeout(8000);
await p.goto(`${gallery}/m2-fixtures?scenario=assembly-refused`);
await step(() => p.getByRole('button', { name: '3D bench' }).tap());
await p.waitForTimeout(6000);
await step(() => p.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ }).tap());
await step(() => p.locator('.m2-placement label', { hasText: 'Duct inlet' }).tap());
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/09-mobile-interaction.jpg`, type: 'jpeg', quality: 80 }); console.log('09-mobile-interaction');
await phone.close(); await browser.close();
