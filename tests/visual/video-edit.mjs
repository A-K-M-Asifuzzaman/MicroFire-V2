// Cuts a finished submission video from recorded site clips and an edit decision list (EDL).
// Usage: node tests/visual/video-edit.mjs <edl.json> <clips-dir> <out.mp4>
// Cards and captions are rendered as Design B PNGs in Chromium (this ffmpeg has no drawtext), then composited with ffmpeg.
// EDL shot kinds: { card: { kicker, title, body }, dur } or { clip, from, dur, caption?, tag?, chapter? }.
// No music or voice; every unfinished feature carries an on-screen tag. The EDL is the editable project file.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [edlPath, clips, outFile] = process.argv.slice(2);
const edl = JSON.parse(readFileSync(edlPath, 'utf8'));
const work = path.join(path.dirname(outFile), `.edit-${path.basename(outFile, '.mp4')}`);
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const W = 1920, H = 1080, FPS = 30, XF = 0.4;

const css = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible+Next:wght@400;700&display=block');
*{box-sizing:border-box;margin:0} html,body{width:${W}px;height:${H}px;background:transparent;font-family:'Atkinson Hyperlegible Next',sans-serif;color:#15153d}
.card{position:absolute;inset:0;background:#2a2bd6;display:grid;place-content:center;padding:0 200px;gap:28px;color:#fff}
.card .k{justify-self:start;padding:6px 20px;border-radius:999px;background:#ffb020;color:#15153d;border:4px solid #15153d;font:700 30px 'Atkinson Hyperlegible Next'}
.card h1{font:800 104px/1 'Bricolage Grotesque';letter-spacing:-.02em;max-width:22ch}
.card p{font-size:40px;line-height:1.35;max-width:46ch;color:#eef1ff}
.card .foot{position:absolute;left:200px;bottom:64px;font-size:24px;color:#c9cdff}
.cap{position:absolute;left:80px;bottom:72px;max-width:1300px;padding:22px 30px;background:#fff;border:4px solid #15153d;border-radius:22px;box-shadow:8px 8px 0 #15153d;font:700 40px/1.25 'Atkinson Hyperlegible Next'}
.chap{display:inline-block;margin-right:16px;padding:2px 16px;border-radius:999px;background:#2a2bd6;color:#fff;border:3px solid #15153d;font:700 28px 'Atkinson Hyperlegible Next';vertical-align:4px}
.tag{position:absolute;right:80px;top:112px;padding:6px 18px;border-radius:999px;background:#ffb020;border:4px solid #15153d;font:700 26px 'Atkinson Hyperlegible Next'}`;
const esc = (s = '') => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
async function png(html, file) {
  await page.setContent(`<!doctype html><style>${css}</style>${html}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: true });
}

const parts = [];
for (const [i, s] of edl.shots.entries()) {
  const out = path.join(work, `s${String(i).padStart(3, '0')}.mp4`), over = path.join(work, `o${i}.png`);
  const enc = ['-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-an'];
  if (s.card) {
    await png(`<div class="card">${s.card.kicker ? `<span class="k">${esc(s.card.kicker)}</span>` : ''}<h1>${esc(s.card.title)}</h1>${s.card.body ? `<p>${esc(s.card.body)}</p>` : ''}${s.card.foot ? `<div class="foot">${esc(s.card.foot)}</div>` : ''}</div>`, over);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(s.dur), '-i', over, '-vf', `scale=${W}:${H},format=yuv420p`, ...enc, out]);
  } else {
    await png(`${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ''}${s.caption ? `<div class="cap">${s.chapter ? `<span class="chap">${esc(s.chapter)}</span>` : ''}${esc(s.caption)}</div>` : ''}`, over);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(s.from ?? 0), '-t', String(s.dur), '-i', path.join(clips, `${s.clip}.mp4`), '-i', over,
      '-filter_complex', `[0:v]fps=${FPS},scale=${W}:${H}:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration=${s.dur}[b];[b][1:v]overlay=0:0,trim=duration=${s.dur}[v]`, '-map', '[v]', ...enc, out]);
  }
  parts.push({ file: out, dur: s.dur });
}
await browser.close();

// Cross-fade the shots together (XF seconds each), then fade in/out the whole cut.
let filter = '', last = '[0:v]', t = parts[0].dur;
for (let i = 1; i < parts.length; i++) { filter += `${last}[${i}:v]xfade=transition=fade:duration=${XF}:offset=${(t - XF).toFixed(3)}[x${i}];`; last = `[x${i}]`; t += parts[i].dur - XF; }
filter += `${last}fade=t=in:d=0.5,fade=t=out:st=${(t - 0.6).toFixed(3)}:d=0.6[out]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...parts.flatMap((p) => ['-i', p.file]), '-filter_complex', filter, '-map', '[out]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
rmSync(work, { recursive: true, force: true });
console.log(`${outFile}: ${execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]).toString().trim()} s (EDL total ${t.toFixed(1)} s)`);
