// Hybrid-design acceptance evidence (not a test): the same 13 views before and after.
// usage: node tests/visual/hybrid.mjs <tourBaseURL> <galleryBaseURL> <outDir>
import { chromium } from 'playwright';
import fs from 'node:fs';

const [tour, gallery, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const step = async (fn) => { try { await fn(); } catch (e) { console.log('  skipped:', String(e.message).split('\n')[0]); } };
const desktop = { viewport: { width: 1440, height: 900 } };
const phone = (width, height) => ({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

/** Scroll an element to just under the sticky site header, settle, then capture the viewport. */
const view = async (p, name, sel) => {
  if (sel) await step(() => p.locator(sel).first().evaluate((el) => { const top = el.getBoundingClientRect().top + scrollY - (document.querySelector('header')?.getBoundingClientRect().height ?? 0) - 12; scrollTo(0, top); }));
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 78 }); console.log(name);
};
const scenario = async (p, id, three = true, extra = '') => {
  await p.goto(`${gallery}/m2-fixtures?scenario=${id}${extra}`);
  if (three) { await step(() => p.getByRole('button', { name: '3D bench' }).click()); await step(() => p.locator('.m2-bench[data-frame="true"]').waitFor({ timeout: 30000 })); }
};
const tourPart = async (p, part) => {
  await step(() => p.locator('.m2-tour-parts button', { hasText: part }).first().click());
  await step(() => p.getByRole('button', { name: /^Inspect/ }).click());
};

let browser = await chromium.launch({ args: GPU });
let ctx = await browser.newContext(desktop), p = await ctx.newPage(); p.setDefaultTimeout(8000);

// 1 cinematic opening (gallery replays the arrival sequence on request)
await p.goto(`${gallery}/m2-fixtures?scenario=arrival&intro=1`); await p.waitForTimeout(2600);
await p.screenshot({ path: `${out}/01-cinematic-opening.jpg`, type: 'jpeg', quality: 78 }); console.log('01-cinematic-opening');
// 2 assembly work view
await scenario(p, 'assembly-refused');
await step(() => p.getByRole('button', { name: 'Work view' }).click());
await view(p, '02-assembly-work-view', '.m2-stage3d');
// 3–5 apparatus close-up, fan, honeycomb (tour: reference configuration)
await p.goto(`${tour}/missions/bass-assembly/tour`);
await step(() => p.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }));
await step(() => p.locator('[data-env="ready"], [data-env="off"]').first().waitFor({ timeout: 30000 }));
await tourPart(p, 'Sample holder'); await view(p, '03-apparatus-closeup', '[data-frame="true"]');
await tourPart(p, 'Fan'); await view(p, '04-fan-inspection');
await tourPart(p, 'Honeycomb flow straightener'); await view(p, '05-honeycomb-inspection');
// 6 placement preview, 7 wrong placement
await scenario(p, 'assembly-refused');
await step(() => p.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ }).click());
await step(() => p.getByRole('radio', { name: /^Duct inlet/ }).check());
await view(p, '06-placement-preview', '.m2-stage3d');
await step(() => p.getByRole('radio', { name: /^Honeycomb slot/ }).check());
await step(() => p.getByRole('button', { name: 'Install fan' }).click());
await view(p, '07-wrong-placement', '.m2-stage3d');
// 8 fault diagnosis, 9 repair
await scenario(p, 'diagnostic'); await view(p, '08-fault-diagnosis', '.m2-board');
await scenario(p, 'repair-a'); await view(p, '09-repair', '.m2-repair');
// 10 desktop overall layout
await scenario(p, 'assembly-refused'); await p.waitForTimeout(2500);
await p.addStyleTag({ content: 'header { position: static !important; }' });
await p.screenshot({ path: `${out}/10-desktop-layout.jpg`, type: 'jpeg', quality: 70, fullPage: true }); console.log('10-desktop-layout');
await ctx.close();

// 11 mobile overall layout (390 and 320) and the placement split view
for (const [w, h, tag] of [[390, 844, '390'], [320, 640, '320']]) {
  ctx = await browser.newContext(phone(w, h)); p = await ctx.newPage(); p.setDefaultTimeout(8000);
  await p.goto(`${gallery}/m2-fixtures?scenario=assembly-refused`);
  await step(() => p.getByRole('button', { name: '3D bench' }).tap()); await p.waitForTimeout(5000);
  await p.addStyleTag({ content: 'header { position: static !important; }' });
  await p.screenshot({ path: `${out}/11-mobile-layout-${tag}.jpg`, type: 'jpeg', quality: 70, fullPage: true }); console.log(`11-mobile-layout-${tag}`);
  await step(() => p.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ }).tap());
  await step(() => p.locator('.m2-placement label', { hasText: 'Duct inlet' }).tap());
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/11-mobile-placement-${tag}.jpg`, type: 'jpeg', quality: 78 }); console.log(`11-mobile-placement-${tag}`);
  await ctx.close();
}

// 12 reduced motion
ctx = await browser.newContext({ ...desktop, reducedMotion: 'reduce' }); p = await ctx.newPage(); p.setDefaultTimeout(8000);
await scenario(p, 'fault'); await view(p, '12-reduced-motion', '.m2-stage3d');
await ctx.close(); await browser.close();

// 13 software-graphics fallback (SwiftShader)
browser = await chromium.launch({ args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
ctx = await browser.newContext(desktop); p = await ctx.newPage(); p.setDefaultTimeout(8000);
await scenario(p, 'assembly-refused'); await view(p, '13-software-fallback', '.m2-stage3d');
await browser.close();
