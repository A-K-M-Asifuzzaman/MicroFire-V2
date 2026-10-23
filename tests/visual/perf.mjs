// Homepage cost probe (not a test). usage: node tests/visual/perf.mjs <baseURL> [runs]
// Reports: time to the 3D observatory being active, bytes transferred in the first 9 s, live WebGL contexts,
// long-task total in the first 9 s, and rAF frame intervals sampled 9–12 s after load (vsync-capped).
import { chromium } from 'playwright';

const [base, runs = '2', route = '/', ready = '[data-testid=observatory][data-scene=active], [data-testid=observatory][data-scene=static]'] = process.argv.slice(2);
const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const probe = () => {
  const w = window;
  w.__p = { gl: 0, long: 0 };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...r) { const c = orig.call(this, t, ...r); if (c && /webgl/.test(t) && !this.__c) { this.__c = 1; w.__p.gl++; this.addEventListener('webglcontextlost', () => w.__p.gl--); } return c; };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__p.long += e.duration; }).observe({ type: 'longtask', buffered: true });
};
const browser = await chromium.launch({ args: GPU });
for (const [tag, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }]]) {
  for (let i = 0; i < Number(runs); i++) {
    const ctx = await browser.newContext(opts); await ctx.addInitScript(probe);
    const page = await ctx.newPage();
    let bytes = 0; const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
    const t0 = Date.now();
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.locator(ready).first().waitFor({ timeout: 30000 });
    const active = Date.now() - t0;
    await page.waitForTimeout(9000 - (Date.now() - t0));
    const r = await page.evaluate(() => new Promise((res) => {
      const ts = []; const step = (t) => { ts.push(t); if (ts.length < 180) requestAnimationFrame(step); else { const d = ts.slice(1).map((x, k) => x - ts[k]).sort((a, b) => a - b); res({ med: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)], gl: window.__p.gl, long: window.__p.long }); } };
      requestAnimationFrame(step);
    }));
    console.log(JSON.stringify({ route, tag, run: i + 1, activeMs: active, mb: +(bytes / 1048576).toFixed(2), webglContexts: r.gl, longTaskMs: Math.round(r.long), frameMedMs: +r.med.toFixed(1), frameP95Ms: +r.p95.toFixed(1) }));
    await ctx.close();
  }
}
await browser.close();
