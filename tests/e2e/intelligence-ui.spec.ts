import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

// Workstation + Ask PIX over Codex's scientific-intelligence-v1 (/api/intelligence, limit 4). Page tests fulfil
// /api/intelligence with the REAL deterministic function in-process (tests/e2e/science-oracle.ts), so they do not
// spend the shared 30-POST budget; one journey below goes over real HTTP.
const science = (fn: string, input: unknown): unknown => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'tests/e2e/science-oracle.ts', fn, JSON.stringify(input)], { encoding: 'utf8' }));
const envelope = (data: unknown) => ({ json: { apiVersion: '1', data } });
const oracle = (page: Page) => page.route('**/api/intelligence', (r) => r.fulfill(envelope(science('intelligence', r.request().postDataJSON()))));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test('Workstation: question → ranked NASA evidence → source-linked summary → six-condition applicability → limits', async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/intelligence')) bodies.push(r.postDataJSON()); });
  await oracle(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Would B20 transfer to a Moon habitat?' }).click();
  await expect(page.getByTestId('intel-summary')).toBeVisible();
  expect(bodies.at(-1)).toMatchObject({ environment: 'moon', limit: 4, targetConditions: { material: 'PMMA', oxygenPct: 26, pressureKpa: 55, gravity: 'lunar' } });
  const t = page.getByTestId('transfer-analysis');
  await expect(t.locator('tbody tr')).toHaveCount(6);
  await expect(t.locator('tr[data-status="exact-recorded"]')).toContainText('Material');
  await expect(t.locator('tr[data-status="conditions-differ"]')).toContainText('Oxygen');
  await expect(t.locator('tr[data-status="conditions-differ"]')).toContainText('17.4');
  await expect(t.locator('tr[data-status="source-not-recorded"]')).toHaveCount(2); // gravity and pressure: unknown at source
  await expect(t.locator('tr[data-status="source-not-recorded"]').first()).toContainText('Not recorded');
  await expect(t.locator('[data-conclusion="insufficient-evidence"]')).toContainText('Not enough recorded evidence to transfer');
  await expect(page.getByText('A condition comparison, not a safety prediction.')).toBeVisible();
  await expect(page.getByText(/deterministic source templates \(no AI model\)/)).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  const r = await new AxeBuilder({ page }).include('.ws-result').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('Workstation: an unsupported safety question abstains and a null transfer is shown as not assessed', async ({ page }) => {
  await oracle(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Is a lunar habitat fire-safe? (should abstain)' }).click();
  await expect(page.getByTestId('intel-abstention')).toContainText('unsupported-intent');
  await expect(page.getByTestId('intel-summary')).toHaveCount(0);
  await expect(page.getByTestId('transfer-null')).toContainText('transfer was not assessed');
  await expect(page.getByTestId('transfer-analysis')).toHaveCount(0);
});

test('Workstation: a response that breaks the contract is refused, not rendered', async ({ page }) => {
  await page.route('**/api/intelligence', (r) => r.fulfill(envelope({ intelligenceVersion: 'scientific-intelligence-v1', summary: { abstained: false, answer: 'Invented risk 3%' } })));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /recorded B20 observation/ }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('did not match the evidence contract');
  await expect(page.getByText('Invented risk 3%')).toHaveCount(0);
});

test('Ask PIX: cites its source experiment and relevance; abstains on unsupported questions', async ({ page }) => {
  await oracle(page);
  await page.goto('/ask');
  await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click();
  await expect(page.getByTestId('pix-answer')).toBeVisible();
  await expect(page.getByTestId('pix-answer')).toContainText('PDF page');
  await expect(page.getByTestId('pix-source').getByRole('link', { name: 'bass2-b20' })).toHaveAttribute('href', '/experiments/bass2-b20');
  await expect(page.getByTestId('pix-method')).toContainText('scientific intelligence API');
  await page.getByRole('button', { name: 'Can this certify a lunar habitat?' }).click();
  await expect(page.getByTestId('pix-abstention')).toBeVisible();
  await expect(page.getByTestId('pix-answer')).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
});

test('Ask PIX: if the intelligence endpoint is unavailable it falls back to /api/ask and says so', async ({ page }) => {
  await page.route('**/api/intelligence', (r) => r.fulfill({ status: 404, json: { apiVersion: '1', error: { code: 'NOT_FOUND', message: 'API route not found.', retryable: false } } }));
  await page.route('**/api/ask', (r) => r.fulfill(envelope(science('ask', r.request().postDataJSON()))));
  await page.goto('/ask');
  await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click();
  await expect(page.getByTestId('pix-answer')).toBeVisible();
  await expect(page.getByTestId('pix-method')).toContainText('catalog-template fallback (/api/ask)');
  await expect(page.getByTestId('pix-source')).toHaveCount(0);
});

test('real HTTP: the Moon transfer journey keeps 17.4 vol% and unknown pressure and gravity (1 POST)', async ({ page }) => {
  await page.goto('/dashboard');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/intelligence'));
  await page.getByRole('button', { name: 'Would B20 transfer to a Moon habitat?' }).click();
  expect((await response).status()).toBe(200);
  const t = page.getByTestId('transfer-analysis');
  await expect(t.locator('tr[data-status="conditions-differ"]')).toContainText('17.4');
  await expect(t.locator('tr', { hasText: 'Pressure' })).toContainText('Not recorded');
  await expect(t.locator('tr', { hasText: 'Gravity' })).toContainText('Not recorded');
});
