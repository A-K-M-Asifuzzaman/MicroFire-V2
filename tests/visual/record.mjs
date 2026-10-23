// Screen recordings of each design prototype with real interaction (not a test).
// usage: node tests/visual/record.mjs <baseURL> <outDir>
import { chromium } from 'playwright';
import fs from 'node:fs';

const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const size = { width: 1280, height: 800 };
const step = async (fn) => { try { await fn(); } catch (e) { console.log('step skipped:', String(e.message).split('\n')[0]); } };
const scripts = {
  a: async (p, w) => {
    await p.goto(base + '/design/a'); await w(5000);
    const rail = p.locator('.da-rail a');
    for (const i of [1, 4, 0]) { await rail.nth(i).hover(); await w(1800); }
    await p.mouse.move(640, 300);
    await step(() => p.locator('.da-detents button').nth(1).click()); await w(2600);
    await step(() => p.locator('.da-dial svg').focus()); for (let i = 0; i < 10; i++) { await p.keyboard.press('ArrowLeft'); await w(120); } await w(1600);
    await step(() => p.getByRole('link', { name: 'Enter the training bay' }).hover()); await w(1600);
    await step(() => p.getByRole('link', { name: 'Enter the training bay' }).click()); await w(11000);
    await step(() => p.getByRole('button', { name: 'Guided tour' }).click()); await w(9000);
    await step(() => p.getByRole('button', { name: /Stop tour/ }).click()); await w(500);
    await step(() => p.locator('.da-seg button', { hasText: 'Bay' }).click()); await w(4000);
    await step(() => p.getByRole('link', { name: 'B20 record' }).click()); await w(2000);
    for (const label of ['3', 'pot 0.5', '5']) { await step(() => p.getByRole('radio', { name: label, exact: true }).click()); await w(1800); }
    await step(() => p.locator('.da-ch-row', { hasText: 'Pressure' }).click()); await w(900);
    await p.mouse.wheel(0, 700); await w(1200);
    await step(() => p.locator('.da-ch-row', { hasText: 'Calibrated oxygen' }).click()); await w(500);
    await step(() => p.locator('.da-ch-row', { hasText: 'Calibrated oxygen' }).click()); await w(500);
    await step(() => p.locator('.da-switch').click()); await w(1500);
  },
  b: async (p, w) => {
    await p.goto(base + '/design/b'); await w(4000);
    await step(() => p.getByRole('button', { name: /Earth/ }).click()); await w(2800);
    await step(() => p.getByRole('button', { name: /Space/ }).click()); await w(2200);
    await p.mouse.wheel(0, 650); await w(1000);
    const st = p.locator('.db-sticker');
    for (const i of [1, 2, 4]) { await st.nth(i).hover(); await w(1500); }
    await p.mouse.wheel(0, -650); await w(800);
    await step(() => p.getByRole('link', { name: 'Enter the training bay' }).click()); await w(11000);
    await step(() => p.getByRole('button', { name: /Take the guided tour/ }).click()); await w(9000);
    await step(() => p.getByRole('button', { name: 'Stop the tour' }).click()); await w(400);
    await p.mouse.wheel(0, 600); await w(800);
    await step(() => p.locator('.db-part').nth(5).click()); await w(1800);
    await step(() => p.getByRole('link', { name: 'B20 record' }).click()); await w(2000);
    await p.mouse.wheel(0, 650); await w(900);
    for (const label of ['3', 'pot 0.5', '5']) { await step(() => p.getByRole('radio', { name: label, exact: true }).click()); await w(1700); }
    await p.mouse.wheel(0, 650); await w(900);
    await step(() => p.locator('.db-fact', { hasText: 'Pressure' }).click()); await w(1800);
    await step(() => p.locator('.db-fact', { hasText: 'Film thickness' }).click()); await w(1600);
    await step(() => p.locator('.db-fact', { hasText: 'Calibrated oxygen' }).click()); await step(() => p.locator('.db-check').click()); await w(1600);
  }
};
for (const [name, run] of Object.entries(scripts)) {
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: out, size } });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.clean = '1'; }); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  await run(page, (ms) => page.waitForTimeout(ms));
  const video = page.video();
  await ctx.close();
  const file = await video.path();
  fs.renameSync(file, `${out}/design-${name}-walkthrough.webm`);
  console.log(name, 'recorded');
}
await browser.close();
