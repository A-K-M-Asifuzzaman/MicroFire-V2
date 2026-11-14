import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { ExportResponseSchema } from '@microfire/shared';
import { execFileSync } from 'node:child_process';

// M1 Living Science Observatory UI. Screenshots land in docs/qa/screenshots/m1.
// The API allows 30 POSTs per minute per server process and the existing specs use 26, so only three UI POSTs here
// go over real HTTP (marked REAL). Other POSTs are answered in-test by the same deterministic @microfire/science
// functions the API calls; the UI still parses them with the shared v1 schemas. HTTP behaviour is covered in science-api.spec.ts.
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `docs/qa/screenshots/m1/${name}-${project}.png`, fullPage: true });
const envelope = (data: unknown) => ({ json: { apiVersion: '1', data } });
const science = (fn: string, input: unknown): unknown => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'tests/e2e/science-oracle.ts', fn, JSON.stringify(input)], { encoding: 'utf8' }));
async function scienceBackedPosts(page: Page) {
  await page.route('**/api/ask', (r) => r.fulfill(envelope(science('ask', r.request().postDataJSON()))));
  await page.route('**/api/intelligence', (r) => r.fulfill(envelope(science('intelligence', r.request().postDataJSON()))));
  await page.route('**/api/evidence/rank', (r) => r.fulfill(envelope(science('rank', r.request().postDataJSON()))));
  await page.route('**/api/gaps', (r) => r.fulfill(envelope(science('gaps', r.request().postDataJSON()))));
}
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('research journey: home → atlas search → B20 dossier → source → export → Ask PIX (REAL) → methodology', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Fire, without the weight of gravity.' })).toBeVisible();
  await expect(page.getByText('educational illustration', { exact: false })).toBeVisible();
  await shot(page, 'home', info.project.name);

  await page.getByRole('link', { name: 'Explore the Experiment Atlas' }).click();
  await expect(page).toHaveURL(/\/atlas$/);
  await page.getByLabel('Search terms').fill('PMMA opposed');
  const search = page.waitForResponse((r) => r.url().includes('/api/experiments?') && r.status() === 200);
  await page.getByRole('button', { name: 'Search' }).click();
  await search;
  await expect(page).toHaveURL(/q=PMMA\+opposed/);
  await expect(page.getByText('1 admitted record match')).toBeVisible();
  await page.getByLabel('Material').selectOption('PMMA');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('55 legacy candidates quarantined').first()).toBeVisible();
  await shot(page, 'atlas', info.project.name);

  await page.getByRole('link', { name: 'B20 — opposed-flow PMMA film' }).click();
  await expect(page.getByRole('heading', { name: 'Documented observation' })).toBeVisible();
  await expect(page.getByText('17.4 vol%').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Unknown' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'It cannot support' })).toBeVisible();
  await expect(page.getByText('This record cannot establish lunar fire safety or isolate airflow causation.').first()).toBeVisible();
  const source = page.getByRole('link', { name: /Table A\.1.*PDF page 112/ }).first();
  await expect(source).toHaveAttribute('href', /TM-20210011385\.pdf#page=112$/);
  await expect(source).toHaveAttribute('rel', /noopener/);
  await shot(page, 'dossier', info.project.name);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence JSON' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('microfire-bass2-b20-evidence.json');
  const exported = ExportResponseSchema.shape.data.parse(JSON.parse(await readFile((await file.path())!, 'utf8')));
  expect(exported.records[0]!.experiment.conditions.oxygenPct.value).toBe(17.4);
  await expect(page.getByText(/Pinned to catalog SHA-256/)).toBeVisible();

  await page.goto('/ask');
  await page.getByLabel('Your research question').fill('What does B20 establish about airflow?');
  await page.getByRole('button', { name: 'Ask PIX', exact: true }).click(); // REAL HTTP
  const answer = page.getByTestId('pix-answer');
  await expect(answer).toBeVisible();
  await expect(answer.getByText('Direct observation').first()).toBeVisible();
  await expect(answer.getByRole('link', { name: /PDF page 112/ }).first()).toHaveAttribute('href', /#page=112$/);
  await expect(answer.getByText('Limits of this evidence')).toBeVisible();
  await expect(page.getByText('no AI model was used', { exact: false })).toBeVisible();
  await shot(page, 'ask-answer', info.project.name);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: 'Five kinds of statement' })).toBeVisible();
  await expect(page.getByText('not yet implemented')).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('navigation: active section indicators and the mobile menu', async ({ page }, info) => {
  await page.goto('/sources');
  if (info.project.name === 'mobile') {
    await page.getByText('Menu').click();
    const menu = page.getByRole('navigation', { name: 'Main' });
    await expect(menu.getByRole('link', { name: 'Evidence' })).toHaveAttribute('aria-current', 'page');
    await shot(page, 'mobile-menu', info.project.name);
    await menu.getByRole('link', { name: 'Experiments' }).click();
    await expect(page).toHaveURL(/\/atlas$/);
    await expect(page.locator('details.mobile-nav')).not.toHaveAttribute('open', '');
  } else {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Evidence' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Evidence tools' }).getByRole('link', { name: 'Sources' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Missions' }).click();
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Missions' })).toHaveAttribute('aria-current', 'page');
  }
});

test('keyboard: skip link and Gravity Lens controls', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const lens = page.locator('figure.lens');
  await expect(lens).toHaveAttribute('data-gravity', 'micro');
  await page.getByRole('slider', { name: /Illustrative gravity/ }).focus();
  await page.keyboard.press('End');
  await expect(lens).toHaveAttribute('data-gravity', 'earth');
  await expect(page.getByRole('heading', { name: 'Earth illustration (1 g)' })).toBeVisible();
  await page.getByRole('radio', { name: 'Microgravity' }).focus();
  await page.keyboard.press('Space');
  await expect(lens).toHaveAttribute('data-gravity', 'micro');
});

test('reduced motion and missing WebGL keep a meaningful static lens', async ({ browser }, info) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3217/');
  await expect(page.getByTestId('lens-renderer')).not.toHaveText('Static illustration');
  if (await page.locator('figure.lens').getAttribute('data-renderer') === 'webgl')
    await expect(page.getByRole('button', { name: 'Play flicker' })).toHaveAttribute('aria-pressed', 'false');
  await context.close();

  const noGl = await browser.newContext({ viewport: info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const p2 = await noGl.newPage();
  await p2.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : original.apply(this, [type, ...rest] as never);
    } as typeof original;
  });
  await p2.goto('http://127.0.0.1:3217/');
  await expect(p2.getByTestId('lens-renderer')).toHaveText('WebGL unavailable · static illustration shown');
  await expect(p2.locator('figure.lens')).toHaveAttribute('data-renderer', 'svg');
  await p2.getByRole('radio', { name: 'Earth 1 g' }).check();
  await expect(p2.getByRole('img', { name: /tall teardrop/ })).toBeVisible();
  await p2.screenshot({ path: `docs/qa/screenshots/m1/home-no-webgl-${info.project.name}.png` });
  await p2.goto('http://127.0.0.1:3217/experiments/bass2-b20');
  await expect(p2.getByRole('heading', { name: 'Documented observation' })).toBeVisible();
  await noGl.close();
});

test('Ask PIX: abstentions, quarantined references and failures are never shown as answers', async ({ page }, info) => {
  await scienceBackedPosts(page);
  await page.goto('/ask');
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  const abstention = page.getByTestId('pix-abstention');
  await expect(abstention.getByRole('heading', { name: 'That record is quarantined' })).toBeVisible();
  await expect(page.getByTestId('pix-answer')).toHaveCount(0);
  await shot(page, 'ask-abstention', info.project.name);

  await page.getByRole('button', { name: 'Can this certify a lunar habitat?' }).click();
  await expect(abstention.getByRole('heading', { name: 'Outside what this evidence can support' })).toBeVisible();

  await page.getByRole('button', { name: 'What is the flame temperature in B20?' }).click();
  await expect(page.getByTestId('pix-answer').getByText('Unknown or gap')).toBeVisible();

  const repeated = 'B16 '.repeat(999).trim();
  await page.getByLabel('Your research question').fill(repeated);
  await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
  await expect(abstention.getByRole('heading', { name: 'That record is quarantined' })).toBeVisible();
  await expect(page.getByText(/\(3995 characters\)/)).toBeVisible();
  expect(await noOverflow(page)).toBe(true);

  await page.unroute('**/api/{ask,intelligence}');
  await page.route('**/api/{ask,intelligence}', (r) => r.fulfill({ status: 429, headers: { 'Retry-After': '42' }, json: { apiVersion: '1', error: { code: 'RATE_LIMITED', message: 'Local request budget reached; retry after the indicated delay.', retryable: true } } }));
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('Retry in about 42 s');

  await page.unroute('**/api/{ask,intelligence}');
  await page.route('**/api/{ask,intelligence}', (r) => r.fulfill(envelope({ abstained: false, answer: 'Invented', statements: [], claimIds: [], citations: [], limitations: [] })));
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('did not match the evidence contract');
  await expect(page.getByText('Invented')).toHaveCount(0);

  await page.unroute('**/api/{ask,intelligence}');
  await page.route('**/api/{ask,intelligence}', (r) => r.abort());
  await page.getByRole('button', { name: 'What happened in B19?' }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('could not be reached');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('atlas empty, loading failure and retry states', async ({ page }) => {
  await page.goto('/atlas?q=cotton');
  await expect(page.getByText('No admitted record matches.')).toBeVisible();
  await page.route('**/api/experiments?**', (r) => r.abort());
  await page.getByLabel('Search terms').fill('PMMA');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('could not be reached');
  await page.unroute('**/api/experiments?**');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('link', { name: 'B20 — opposed-flow PMMA film' })).toBeVisible();
});

test('workstation, frontier and comparison keep support, gaps and refusals explicit', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Same components as desktop; mobile layout covered by screenshots');
  await scienceBackedPosts(page);
  await page.route('**/api/evidence/compare', (r) => r.fulfill({ status: 404, json: { apiVersion: '1', error: { code: 'NOT_FOUND', message: 'bass2-b19 is a quarantined legacy candidate pending primary-source review, not validated evidence.', retryable: false } } }));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'What does airflow change? (PMMA)' }).click();
  await expect(page.getByText('Support not established').first()).toBeVisible();
  await expect(page.getByText(/not fire risk, safety or scientific confidence/).first()).toBeVisible();
  await page.getByRole('button', { name: /recorded B20 observation/ }).click();
  await expect(page.getByText('Observed', { exact: true }).nth(0)).toBeVisible();
  await expect(page.getByRole('link', { name: /PDF page 112/ }).first()).toBeVisible();
  await shot(page, 'workstation', info.project.name);

  await page.goto('/gaps');
  await page.getByRole('button', { name: 'Load example' }).click();
  const pressure = page.getByRole('row', { name: /Pressure/ });
  await expect(pressure.getByRole('cell', { name: /Not recorded/ })).toBeVisible();
  await expect(page.getByText('Not found in our validated catalog is not the same as never studied globally.')).toBeVisible();
  await shot(page, 'frontier', info.project.name);

  await page.goto('/compare');
  await expect(page.getByText('Record B · none admitted')).toBeVisible();
  await page.getByRole('button', { name: /Request comparison/ }).click();
  await expect(page.getByText('Comparison refused by the evidence service.')).toBeVisible();
  // The record-to-record request shows no table; the studio's illustration tables above are labelled toy/engine views.
  await expect(page.getByTestId('compare-probe').locator('table')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="cs-rec-h"] table')).toHaveCount(0);
  await shot(page, 'compare', info.project.name);
});

test('F4: WebGL context loss restores the SVG flame; restoration re-enables WebGL with current controls', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const lens = page.locator('figure.lens');
  await expect(lens).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('radio', { name: 'Earth 1 g' }).check();
  await page.evaluate(() => { (window as unknown as { __lose: WEBGL_lose_context }).__lose = document.querySelector('canvas')!.getContext('webgl')!.getExtension('WEBGL_lose_context')!; (window as unknown as { __lose: WEBGL_lose_context }).__lose.loseContext(); });
  await expect(lens).toHaveAttribute('data-renderer', 'svg');
  await expect(page.getByTestId('lens-renderer')).toHaveText('WebGL interrupted · static illustration shown');
  await expect(page.locator('.lens-flame')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('img', { name: /tall teardrop/ })).toBeVisible();
  await page.getByRole('radio', { name: 'Microgravity' }).check(); // controls keep working on the fallback
  await expect(lens).toHaveAttribute('data-gravity', 'micro');
  await page.screenshot({ path: `docs/qa/screenshots/m1/lens-context-lost-${info.project.name}.png` });
  await page.evaluate(() => (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext());
  await expect(lens).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.getByTestId('lens-renderer')).toHaveText('Rendered with WebGL');
  expect(errors).toEqual([]);
});

test('F5: switching reduced motion on after start stops the flicker, and off resumes it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pause flicker' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Play flicker' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('img', { name: /rounded, dim blue flame/ })).toBeAttached();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause flicker' })).toHaveAttribute('aria-pressed', 'true');
});

test('missions stay honestly unavailable and narrow screens never scroll sideways', async ({ browser }, info) => {
  test.skip(info.project.name === 'desktop', 'Narrow-width sweep');
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  for (const route of ['/', '/atlas', '/experiments/bass2-b20', '/dashboard', '/ask', '/gaps', '/compare', '/sources', '/methodology', '/passport', '/missions', '/missions/lunar-habitat', '/roadmap']) {
    await page.goto(`http://127.0.0.1:3217${route}`);
    expect(await noOverflow(page), route).toBe(true);
  }
  await page.goto('http://127.0.0.1:3217/missions');
  await expect(page.getByRole('link', { name: 'Station Arrival' })).toBeVisible();
  await expect(page.getByText('Mission 01 · Preview')).toBeVisible();
  await page.screenshot({ path: 'docs/qa/screenshots/m1/missions-320.png', fullPage: true });
  await context.close();
});
