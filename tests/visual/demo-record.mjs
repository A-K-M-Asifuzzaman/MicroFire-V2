// Records the judge demo route as a high-quality MP4 (Chrome screencast frames → ffmpeg H.264, 30 fps).
// Usage: node tests/visual/demo-record.mjs <out-dir> [base-url] [width] [height]
// Each segment is also written as its own clip, so an editor can cut the 240 s and 30 s videos from the pieces.
// Only shipped functionality is shown; the opening film and the 3D bay are labelled illustrations on screen.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [out = 'demo-out', base = 'https://microfire-v2-preview.vercel.app', W = '1920', H = '1080'] = process.argv.slice(2);
const width = Number(W), height = Number(H);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
// PACE stretches every hold (e.g. PACE=1.6 for the 240 s cut) so the editor has room to trim.
const PACE = Number(process.env.PACE ?? 1);
const pause = (ms) => page.waitForTimeout(ms * PACE);
/** Smooth scroll by `dy` pixels over `ms`, so the footage reads like a person scrolling. */
const glide = async (dy, ms = 1400) => { await page.evaluate(([d, t]) => new Promise((done) => { const y0 = scrollY, t0 = performance.now(); const step = (n) => { const k = Math.min(1, (n - t0) / t); scrollTo(0, y0 + d * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)); if (k < 1) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); }), [dy, ms]); };
const glideTo = async (sel, offset = -110, ms = 1400) => { const y = await page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top); await glide(y + offset, ms); };

let frames = [], recording = null;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { if (recording) frames.push({ data, t: metadata.timestamp }); await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
// ONLY=10-intel-transfer,11-intel-pix records just those segments (others are skipped).
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
async function segment(name, fn) {
  if (ONLY && !ONLY.has(name)) return;
  frames = []; recording = name;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  const t0 = Date.now();
  await fn();
  await pause(300);
  const tEnd = Date.now() / 1000; // screencast timestamps are epoch seconds; frames only arrive on change
  await cdp.send('Page.stopScreencast'); recording = null;
  const dir = path.join(out, `.frames-${name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  // Variable-rate frames → a concat list with real durations → constant 30 fps H.264.
  const list = frames.map((f, i) => { const file = `f${String(i).padStart(5, '0')}.jpg`; writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64')); const next = frames[i + 1]?.t ?? Math.max(f.t + 1 / 30, tEnd); /* hold the final frame until stop */ return `file '${file}'\nduration ${Math.max(1 / 60, next - f.t).toFixed(4)}`; });
  writeFileSync(path.join(dir, 'list.txt'), list.join('\n') + `\nfile 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', `fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', path.join(out, `${name}.mp4`)]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s, ${frames.length} frames`);
}

// 1. The opening film (first visit), handing off to the Design B homepage.
await segment('01-opening-film', async () => {
  await page.goto(`${base}/?intro=1`);
  await page.locator('dialog#ignition[data-beat="earth"]').waitFor({ timeout: 30000 }).catch(() => {});
  await page.locator('html[data-ignition="off"]').waitFor({ timeout: 20000 }).catch(() => {});
  await pause(1500);
});
// 2. Gravity Lens: the same illustrated flame in microgravity and at 1 g; PIX narrates.
await segment('02-gravity-lens', async () => {
  await pause(800);
  await page.getByRole('radio', { name: 'Earth 1 g' }).check(); await pause(2600);
  await page.getByRole('radio', { name: 'Microgravity, still air' }).check(); await pause(2400);
  await glideTo('.home-trail', -40); await pause(1800);
});
// 2b. The rest of the homepage: gravity duel, training bay, PIX and the trust strip.
await segment('02b-home-sections', async () => {
  for (let i = 0; i < 6; i++) { await glide(620, 1500); await pause(1300); }
});
// 3. Atlas: one admitted record, 55 quarantined; open B20.
await segment('03-atlas', async () => {
  await page.goto(`${base}/atlas`); await pause(1600);
  await page.getByLabel('Search terms').fill('PMMA opposed'); await page.getByRole('button', { name: 'Search' }).click(); await pause(1800);
  await glideTo('.exhibit', -120); await pause(1600);
});
// 4. B20 dossier: field card, the instrument part by part, the 17.4 vol% correction and the conditions table.
await segment('04-b20-dossier', async () => {
  await page.goto(`${base}/experiments/bass2-b20`); await pause(2200);
  await glideTo('#obs', -100); await pause(2000);
  await glideTo('.correction', -160); await pause(2000);
  await glideTo('#app', -100); await pause(800);
  const parts = page.getByRole('list', { name: 'Apparatus parts and run conditions' }).getByRole('button');
  for (const i of [0, 3, 6]) { await parts.nth(i).click({ timeout: 2500 }).catch(() => {}); await pause(1300); }
  await glideTo('#cond', -100); await pause(2200);
});
// 5. Ask PIX: a cited answer, then an honest abstention on a lunar-habitat question.
await segment('05-ask-pix', async () => {
  await page.goto(`${base}/ask`); await pause(1200);
  const q = page.getByLabel('Your research question');
  await q.click(); await q.pressSequentially('What does B20 establish about airflow?', { delay: 35 });
  await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
  await page.getByTestId('pix-answer').waitFor({ timeout: 15000 }).catch(() => {}); await pause(800);
  await glideTo('[data-testid="pix-answer"]', -120); await pause(3000);
  await glide(-4000, 900);
  await q.fill(''); await q.pressSequentially('Can this certify a lunar habitat as fire safe?', { delay: 35 });
  await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
  await page.getByTestId('pix-abstention').waitFor({ timeout: 15000 }).catch(() => {}); await pause(600);
  await glideTo('[data-testid="pix-abstention"]', -120); await pause(3200);
});
// 6. Evidence Workstation: trace a question to its support, matched conditions and limits.
await segment('06-workstation', async () => {
  await page.goto(`${base}/dashboard`); await pause(1200);
  await page.getByRole('button', { name: /recorded B20 observation/ }).click();
  await page.getByTestId('chain-rail').waitFor({ timeout: 15000 }).catch(() => {}); await pause(1200);
  await glideTo('[data-testid="chain-rail"]', -120); await pause(2400);
  await glide(700, 1600); await pause(1800);
});
// 7. Research Frontier: what the catalog does and does not document.
await segment('07-frontier', async () => {
  await page.goto(`${base}/gaps`); await pause(2000);
  await glide(600, 1600); await pause(2000);
});
// 8. Missions: five on the map, none falsely playable; the training bay tour.
await segment('08-missions-and-bay', async () => {
  await page.goto(`${base}/missions`); await pause(2000);
  await glideTo('.mission-route', -150, 1600); await pause(3500);
  await page.goto(`${base}/missions/lunar-habitat`); await pause(3500);
  await page.goto(`${base}/missions/bass-assembly/tour`); await pause(1500);
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 4000 }).catch(() => {});
  await page.locator('.m2-bench[data-frame="true"]').waitFor({ timeout: 30000 }).catch(() => {});
  await glideTo('.m2-bench', -90, 1000); await pause(1500);
  await page.getByRole('button', { name: 'Guided tour' }).click().catch(() => {}); await pause(9000);
});
// 9. Evidence Passport.
await segment('09-passport', async () => {
  await page.goto(`${base}/passport`); await pause(2200);
  await glide(500, 1400); await pause(1800);
});

// 10. Evidence Workstation on scientific-intelligence-v1: does B20 transfer to a Moon habitat? (six-condition analysis)
await segment('10-intel-transfer', async () => {
  await page.goto(`${base}/dashboard`); await pause(1200);
  await page.getByRole('button', { name: 'Would B20 transfer to a Moon habitat?' }).click();
  await page.getByTestId('transfer-analysis').waitFor({ timeout: 20000 }).catch(() => {}); await pause(900);
  await glideTo('[data-testid="intel-summary"]', -110, 1500); await pause(2600);
  await glideTo('[data-testid="transfer-analysis"]', -100, 1600); await pause(3600);
  await glide(420, 1400); await pause(2400);
});
// 11. Ask PIX on the intelligence API: cited answer with its source experiment, then an explicit abstention.
await segment('11-intel-pix', async () => {
  await page.goto(`${base}/ask`); await pause(1000);
  await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click();
  await page.getByTestId('pix-answer').waitFor({ timeout: 20000 }).catch(() => {}); await pause(700);
  await glideTo('[data-testid="pix-answer"]', -110, 1400); await pause(2600);
  await glideTo('[data-testid="pix-source"]', -160, 1200); await pause(2000);
  await glide(-4000, 900);
  await page.getByRole('button', { name: 'Can this certify a lunar habitat?' }).click();
  await page.getByTestId('pix-abstention').waitFor({ timeout: 20000 }).catch(() => {}); await pause(500);
  await glideTo('[data-testid="pix-abstention"]', -120, 1200); await pause(2800);
});

await browser.close();
// One continuous backup cut of the whole route.
if (ONLY) { console.log('partial recording: no full-route cut'); process.exit(0); }
const clips = ['01-opening-film', '02-gravity-lens', '02b-home-sections', '03-atlas', '04-b20-dossier', '05-ask-pix', '06-workstation', '07-frontier', '08-missions-and-bay', '09-passport'];
writeFileSync(path.join(out, 'concat.txt'), clips.map((c) => `file '${c}.mp4'`).join('\n') + '\n');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'concat.txt'), '-c', 'copy', path.join(out, 'full-route.mp4')]);
console.log(`full-route: ${execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(out, 'full-route.mp4')]).toString().trim()} s`);
