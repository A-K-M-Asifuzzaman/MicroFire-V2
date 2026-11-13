// Reproducible hosted performance probe (no login). Usage: ORIGIN=https://… OUT=report.json node tests/visual/hosted-perf.mjs
// Profiles: desktop (no CPU throttle, 10 Mbps / 40 ms) and mobile-sim (iPhone 13 viewport, 4× CPU slowdown, Slow 4G 1.6 Mbps / 150 ms).
// Cold cache per page. Measures LCP, CLS, interaction latency (Event Timing, scripted click), bytes by type, 3D asset load times,
// JS heap, scene frame times and console errors. The host machine's GPU renders WebGL; mobile-sim is NOT a real phone.
import { chromium, devices } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const ORIGIN = process.env.ORIGIN, OUT = process.env.OUT ?? 'perf.json';
if (!ORIGIN) throw new Error('ORIGIN required');
const PROFILES = {
  desktop: { ctx: { viewport: { width: 1366, height: 860 } }, cpu: 1, net: { latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 10e6 / 8 } },
  'mobile-sim': { ctx: { ...devices['iPhone 13'] }, cpu: 4, net: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } },
};
const PAGES = [
  { path: '/', click: null },
  { path: '/missions/play', ready: '.mf-play[data-phase="ready"]', scene: true },
  { path: '/dashboard', click: '#ws-question' },
  { path: '/lab', click: 'button:has-text("Microgravity (orbit)")' },
];
const OBSERVE = `window.__perf = { lcp: 0, cls: 0, inp: 0 };
new PerformanceObserver((l) => { for (const e of l.getEntries()) __perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) __perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) __perf.inp = Math.max(__perf.inp, e.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });`;
const browser = await chromium.launch();
const results = [];
for (const [profile, cfg] of Object.entries(PROFILES)) for (const pg of PAGES) {
  const ctx = await browser.newContext(cfg.ctx), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...cfg.net }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cfg.cpu });
  await cdp.send('Performance.enable');
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const failed = []; page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await page.addInitScript(OBSERVE);
  const t0 = Date.now();
  await page.goto(ORIGIN + pg.path, { waitUntil: 'load', timeout: 120000 });
  const loadMs = Date.now() - t0;
  if (pg.ready) await page.waitForSelector(pg.ready, { timeout: 90000 }).catch(() => errors.push('ready selector timeout'));
  let sceneReadyMs = null;
  if (pg.scene) {
    const s = Date.now();
    sceneReadyMs = await page.waitForSelector('[data-ready="true"], .mf-fallback-note', { timeout: 90000 }).then(() => Date.now() - t0).catch(() => null);
    void s;
  }
  await page.waitForTimeout(2500);
  if (pg.click) { await page.locator(pg.click).first().click().catch(() => {}); await page.waitForTimeout(800); }
  // Frame times for 5 s (rAF), whatever is animating on the page.
  const frames = await page.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); const end = last + 5000;
    const f = (n) => { t.push(n - last); last = n; if (n < end) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }));
  frames.sort((a, b) => a - b); const q = (p) => +frames[Math.min(frames.length - 1, Math.floor(p * frames.length))].toFixed(1);
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => ({ n: new URL(r.name).pathname, t: r.initiatorType, b: r.transferSize, e: r.encodedBodySize, d: Math.round(r.duration), s: Math.round(r.startTime) })));
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { b: n.transferSize, ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd) }; });
  const vit = await page.evaluate(() => window.__perf);
  const heap = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter((m) => ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes'].includes(m.name)).map((m) => [m.name, m.name.startsWith('JS') ? +(m.value / 1048576).toFixed(1) : m.value]));
  const sum = (f) => Math.round(res.filter(f).reduce((a, r) => a + (r.b || r.e), 0) / 1024);
  const models = res.filter((r) => r.n.startsWith('/models/'));
  const loadEnd = await page.evaluate(() => Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd));
  results.push({ profile, path: pg.path, loadMs, ttfbMs: nav.ttfb, dclMs: nav.dcl, lcpMs: Math.round(vit.lcp), cls: +vit.cls.toFixed(4), interactionMs: pg.click ? Math.round(vit.inp) : null,
    totalKB: sum(() => true) + Math.round(nav.b / 1024), jsKB: sum((r) => r.n.endsWith('.js')), initialJsKB: sum((r) => r.n.endsWith('.js') && r.s <= loadEnd), cssKB: sum((r) => r.n.endsWith('.css')),
    imgKB: sum((r) => /\.(png|jpe?g|webp|avif|svg)$/.test(r.n) && !r.n.startsWith('/models/')), fontKB: sum((r) => /\.(woff2?|ttf)$/.test(r.n)), mediaKB: sum((r) => /\.(mp4|webm|mp3|ogg)$/.test(r.n)),
    models3dKB: sum((r) => r.n.startsWith('/models/')), models3dFiles: models.length, slowest3dMs: models.reduce((m, r) => Math.max(m, r.s + r.d), 0) || null, sceneReadyMs,
    frames: { n: frames.length, fps: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)).toFixed(1), p50: q(0.5), p95: q(0.95), p99: q(0.99), over50ms: frames.filter((x) => x > 50).length },
    heapMB: heap.JSHeapUsedSize, domNodes: heap.Nodes, failed: [...new Set(failed)], errors: [...new Set(errors)].slice(0, 5) });
  console.log(JSON.stringify(results.at(-1)));
  await ctx.close();
}
await browser.close();
writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results }, null, 1));
