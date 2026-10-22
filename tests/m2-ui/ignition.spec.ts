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
