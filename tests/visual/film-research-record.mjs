// Film capture (not a test): research features on the public deployment, paced for the 237 s film.
// Usage: node tests/visual/film-research-record.mjs <out-dir> [base] [--dry]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [out = 'film-research', base = 'https://microfire-v2-preview.vercel.app'] = args;
const DRY = process.argv.includes('--dry');
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
mkdirSync(out, { recursive: true });
const W = 1440, H = 810;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 4 / 3 });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('microfire.home.intro', '1'); localStorage.setItem('microfire.ignition.seen', '1'); } catch { /* storage blocked */ }
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div'); c.id = 'film-cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.4 L13.4 19.1 L10.4 12.7 L16.6 12.5 Z" fill="#fff" stroke="#15153d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;border:3px solid #ffb020;z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.3);opacity:1`;
      document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600);
    }, true);
  });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const wait = (ms) => page.waitForTimeout(DRY ? Math.min(ms, 80) : ms);
let mx = W / 2, my = H / 2;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
async function glide(dy, ms = 1200) {
  if (Math.abs(dy) < 4) return;
  await page.evaluate(([d, t]) => new Promise((done) => { const y0 = scrollY, t0 = performance.now(); const step = (n) => { const k = Math.min(1, (n - t0) / t); scrollTo(0, y0 + d * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)); if (k < 1) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); }), [dy, DRY ? 1 : ms]);
}
async function glideTo(loc, offset = -120, ms = 1200) { await loc.waitFor({ state: 'attached', timeout: 20000 }); const y = await loc.evaluate((el) => el.getBoundingClientRect().top); await glide(y + offset, ms); }
async function moveTo(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox(); const x = b.x + Math.min(b.width / 2, 70), y = b.y + b.height / 2;
  const d = Math.hypot(x - mx, y - my), ms = DRY ? 1 : Math.min(750, 260 + d * 0.55), n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) { const k = ease(i / n); await page.mouse.move(mx + (x - mx) * k, my + (y - my) * k); if (!DRY) await page.waitForTimeout(12); }
  mx = x; my = y;
}
async function click(loc) { await moveTo(loc); await wait(220); await page.mouse.down(); await page.mouse.up(); }
async function type(loc, text) { await click(loc); await loc.fill(''); await loc.pressSequentially(text, { delay: DRY ? 0 : 32 }); }

let frames = [], recording = false;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { if (recording) frames.push({ data, t: metadata.timestamp }); await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
const marks = {};
async function segment(name, fn) {
  if (ONLY && !ONLY.has(name)) return;
  frames = []; recording = !DRY; const t0 = Date.now() / 1000; marks[name] = [];
  const mark = (label) => marks[name].push({ label, t: +(Date.now() / 1000 - t0).toFixed(2) });
  if (!DRY) await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await fn(mark); await wait(500);
  await page.screenshot({ path: path.join(out, `${name}-end.png`) });
  if (DRY) { console.log(`${name}: ok`); return; }
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast'); recording = false;
  const dir = path.join(out, `.frames-${name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const list = frames.map((f, i) => { const file = `f${String(i).padStart(5, '0')}.jpg`; writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64')); const nx = frames[i + 1]?.t ?? Math.max(f.t + 1 / 30, tEnd); return `file '${file}'\nduration ${Math.max(1 / 60, nx - f.t).toFixed(4)}`; });
  writeFileSync(path.join(dir, 'list.txt'), list.join('\n') + `\nfile 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-movflags', '+faststart', path.join(out, `${name}.mp4`)]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${(tEnd - t0).toFixed(1)} s, ${frames.length} frames`);
}

try {
  await segment('r1-home', async (mark) => {
    await page.goto(`${base}/`); await page.locator('html[data-ignition="off"]').waitFor({ timeout: 15000 }).catch(() => {}); await wait(2600); mark('hero');
    await click(page.getByRole('radio', { name: 'Earth 1 g' })); await wait(2600); mark('earth 1 g');
    await click(page.getByRole('radio', { name: 'Microgravity, still air' })); await wait(2600); mark('microgravity');
  });
  await segment('r2-atlas', async (mark) => {
    await page.goto(`${base}/atlas`); await wait(2200); mark('atlas');
    await type(page.getByLabel('Search terms'), 'PMMA opposed'); await click(page.getByRole('button', { name: 'Search' })); await wait(2000); mark('search');
    await glideTo(page.locator('.exhibit').first(), -120, 1400); await wait(2400); mark('exhibit');
    await glide(520, 1500); await wait(2200); mark('more');
  });
  await segment('r3-b20', async (mark) => {
    await page.goto(`${base}/experiments/bass2-b20`); await wait(2200); mark('dossier');
    await glideTo(page.locator('#obs').first(), -100, 1300); await wait(2600); mark('observation');
    await glideTo(page.locator('.correction').first(), -160, 1300); await wait(3800); mark('correction');
    await glideTo(page.locator('#cond').first(), -100, 1300); await wait(2800); mark('conditions');
  });
  await segment('r4-library', async (mark) => {
    await page.goto(`${base}/investigations`); await wait(2600); mark('library');
    await glide(560, 1600); await wait(2200); mark('scroll');
    await page.goto(`${base}/investigations/bass-ii`); await wait(2600); mark('bass-ii');
    await glide(600, 1600); await wait(2200); mark('bass-ii more');
  });
  await segment('r5-pix', async (mark) => {
    await page.goto(`${base}/ask`); await wait(1200);
    await type(page.getByLabel('Your research question'), 'Did the flame in B20 burn the sample?'); await wait(300);
    await click(page.getByRole('button', { name: 'Ask PIX', exact: true }));
    await page.getByTestId('pix-answer').waitFor({ timeout: 20000 }).catch(() => {}); await wait(700); mark('answer');
    await glideTo(page.getByTestId('pix-answer'), -110, 1300); await wait(2800);
    await glideTo(page.getByTestId('pix-source'), -160, 1100).catch(() => {}); await wait(2200); mark('source');
    await glide(-4000, 900); await wait(500);
    await click(page.getByRole('button', { name: 'Can this certify a lunar habitat?' }));
    await page.getByTestId('pix-abstention').waitFor({ timeout: 20000 }).catch(() => {}); await wait(500); mark('abstention');
    await glideTo(page.getByTestId('pix-abstention'), -120, 1200); await wait(3600);
  });
  await segment('r6-glance', async (mark) => {
    await page.goto(`${base}/dashboard`); await wait(1200);
    await click(page.getByRole('button', { name: 'Would B20 transfer to a Moon habitat?' }));
    await page.getByTestId('at-a-glance').waitFor({ timeout: 20000 }).catch(() => {}); await wait(600); mark('glance');
    await glideTo(page.getByTestId('at-a-glance'), -90, 1200); await wait(5200); mark('glance read');
    await glideTo(page.getByTestId('transfer-analysis'), -100, 1500).catch(() => {}); await wait(3200); mark('transfer');
  });
  await segment('r7-citation', async (mark) => {
    await page.goto(`${base}/investigations/bass-ii`); await wait(800);
    const checker = page.getByTestId('citation-checker');
    await glideTo(checker, -100, 1000); await wait(600);
    await click(checker.getByRole('button', { name: 'Check this reference' }));
    await checker.getByTestId('checker-result').waitFor({ timeout: 15000 }).catch(() => {}); await wait(2600); mark('verified');
    const pg = checker.getByLabel('PDF page'); await type(pg, '13'); await wait(400);
    await click(checker.getByRole('button', { name: 'Check this reference' }));
    await wait(3400); mark('flagged');
  });
} finally {
  writeFileSync(path.join(out, 'marks.json'), JSON.stringify({ base, marks }, null, 1));
  await browser.close();
}
