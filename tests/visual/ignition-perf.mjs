// Opening-film cost probe (not a test): first visit, real time. Reports gate time, first film frame, close time,
// bytes by kind, frame-time distribution during the film, and live WebGL contexts after it.
// usage: node tests/visual/ignition-perf.mjs <baseURL> [gpu|software]
import { chromium } from 'playwright';

const [base, mode = 'gpu'] = process.argv.slice(2);
const args = mode === 'gpu' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const probe = () => {
  const w = window; w.__p = { gl: 0, raf: [] };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...r) { const c = orig.call(this, t, ...r); if (c && /webgl/.test(t) && !this.__c) { this.__c = 1; w.__p.gl++; this.addEventListener('webglcontextlost', () => w.__p.gl--); } return c; };
  const tick = (t) => { if (document.documentElement.dataset.ignition === 'play') w.__p.raf.push(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
};
const browser = await chromium.launch({ args });
for (const [tag, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }]]) {
  const ctx = await browser.newContext(opts); await ctx.addInitScript(probe);
  const page = await ctx.newPage();
  const bytes = { film: 0, models: 0, other: 0 }; const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
  const urls = new Map(); cdp.on('Network.responseReceived', (e) => urls.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', (e) => { const u = urls.get(e.requestId) ?? ''; const k = /\/models\//.test(u) ? 'models' : /ignition|three|film/.test(u) ? 'film' : 'other'; bytes[k] += e.encodedDataLength; });
  let filmChunk = 0; page.on('response', async (r) => { if (/_next\/static\/chunks\//.test(r.url()) && (await r.text().catch(() => '')).includes('FIRE ANOMALY')) filmChunk += Number(r.headers()['content-length'] ?? 0); });
  await page.goto(base + '/');
  await page.locator('html[data-ignition="off"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const m = (n) => performance.getEntriesByName(n)[0]?.startTime ?? null, nav = performance.getEntriesByType('navigation')[0];
    const d = window.__p.raf.slice(1).map((x, i) => x - window.__p.raf[i]).sort((a, b) => a - b);
    return { gateMs: m('ignition:gate'), domInteractiveMs: nav?.domInteractive ?? null, firstFilmFrameMs: m('ignition:first-frame'), closedMs: m('ignition:closed'),
      beats: document.documentElement.dataset.ignitionBeats ?? '', frames: d.length, frameMedMs: d[d.length >> 1] ?? null, frameP95Ms: d[Math.floor(d.length * 0.95)] ?? null, frameMaxMs: d[d.length - 1] ?? null, webglAfter: window.__p.gl };
  });
  console.log(JSON.stringify({ mode, tag, ...r, mbModels: +(bytes.models / 1048576).toFixed(2), mbAll: +((bytes.models + bytes.film + bytes.other) / 1048576).toFixed(2) }));
  await ctx.close();
}
await browser.close();
