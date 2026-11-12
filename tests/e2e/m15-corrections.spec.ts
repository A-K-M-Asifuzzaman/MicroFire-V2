import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';

// M1.5 correction pass (Astra review 7ca790a): scoped science copy, unchanged registry states, task-first layouts and
// B20 field-to-source inspection. Every POST is answered by the deterministic science oracle, so this spec spends none
// of the shared server's 30-POST budget.
const envelope = (data: unknown) => ({ json: { apiVersion: '1', data } });
const science = (fn: string, input: unknown): unknown => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'tests/e2e/science-oracle.ts', fn, JSON.stringify(input)], { encoding: 'utf8' }));
async function oraclePosts(page: Page) {
  await page.route('**/api/ask', (r) => r.fulfill(envelope(science('ask', r.request().postDataJSON()))));
  await page.route('**/api/evidence/rank', (r) => r.fulfill(envelope(science('rank', r.request().postDataJSON()))));
  await page.route('**/api/gaps', (r) => r.fulfill(envelope(science('gaps', r.request().postDataJSON()))));
}
const top = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top);
const bottom = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().bottom);

// Universal or absence claims the admitted evidence cannot support (S1, S2).
const overclaims = [/nobody (has|anywhere)/i, /never measured/i, /\bin orbit,? (they|flames?|fire)\b/i, /every flame/i, /just a slow blue sphere/i,
  /no flickering tip/i, /missing experiment is also a finding/i, /same fuel/i, /record never measured/i];

test('S1/S2: visible, hidden and accessible copy never overclaims; the still-air scope is stated', async ({ page }) => {
  for (const route of ['/', '/atlas', '/experiments/bass2-b20', '/dashboard', '/gaps', '/ask', '/methodology', '/lab', '/missions']) {
    await page.goto(route);
    const text = await page.evaluate(() => [document.body.textContent ?? '', ...[...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')].join('\n'));
    for (const claim of overclaims) expect(text, `${route} ${claim}`).not.toMatch(claim);
  }
  await page.goto('/');
  await expect(page.locator('.home-copy .lede')).toContainText('in still air');
  await expect(page.getByText('See what this catalog does and does not document.')).toBeVisible();
  await expect(page.getByText('Two teaching views · still-air illustration')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Still-air microgravity illustration' })).toBeVisible();
  await page.goto('/gaps');
  await expect(page.locator('.frontier-key')).toContainText('No value is documented for this field in the admitted record.');
});

test('S3: registry states are unchanged; built interfaces say what is true and keep the registry note', async ({ page }) => {
  const expected: [string, string][] = [['/atlas', 'Preview'], ['/experiments/bass2-b20', 'Preview'], ['/dashboard', 'Coming Soon'], ['/gaps', 'Coming Soon'],
    ['/ask', 'Coming Soon'], ['/passport', 'Coming Soon'], ['/lab', 'Coming Soon'], ['/missions', 'Preview']];
  for (const [route, badge] of expected) {
    await page.goto(route);
    await expect(page.locator('.badge').first(), route).toHaveText(badge);
    await expect(page.getByText('Available', { exact: true }), route).toHaveCount(0);
  }
  await page.goto('/dashboard');
  await expect(page.getByText('Interface implemented for review; release acceptance pending.')).toBeVisible();
  await expect(page.locator('.registry-note')).toContainText('registry wording update proposed for review');
});

test('first viewport: home gravity toggle, Ask input and Atlas B20 action sit where Astra required', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'explicit viewports below');
  for (const [w, h, mobile] of [[390, 844, true], [1440, 900, false]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    if (mobile) expect(await top(page, '.segmented'), 'gravity toggle').toBeLessThanOrEqual(700);
    expect(await bottom(page, '.segmented'), 'gravity toggle visible').toBeLessThanOrEqual(h);
    await page.goto('/ask');
    expect(await top(page, '#pix-q'), 'Ask question field').toBeLessThanOrEqual(mobile ? 600 : h);
    await expect(page.locator('.pix-stage')).toHaveCount(1); // one companion per task
    await page.goto('/atlas');
    expect(await bottom(page, '.exhibit-actions .btn'), 'Inspect B20').toBeLessThanOrEqual(h);
    await expect(page.getByRole('link', { name: 'Inspect B20' })).toHaveAttribute('href', '/experiments/bass2-b20');
    // /gaps: the Transferability Analyzer's question is now the page's first control (the coverage form follows it).
    for (const [route, sel] of [['/dashboard', '#ws-question'], ['/gaps', '#tr-question']] as const) {
      await page.goto(route);
      expect(await top(page, sel), `${route} first control`).toBeLessThanOrEqual(h);
    }
    await ctx.close();
  }
});

test('B20: selecting a part or condition explains it, links its source and highlights the matching evidence', async ({ page }) => {
  await page.goto('/experiments/bass2-b20');
  const parts = page.getByRole('list', { name: 'Apparatus parts and run conditions' });
  const detail = page.getByTestId('apparatus-detail');
  await parts.getByRole('button', { name: /Calibrated oxygen: 17.4 vol%/ }).click();
  await expect(detail).toContainText('17.4 vol%');
  await expect(detail.getByRole('link', { name: /PDF page 112/ })).toHaveAttribute('href', /#page=112$/);
  await expect(page.locator('.readouts [data-cond="oxygenPct"]')).toHaveAttribute('data-highlight', 'true');
  await expect(page.locator('tr[data-cond="oxygenPct"]')).toHaveAttribute('data-highlight', 'true');
  await expect(detail.getByRole('link', { name: /Show in the conditions table/ })).toHaveAttribute('href', '#cond-oxygenPct');
  await expect(page.locator('#cond-oxygenPct')).toHaveCount(1);
  // Unknown pressure: shown as absent, never as a reading.
  await parts.getByRole('button', { name: /Pressure: not recorded/ }).click();
  await expect(detail).toContainText('Not recorded in this source. No value is shown or estimated.');
  await expect(detail.locator('a.cite')).toHaveCount(0);
  await expect(page.locator('.readouts [data-cond="pressureKpa"]')).toHaveAttribute('data-highlight', 'true');
  // Hardware: sourced description, schematic placement.
  await parts.getByRole('button', { name: /Flow duct/ }).click();
  await expect(detail).toContainText('schematic');
  await expect(detail.getByRole('link', { name: /PDF page 12 / })).toHaveAttribute('href', /#page=12$/);
  // Keyboard path and adjacency: the explanation sits right after the diagram, before the selectors.
  const fan = parts.getByRole('button', { name: /Variable-speed fan/ });
  await fan.focus(); await page.keyboard.press('Enter');
  await expect(fan).toHaveAttribute('aria-pressed', 'true');
  await expect(detail).toContainText('Variable-speed fan');
  expect(await top(page, '[data-testid=apparatus-detail]')).toBeLessThan(await top(page, '.part-list'));
  await expect(page.getByText('16.5 vol%')).toHaveCount(0);
});

test('Frontier: each condition shows what was asked, what is documented and its status in plain labels', async ({ page }) => {
  await oraclePosts(page);
  await page.goto('/gaps');
  await page.getByRole('button', { name: 'Load example' }).click();
  const oxygen = page.getByRole('row', { name: /^Oxygen/ });
  await expect(oxygen).toContainText('21 vol%');
  await expect(oxygen).toContainText('17.4 vol%');
  await expect(oxygen).toContainText('Conditions differ');
  const pressure = page.getByRole('row', { name: /^Pressure/ });
  await expect(pressure).toContainText('70 kPa');
  await expect(pressure).toContainText('No value documented');
  await expect(pressure.getByText('Not recorded', { exact: true })).toBeVisible();
  const headers = await page.locator('.gap-table tbody th').allTextContents();
  expect(headers.join(' ')).not.toMatch(/oxygenPct|pressureKpa/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Workstation leads with the support verdict, in human labels, without turning a match into proof', async ({ page }) => {
  await oraclePosts(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /recorded B20 observation/ }).click();
  await expect(page.getByRole('heading', { name: 'Supported by this exact observation' })).toBeVisible();
  await expect(page.locator('.ws-match')).toContainText('Oxygen matches');
  await expect(page.locator('#ws-verdict').getByRole('link', { name: /PDF page 112/ })).toBeVisible();
  await expect(page.locator('#ws-limits .limits')).toBeVisible();
  await page.getByRole('button', { name: 'What does airflow change? (PMMA)' }).click();
  await expect(page.getByRole('heading', { name: 'Outcome not established' }).first()).toBeVisible();
  await expect(page.locator('#ws-verdict blockquote')).toHaveCount(0);
  await expect(page.getByTestId('chain-rail').locator('li').nth(3)).toHaveAttribute('data-state', 'warn');
});

test('Ask: one companion, a persistent no-AI caption and examples grouped by what they show', async ({ page }) => {
  await page.goto('/ask');
  await expect(page.locator('.pix-stage')).toHaveCount(1);
  await expect(page.getByText('Fixed-template catalog guide · no AI model')).toBeVisible();
  for (const label of ['What was observed?', 'What is not known?', 'Where PIX stops']) await expect(page.getByText(label, { exact: true })).toBeVisible();
});

test('navigation: unfinished destinations are tagged, Passport is reachable, the Lab hands off to the lens', async ({ page }, info) => {
  await page.goto('/missions');
  if (info.project.name === 'desktop') {
    await expect(page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: /Flame Lab/ })).toContainText('Soon');
    await expect(page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: /Missions/ })).toContainText('Preview');
    await expect(page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Evidence', exact: true })).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Mission tools' }).getByRole('link', { name: 'Evidence Passport' })).toHaveAttribute('href', '/passport');
  } else {
    await page.getByText('Menu').click();
    await expect(page.locator('details.mobile-nav').getByRole('link', { name: 'Passport', exact: true })).toHaveAttribute('href', '/passport');
    await expect(page.locator('details.mobile-nav').getByRole('link', { name: 'Frontier' })).toBeVisible();
  }
  await page.goto('/lab');
  await expect(page.getByRole('link', { name: 'Open the Gravity Lens illustration' })).toHaveAttribute('href', '/#gravity-lens');
  await page.goto('/');
  await expect(page.locator('#gravity-lens figure.lens')).toHaveCount(1);
});

test('reading surfaces are stable: no scroll-reveal fades or perpetual glints on caveats and evidence', async ({ page }) => {
  await page.goto('/experiments/bass2-b20');
  for (const sel of ['.limits', '.correction', '.conditions', '[data-testid=apparatus-detail]']) {
    const anim = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).animationName);
    expect(anim, sel).toBe('none');
  }
  // No sweeping sheen or scanline over the verified value or the specimen (the static .frame corner may remain).
  for (const sel of ['.correction', '.specimen']) expect(await page.locator(sel).evaluate((el) => getComputedStyle(el, '::after').animationName), sel).toBe('none');
});
