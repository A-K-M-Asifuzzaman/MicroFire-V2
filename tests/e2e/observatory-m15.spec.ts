import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// M1.5: observatory scene, deferred-fix regressions (A offscreen, C focus, D Retry-After, E axe, F 404) and new exhibits.
// The shared 3217 server's real-POST budget is already used by other specs, so every POST here is mocked or oracle-served.
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `docs/qa/screenshots/m1.5/after/test-${name}-${project}.jpg`, fullPage: true, quality: 70 });
const envelope = (data: unknown) => ({ json: { apiVersion: '1', data } });
const science = (fn: string, input: unknown): unknown => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'tests/e2e/science-oracle.ts', fn, JSON.stringify(input)], { encoding: 'utf8' }));
async function scienceBackedPosts(page: Page) {
  await page.route('**/api/ask', (r) => r.fulfill(envelope(science('ask', r.request().postDataJSON()))));
  await page.route('**/api/evidence/rank', (r) => r.fulfill(envelope(science('rank', r.request().postDataJSON()))));
}
/** Counts real WebGL draw calls from any context. */
const countDraws = () => {
  const w = window as unknown as { __draws: number };
  w.__draws = 0;
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...a: unknown[]) => unknown>[]) {
    for (const name of ['drawArrays', 'drawElements']) {
      const original = proto[name]!;
      proto[name] = function (this: unknown, ...args: unknown[]) { w.__draws++; return original.apply(this, args); };
    }
  }
};
const drawsDuring = async (page: Page, ms: number) => {
  const before = await page.evaluate(() => (window as unknown as { __draws: number }).__draws);
  await page.waitForTimeout(ms);
  return (await page.evaluate(() => (window as unknown as { __draws: number }).__draws)) - before;
};

test('home: six real stations, focus link-up and honest labelling (Design B)', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByText('Gravity Lens · educational illustration, not NASA footage or data')).toBeVisible();
  await expect(page.locator('.home-window-tag')).toHaveText('Illustration');
  const stations = page.getByRole('navigation', { name: 'Research stations' }).getByRole('link');
  await expect(stations).toHaveCount(6);
  const hrefs = await stations.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs).toEqual(['/atlas', '/experiments/bass2-b20', '/dashboard', '/ask', '/gaps', '/missions']);
  await stations.nth(1).focus();
  await expect(stations.nth(1)).toHaveAttribute('data-focus', 'true');
  await expect(page.locator('.home-balloon')).toHaveAttribute('data-mood', 'cite'); // PIX speaks for the focused station
  await page.getByRole('radio', { name: 'Earth 1 g' }).check();
  await expect(page.locator('figure.lens')).toHaveAttribute('data-gravity', 'earth');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `docs/qa/screenshots/m1.5/after/test-home-earth-${info.project.name}.jpg`, quality: 70 });
  // Navigating from a station moves focus to the destination heading (fix C).
  await stations.nth(0).press('Enter');
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'A library of real flames.' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('home without WebGL: the static lens and every station still work', async ({ browser }) => {
  const noGl = await browser.newContext();
  const p = await noGl.newPage();
  await p.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : original.apply(this, [type, ...rest] as never);
    } as typeof original;
  });
  await p.goto('http://127.0.0.1:3217/');
  await expect(p.locator('figure.lens')).toHaveAttribute('data-renderer', 'svg');
  await p.getByText('About this illustration').click();
  await expect(p.getByTestId('lens-renderer')).toHaveText('WebGL unavailable · static illustration shown');
  await expect(p.getByRole('navigation', { name: 'Research stations' }).getByRole('link')).toHaveCount(6);
  await p.getByRole('radio', { name: 'Earth 1 g' }).check();
  await expect(p.locator('figure.lens')).toHaveAttribute('data-gravity', 'earth');
  await noGl.close();
});

test('fix A: an initially offscreen lens does not render continuously; visibility drives motion', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 600 } });
  const page = await ctx.newPage();
  await page.addInitScript(countDraws);
  // Test-only CSS spacer (hydration-proof) pushes the whole hero below the viewport before any app script runs.
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style'); style.textContent = 'main { padding-top: 2400px !important; }'; document.head.append(style);
  }));
  await page.goto('http://127.0.0.1:3217/');
  await expect(page.locator('figure.lens')).toHaveAttribute('data-renderer', 'webgl');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.querySelector('figure.lens')!.getBoundingClientRect().top > innerHeight)).toBe(true);
  expect(await drawsDuring(page, 1000)).toBeLessThanOrEqual(2);
  await page.locator('figure.lens').scrollIntoViewIfNeeded();
  expect(await drawsDuring(page, 1000)).toBeGreaterThan(20);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300);
  expect(await drawsDuring(page, 1000)).toBeLessThanOrEqual(2);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await drawsDuring(page, 1000)).toBeGreaterThan(20);
  await ctx.close();
});

test('fix D: Retry waits for Retry-After and keeps the original request', async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route('**/api/ask', (r) => { bodies.push(r.request().postDataJSON()); return r.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { apiVersion: '1', error: { code: 'RATE_LIMITED', message: 'Local request budget reached; retry after the indicated delay.', retryable: true } } }); });
  await page.goto('/ask');
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  const retry = page.getByTestId('retry');
  await expect(retry).toBeDisabled();
  await expect(retry).toHaveText(/Retry available in [12] s/);
  await expect(page.getByTestId('pix-panel').locator('svg')).toHaveAttribute('data-state', 'error');
  await expect(retry).toBeEnabled({ timeout: 4000 });
  await expect(retry).toHaveText('Retry');
  await retry.click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toEqual(bodies[0]);
});

test('fix F: missing records and routes return real 404s; real pages and the API are unchanged', async ({ request }) => {
  for (const path of ['/experiments/constructor', '/experiments/bass2-b16', '/experiments/bass2-b999', '/constructor', '/missions/nope', '/experiments'])
    expect((await request.get(path)).status(), path).toBe(404);
  for (const path of ['/', '/atlas', '/experiments/bass2-b20', '/sources', '/assets', '/missions/bass-assembly'])
    expect((await request.get(path)).status(), path).toBe(200);
  expect((await request.get('/api/experiments/bass2-b16')).status()).toBe(404);
  expect((await request.get('/experiments/constructor')).headers()['content-type']).toContain('text/html');
});

test('route-level loading: no regular page downloads the 3D engine; only the training bay does', async ({ page }) => {
  test.setTimeout(120_000); // fetches and inspects every script on eight routes (slow on shared CI runners)
  const scripts: string[] = [], seen = new Map<string, Promise<string>>();
  page.on('response', (r) => { if (r.url().endsWith('.js')) scripts.push(r.url()); });
  const threeIn = async (path: string) => {
    scripts.length = 0;
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const bodies = await Promise.all(scripts.map((u) => { if (!seen.has(u)) seen.set(u, page.request.get(u).then((r) => r.text())); return seen.get(u)!; }));
    return bodies.some((b) => b.includes('WebGLRenderer'));
  };
  // Design B: the homepage flame is a small raw-WebGL shader and PIX is an illustration, so neither needs three.js.
  for (const path of ['/', '/atlas', '/experiments/bass2-b20', '/dashboard', '/gaps', '/ask', '/methodology']) expect(await threeIn(path), path).toBe(false);
  expect(await threeIn('/missions/bass-assembly/tour')).toBe(true);
});

test('B20 exhibit: apparatus annotations separate sourced hardware, recorded conditions and unknowns', async ({ page }, info) => {
  await page.goto('/experiments/bass2-b20');
  await expect(page.getByText('17.4 vol%').first()).toBeVisible();
  const parts = page.getByRole('list', { name: 'Apparatus parts and run conditions' });
  await parts.getByRole('button', { name: /Calibrated oxygen: 17.4 vol%/ }).click();
  const detail = page.getByTestId('apparatus-detail');
  await expect(detail).toContainText('Recorded for this run');
  await expect(detail.getByRole('link', { name: /PDF page 112/ })).toBeVisible();
  await expect(page.locator('tr[data-cond="oxygenPct"]')).toHaveAttribute('data-highlight', 'true');
  await parts.getByRole('button', { name: /Pressure: not recorded/ }).click();
  await expect(detail).toContainText('Not recorded');
  await expect(page.locator('tr[data-cond="pressureKpa"]')).toHaveAttribute('data-highlight', 'true');
  await parts.getByRole('button', { name: /Flow duct/ }).click();
  await expect(detail).toContainText('Described in the source');
  await expect(detail).toContainText('7.6 × 7.6 × 17 cm');
  await expect(detail.getByRole('link', { name: /PDF page 12 / })).toHaveAttribute('href', /#page=12$/);
  await expect(page.getByText(/only the duct's 7.6 × 17 cm side proportion is sourced/)).toBeVisible();
  await expect(page.getByText('16.5 vol%')).toHaveCount(0);
  await shot(page, 'dossier', info.project.name);
});

test('Atlas exhibit, corpus strip and Workstation chain rail stay honest', async ({ page }, info) => {
  await scienceBackedPosts(page);
  await page.goto('/atlas');
  await expect(page.locator('.corpus-cells i')).toHaveCount(56);
  await expect(page.locator('.corpus-cells i[data-admitted]')).toHaveCount(1);
  await expect(page.getByTestId('atlas-exhibit')).toHaveCount(1);
  await page.getByText(/Why only one record/).click();
  await expect(page.getByText(/never searchable, answerable, comparable or exportable/)).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'What does airflow change? (PMMA)' }).click();
  const rail = page.getByTestId('chain-rail');
  await expect(rail.locator('li').nth(3)).toHaveAttribute('data-state', 'warn');
  await expect(rail.locator('li').nth(3)).toContainText('Not established');
  await expect(rail.locator('li').nth(5)).toContainText('None for this outcome');
  await page.getByRole('button', { name: /recorded B20 observation/ }).click();
  await expect(rail.locator('li').nth(3)).toHaveAttribute('data-state', 'lit');
  await expect(rail.locator('li').nth(5)).toHaveAttribute('data-state', 'lit');
  await shot(page, 'workstation', info.project.name);
});

test('PIX interface states follow the deterministic API (no new abilities)', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  await page.route('**/api/ask', async (r) => { if (r.request().postDataJSON().question === 'What happened in B19?') await gate; await r.fulfill(envelope(science('ask', r.request().postDataJSON()))); });
  await page.goto('/ask');
  const avatar = page.getByTestId('pix-panel').locator('svg');
  await expect(avatar).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  await expect(avatar).toHaveAttribute('data-state', 'searching');
  release();
  await expect(avatar).toHaveAttribute('data-state', 'abstained');
  await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click();
  await expect(avatar).toHaveAttribute('data-state', 'cited');
  await expect(page.getByTestId('pix-panel')).toContainText('no AI model');
});

test('fix C: keyboard navigation from the mobile menu lands on the destination heading', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Mobile menu only');
  await page.goto('/sources');
  await page.getByText('Menu').click();
  const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Experiments' });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'A library of real flames.' })).toBeFocused();
  await expect(page.locator('details.mobile-nav')).not.toHaveAttribute('open', '');
});

test('fix E: no automated axe violations (WCAG 2.x A/AA) on core routes', async ({ page }, info) => {
  test.setTimeout(120_000); // a full axe scan on 13 routes (about 33 s on shared CI runners)
  await scienceBackedPosts(page);
  const results: Record<string, string[]> = {};
  for (const path of ['/', '/atlas', '/experiments/bass2-b20', '/ask', '/dashboard', '/gaps', '/compare', '/passport', '/sources', '/methodology', '/missions', '/missions/bass-assembly', '/roadmap']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    if (path === '/ask') { await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click(); await page.getByTestId('pix-answer').waitFor(); }
    if (path === '/dashboard') { await page.getByRole('button', { name: /recorded B20 observation/ }).click(); await page.getByTestId('chain-rail').waitFor(); }
    await page.waitForTimeout(400);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const v = axe.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    if (v.length) results[path] = v;
  }
  if (Object.keys(results).length) console.log(info.project.name, JSON.stringify(results, null, 1));
  expect(results).toEqual({});
});

test('native cursor and selection: text can be selected and every control still works', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse');
  await page.goto('/');
  await expect(page.locator('.cursor-fx')).toHaveCount(0);
  const lede = page.locator('.home-copy .lede');
  await lede.click({ clickCount: 3 });
  expect((await page.evaluate(() => getSelection()?.toString() ?? '')).length).toBeGreaterThan(20);
  await page.getByRole('radio', { name: 'Earth 1 g' }).check();
  await expect(page.locator('figure.lens')).toHaveAttribute('data-gravity', 'earth');
  await page.goto('/ask');
  const box = page.locator('#pix-q');
  await box.click(); await box.fill('Does typing work?');
  await expect(box).toHaveValue('Does typing work?');
  await page.getByRole('link', { name: 'Methodology' }).first().click();
  await expect(page).toHaveURL(/\/methodology$/);
});
