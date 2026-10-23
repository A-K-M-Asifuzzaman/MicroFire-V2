import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Operation Ignition (homepage opening film). Fresh storage: these tests are the first visit. A real GPU is requested
// so the film can play; where only software graphics exist the film correctly bows out and the film-only checks skip.
test.use({ storageState: { cookies: [], origins: [] }, launchOptions: { args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] } });
// One film at a time: parallel GPU browsers can push asset loading past the film's own 'too slow, go to the site' limit.
test.describe.configure({ mode: 'serial' });

const film = (page: Page) => page.locator('dialog#ignition');
const skip = (page: Page) => page.getByRole('button', { name: 'Skip intro' });
/** Counts live WebGL contexts and AudioContexts, and survives only within one document (a reload resets it). */
const probe = () => {
  const w = window as unknown as { __gl: number; __audio: number; __doc: number };
  w.__gl = 0; w.__audio = 0; w.__doc = Math.random();
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement & { __c?: 1 }, t: string, ...r: unknown[]) {
    const c = (orig as (...a: unknown[]) => unknown).call(this, t, ...r);
    if (c && /webgl/.test(t) && !this.__c) { this.__c = 1; w.__gl++; this.addEventListener('webglcontextlost', () => { w.__gl--; }); }
    return c;
  } as typeof orig;
  const A = window.AudioContext;
  if (A) window.AudioContext = class extends A { constructor(...a: ConstructorParameters<typeof AudioContext>) { super(...a); w.__audio++; } };
};
/** Waits for a story beat; false when the film could not play here (software graphics), so callers can skip. */
const reach = async (page: Page, beats: string) => {
  const sel = beats.split(',').map((b) => `dialog#ignition[data-beat="${b}"]`).join(', ');
  return page.locator(sel).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
};
const closed = async (page: Page) => {
  await expect(film(page)).not.toHaveAttribute('open', '', { timeout: 4000 });
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
  await expect(page.locator('#home-title')).toBeVisible();
};

test('first visit: the film opens before paint with Skip focused, plays its story, then lands on the working homepage without a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one full playthrough');
  test.setTimeout(45000);
  await page.addInitScript(probe);
  let loads = 0; page.on('load', () => { loads++; });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'play');
  await expect(film(page)).toHaveAttribute('open', '');
  await expect(skip(page)).toBeFocused();
  const doc = await page.evaluate(() => (window as unknown as { __doc: number }).__doc);
  test.skip(!(await reach(page, 'earth')), 'software graphics: the film bows out (covered by the fallback test)');
  await expect(page.getByRole('button', { name: 'Enter observatory' })).toBeVisible({ timeout: 15000 });
  await closed(page);
  // Every story beat fired, in order (logged by the film itself, so a slow frame cannot hide one).
  expect(await page.locator('html').getAttribute('data-ignition-beats')).toBe('earth,cabin,alert,pix,explain,holo,title,exit');
  await expect(page.locator('#main')).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { __doc: number }).__doc)).toBe(doc); // same document: no reload
  expect(loads).toBe(1);
  await page.getByRole('link', { name: /Open the B20 record/ }).click(); // the real site works straight away
  await expect(page).toHaveURL(/experiments\/bass2-b20/);
});

test('Skip before the first frame closes it at once and marks it seen', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await skip(page).click();
  await closed(page);
  expect(await page.evaluate(() => localStorage.getItem('microfire.ignition.v1'))).toBe('seen');
});

for (const [when, beats, how] of [['Earth departure', 'earth', 'click'], ['the emergency', 'alert', 'escape'], ['PIX activation', 'pix,explain', 'enter']] as const) {
  test(`Skip during ${when} (${how}) reveals the same homepage`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop timing');
    await page.goto('/');
    test.skip(!(await reach(page, beats)), 'software graphics: no film here');
    if (how === 'click') await skip(page).click();
    else if (how === 'escape') await page.keyboard.press('Escape');
    else { await skip(page).focus(); await page.keyboard.press('Enter'); }
    await closed(page);
  });
}

test('it never replays: not on client navigation back home, not after a refresh; Replay intro plays it on request', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop path');
  await page.goto('/');
  await skip(page).click(); await closed(page);
  await page.getByRole('link', { name: 'Explore the Experiment Atlas' }).click(); await expect(page).toHaveURL(/\/atlas/);
  await page.goBack(); await expect(page.locator('#home-title')).toBeVisible();
  await expect(film(page)).not.toHaveAttribute('open', '');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
  await expect(film(page)).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Replay intro' }).click();
  await expect(film(page)).toHaveAttribute('open', '');
  if (await reach(page, 'earth')) { await page.keyboard.press('Escape'); }
  await closed(page);
});

test('deep links and #fragments bypass the film', async ({ page }) => {
  await page.goto('/atlas');
  await expect(page.locator('dialog#ignition')).toHaveCount(0);
  await page.goto('/#gravity-lens');
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
  await expect(film(page)).not.toHaveAttribute('open', '');
});

test('reduced motion: no film, no Replay control, direct homepage', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/?intro=1');
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
  await expect(film(page)).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'Replay intro' })).toBeHidden();
  await ctx.close();
});

test('no WebGL: the film bows out within a moment and the homepage is usable', async ({ page }) => {
  await page.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, t: string, ...r: unknown[]) { return /webgl/.test(t) ? null : (o as (...a: unknown[]) => unknown).call(this, t, ...r); } as typeof o; });
  await page.goto('/');
  await closed(page);
  await expect(page.getByRole('link', { name: /Open the B20 record/ })).toBeVisible();
});

test('asset failure: a progress bar shows while loading; if the astronaut cannot load, the visitor goes straight to the site and the film is not marked seen', async ({ page }) => {
  await page.route('**/models/astronaut-suit/**', async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.abort(); });
  await page.goto('/');
  if (await page.locator('html[data-ignition="play"]').count()) await expect(page.getByRole('progressbar', { name: 'Loading the opening film' })).toBeVisible();
  await closed(page);
  expect(await page.evaluate(() => localStorage.getItem('microfire.ignition.v1'))).toBeNull();
});

test('keyboard and screen readers: named dialog with a description, Skip first, Tab reaches Sound, captions are live, no axe violations', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop path');
  await page.goto('/');
  const d = film(page);
  await expect(d).toHaveAccessibleName('MicroFire opening film');
  await expect(d).toHaveAccessibleDescription(/fictional .*not a real NASA incident/);
  await expect(skip(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: /^Sound (off|on)$/ })).toBeFocused();
  if (await reach(page, 'earth,cabin')) await expect(page.locator('.ign-caption')).toHaveAttribute('aria-live', 'polite');
  const scan = await new AxeBuilder({ page }).include('dialog#ignition').analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await closed(page);
});

test('sound is off by default: no audio context is created until the visitor asks', async ({ page }) => {
  await page.addInitScript(probe);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __audio: number }).__audio)).toBe(0);
  await skip(page).click(); await closed(page);
});

test('no retained WebGL context: after the film, the page holds no more contexts than a visit without it', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop path');
  test.setTimeout(45000);
  const base = await browser.newContext({ storageState: 'tests/ignition-seen.json' });
  const b = await base.newPage(); await b.addInitScript(probe); await b.goto('/'); await b.waitForTimeout(4000);
  const without = await b.evaluate(() => (window as unknown as { __gl: number }).__gl); await base.close();
  await page.addInitScript(probe);
  await page.goto('/');
  if (await reach(page, 'pix')) await page.keyboard.press('Escape');
  await closed(page); await page.waitForTimeout(4000);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBeLessThanOrEqual(without);
});

// ---- Lifecycle ownership (Astra P2: a Skip/Replay race leaked a detached film renderer) ----
/**
 * Real resource instrumentation: every WebGL context (created inside the film or not, lost or live), every
 * requestAnimationFrame call (so surviving render loops are counted per frame), every AudioContext and every
 * unhandled rejection.
 */
const instrument = () => {
  type Rec = { canvas: HTMLCanvasElement; lost: boolean; film: boolean };
  const w = window as unknown as { __ctx: Rec[]; __raf: number; __rafOrig: typeof requestAnimationFrame; __ac: AudioContext[]; __rej: string[] };
  w.__ctx = []; w.__raf = 0; w.__ac = []; w.__rej = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement & { __r?: Rec }, t: string, ...r: unknown[]) {
    const c = (orig as (...a: unknown[]) => unknown).call(this, t, ...r);
    if (c && /webgl/.test(t) && !this.__r) { const rec: Rec = { canvas: this, lost: false, film: !!this.closest('#ignition') }; this.__r = rec; w.__ctx.push(rec); this.addEventListener('webglcontextlost', () => { rec.lost = true; }); }
    return c;
  } as typeof orig;
  w.__rafOrig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { w.__raf++; return w.__rafOrig(cb); };
  const A = window.AudioContext;
  if (A) window.AudioContext = class extends A { constructor(...a: ConstructorParameters<typeof AudioContext>) { super(...a); w.__ac.push(this); } };
  window.addEventListener('unhandledrejection', (e) => { w.__rej.push(String(e.reason)); });
};
type Probe = { liveFilm: number; detachedLiveFilm: number; openAudio: number; rejections: string[]; run: string | undefined };
const probeState = (page: Page) => page.evaluate((): Probe => {
  const w = window as unknown as { __ctx: { canvas: HTMLCanvasElement; lost: boolean; film: boolean }[]; __ac: AudioContext[]; __rej: string[] };
  const live = w.__ctx.filter((x) => x.film && !x.lost);
  return { liveFilm: live.length, detachedLiveFilm: live.filter((x) => !x.canvas.isConnected).length, openAudio: w.__ac.filter((a) => a.state !== 'closed').length, rejections: w.__rej, run: document.documentElement.dataset.ignitionRun };
});
/** Animation loops alive right now: app requestAnimationFrame calls per frame, over 60 frames (our counter uses the original). */
const loopsPerFrame = (page: Page) => page.evaluate(() => new Promise<number>((done) => {
  const w = window as unknown as { __raf: number; __rafOrig: typeof requestAnimationFrame };
  const start = w.__raf; let frames = 0;
  const tick = () => { if (++frames < 60) w.__rafOrig(tick); else done((w.__raf - start) / frames); };
  w.__rafOrig(tick);
}));
/** Holds the first astronaut.gltf request (the film's model load) until released. */
const holdFirstModelLoad = async (page: Page) => {
  let release!: () => void, arrived = false; const gate = new Promise<void>((r) => { release = r; });
  let first = true;
  await page.route('**/models/astronaut-suit/astronaut.gltf', async (r) => { if (first) { first = false; arrived = true; await gate; } await r.continue().catch(() => {}); });
  return { release: () => release(), arrived: async () => { await expect.poll(() => arrived, { timeout: 15000 }).toBe(true); } };
};
/** Loops of a homepage that never played the film: the reference the race must return to. */
const baselineLoops = async (browser: import('@playwright/test').Browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: 'tests/ignition-seen.json' });
  const p = await ctx.newPage(); await p.addInitScript(instrument); await p.goto('/'); await p.waitForTimeout(3000);
  const n = await loopsPerFrame(p); await ctx.close(); return n;
};

test('race (Astra reproduction, ×3): Skip during a held model load, Replay, release the old load, Skip again — no old renderer, loop or timer survives', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'GPU lifecycle: desktop project');
  test.setTimeout(150000);
  const base = await baselineLoops(browser);
  await page.addInitScript(instrument);
  for (let i = 1; i <= 3; i++) {
    await page.unroute('**/models/astronaut-suit/astronaut.gltf');
    const hold = await holdFirstModelLoad(page);
    await page.goto('/?intro=1');
    await hold.arrived(); // run 1 now owns a renderer and waits for its models
    expect((await probeState(page)).liveFilm, 'run 1 renderer exists while loading').toBe(1);
    await skip(page).click(); await closed(page);
    // Skip invalidates run 1 at once: its pending start disposes its renderer without waiting for the download.
    await expect.poll(async () => (await probeState(page)).liveFilm, { message: 'run 1 released on Skip' }).toBe(0);
    await page.getByRole('button', { name: 'Replay intro' }).click();
    await page.waitForTimeout(500);
    hold.release(); // the old request completes now; it must not revive run 1 or touch run 2
    if (!(await reach(page, 'earth'))) test.skip(true, 'software graphics: no film here');
    const during = await probeState(page);
    expect(during.run, 'replay is a new lifecycle').toBe('2');
    expect(during.liveFilm, 'only run 2 owns a film renderer').toBe(1);
    expect(during.detachedLiveFilm, 'no detached film renderer').toBe(0);
    expect(await page.locator('html').getAttribute('data-ignition-beats'), 'run 2 beat log starts clean').toMatch(/^earth/);
    await skip(page).click(); await closed(page); // Skip still works immediately
    await page.waitForTimeout(8500); // beyond the old film's full running time: a stale onEnd/close timer would act here
    const after = await probeState(page);
    expect(after.liveFilm, `iteration ${i}: film WebGL contexts left`).toBe(0);
    expect(after.openAudio).toBe(0);
    expect(after.rejections).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
    await expect(film(page)).not.toHaveAttribute('open', '');
    expect(await loopsPerFrame(page), `iteration ${i}: animation loops vs a homepage without the film (${base})`).toBeLessThanOrEqual(base + 0.25);
  }
  await page.getByRole('link', { name: /Open the B20 record/ }).click(); // the homepage stays interactive
  await expect(page).toHaveURL(/experiments\/bass2-b20/);
});

test('race: after a stale load is released, the replay still plays its whole story and ends itself (no stale end or close timer cuts it)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'GPU lifecycle: desktop project');
  test.setTimeout(60000);
  await page.addInitScript(instrument);
  const hold = await holdFirstModelLoad(page);
  await page.goto('/?intro=1');
  await hold.arrived();
  await skip(page).click(); await closed(page);
  await page.getByRole('button', { name: 'Replay intro' }).click();
  hold.release();
  test.skip(!(await reach(page, 'earth')), 'software graphics: no film here');
  await expect(page.getByRole('button', { name: 'Enter observatory' })).toBeVisible({ timeout: 15000 });
  await closed(page);
  expect(await page.locator('html').getAttribute('data-ignition-beats')).toBe('earth,cabin,alert,pix,explain,holo,title,exit');
  await expect(page.locator('#main')).toBeFocused();
  const s = await probeState(page);
  expect(s.liveFilm).toBe(0); expect(s.rejections).toEqual([]);
});

test('race: a replay started inside the Skip crossfade keeps the dialog (the old fade timer cannot close the new run)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'GPU lifecycle: desktop project');
  await page.addInitScript(instrument);
  await page.goto('/?intro=1');
  test.skip(!(await reach(page, 'earth')), 'software graphics: no film here');
  // Skip, then a replay request 50 ms later, inside the 280 ms crossfade (dispatched: the Replay button is behind the modal).
  await page.evaluate(async () => { document.getElementById('ignition-skip')!.click(); await new Promise((r) => setTimeout(r, 50)); document.dispatchEvent(new Event('ignition:replay')); });
  await page.waitForTimeout(900); // well past the old 280 ms finish
  await expect(film(page)).toHaveAttribute('open', '');
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'play');
  expect((await probeState(page)).run).toBe('2');
  await expect(film(page)).not.toHaveAttribute('data-leaving', '');
  expect(await reach(page, 'earth,cabin')).toBe(true);
  expect((await probeState(page)).liveFilm, 'the faded run released its renderer').toBe(1);
  await page.keyboard.press('Escape'); await closed(page);
  expect((await probeState(page)).liveFilm).toBe(0);
});

test('rapid Skip/Replay ×8 (during loading and during play): one owner at a time, nothing left behind, Replay still works', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'GPU lifecycle: desktop project');
  test.setTimeout(120000);
  const base = await baselineLoops(browser);
  await page.addInitScript(instrument);
  await page.goto('/?intro=0'); // homepage without the film; every run below comes from Replay
  await expect(page.locator('#home-title')).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'Replay intro' }).click();
    await page.waitForTimeout([0, 60, 150, 400, 900, 1600, 30, 2500][i]!); // loading, first frame and mid-story
    expect((await probeState(page)).liveFilm, `cycle ${i}: at most one live film renderer`).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape'); await closed(page);
  }
  await page.waitForTimeout(1000);
  const s = await probeState(page);
  expect(s.liveFilm).toBe(0); expect(s.openAudio).toBe(0); expect(s.rejections).toEqual([]);
  expect(Number(s.run)).toBe(8);
  expect(await loopsPerFrame(page)).toBeLessThanOrEqual(base + 0.25);
  await page.getByRole('button', { name: 'Replay intro' }).click(); // and it still plays
  if (await reach(page, 'earth')) { await page.keyboard.press('Escape'); }
  await closed(page);
});

test('loading-time navigation away (unmount) releases the pending run and does not replay on return', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'GPU lifecycle: desktop project');
  test.setTimeout(60000);
  await page.addInitScript(instrument);
  await page.goto('/atlas?intro=0');
  await page.getByRole('link', { name: /MicroFire, the Living Science Observatory — home/ }).click(); // client navigation to /
  await expect(page.locator('#home-title')).toBeVisible();
  const hold = await holdFirstModelLoad(page);
  await page.getByRole('button', { name: 'Replay intro' }).click();
  await hold.arrived();
  expect((await probeState(page)).liveFilm).toBe(1);
  await page.goBack(); // Back to /atlas while the film is loading: the film component unmounts
  await expect(page).toHaveURL(/\/atlas/);
  await expect.poll(async () => (await probeState(page)).liveFilm, { message: 'unmount released the renderer' }).toBe(0);
  hold.release(); await page.waitForTimeout(1500);
  const s = await probeState(page);
  expect(s.liveFilm).toBe(0); expect(s.rejections).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-ignition', 'off');
  await page.goForward(); await expect(page.locator('#home-title')).toBeVisible();
  await expect(film(page)).not.toHaveAttribute('open', ''); // no surprise replay
});

test('sound state: turning sound on, then Skip and Replay, starts the new run muted and closes the old audio', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop path');
  await page.addInitScript(instrument);
  await page.goto('/?intro=1');
  test.skip(!(await reach(page, 'earth')), 'software graphics: no film here');
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toHaveAttribute('aria-pressed', 'true');
  expect((await probeState(page)).openAudio).toBe(1);
  await page.keyboard.press('Escape'); await closed(page);
  await expect.poll(async () => (await probeState(page)).openAudio).toBe(0);
  await page.getByRole('button', { name: 'Replay intro' }).click();
  await expect(page.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'false');
  if (await reach(page, 'earth')) expect((await probeState(page)).openAudio, 'the replay is muted: no new audio').toBe(0);
  await page.keyboard.press('Escape'); await closed(page);
});

test('phones: controls are large, nothing overflows, and Skip stays reachable', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone layout');
  await page.goto('/');
  for (const name of ['Skip intro', 'Sound off']) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await skip(page).tap();
  await closed(page);
});
