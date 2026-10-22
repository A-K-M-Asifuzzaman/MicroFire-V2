// Re-renders the arrival / no-WebGL backdrop (public/media/m2/lab-arrival.jpg) from the live bay (not a test).
// usage: node tests/visual/arrival-still.mjs <tourBaseURL> <out.jpg>
import { chromium } from 'playwright';

const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await (await browser.newContext({ viewport: { width: 1120, height: 630 }, deviceScaleFactor: 2 })).newPage();
await p.goto(base + '/missions/bass-assembly/tour');
await p.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }).catch(() => {});
await p.locator('.m2-bench[data-env="ready"]').waitFor({ timeout: 30000 });
await p.getByRole('button', { name: 'Bay', exact: true }).click();
await p.addStyleTag({ content: '.m2-tour .m2-bench { position: fixed !important; inset: 0 !important; height: 100vh !important; aspect-ratio: auto !important; z-index: 9999; border-radius: 0 !important; border: 0 !important; } .m2-callouts, .m2-bench-env, .m2-bench-tip { display: none !important; } .m2-bench::after { display: none !important; } body * { visibility: hidden !important; } .m2-tour .m2-bench, .m2-tour .m2-bench canvas { visibility: visible !important; }' });
await p.evaluate(() => dispatchEvent(new Event('resize')));
await p.waitForTimeout(7000);
await p.screenshot({ path: out, type: 'jpeg', quality: 72 });
await browser.close();
