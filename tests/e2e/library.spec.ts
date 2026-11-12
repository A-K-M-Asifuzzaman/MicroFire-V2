import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// NASA Investigation Library + Citation Checker over Codex's investigation-library-v1 (real backend; 2 verify POSTs).
// Pinned science invariant: only BASS-II carries an admitted run (B20). New descriptions may be added, never silently admitted.
const ADMITTED: Record<string, string[]> = { 'bass-ii': ['bass2-b20'] };
const BASELINE = ['bass-ii', 'flex', 'acme', 'saffire-iv-v'];

test('the library renders every API description, admits only B20, and search narrows it', async ({ page, request }) => {
  const api = await (await request.get('/api/investigations')).json() as { data: { items: { id: string; admittedExperimentIds: string[] }[] } };
  const items = api.data.items;
  expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(BASELINE));
  for (const i of items) expect(i.admittedExperimentIds, i.id).toEqual(ADMITTED[i.id] ?? []);
  await page.goto('/investigations');
  const cards = page.locator('.library-card');
  await expect(cards).toHaveCount(items.length);
  await expect(page.locator('.results-meta')).toContainText(`${items.length} investigation descriptions`);
  await expect(page.locator('.results-meta')).toContainText('1 admitted run usable as evidence');
  for (const i of items) {
    const card = page.locator(`.library-card[href="/investigations/${i.id}"]`);
    await expect(card, i.id).toHaveAttribute('data-admitted', String(i.id in ADMITTED));
    await expect(card, i.id).toContainText(i.id in ADMITTED ? `1 admitted run: ${ADMITTED[i.id]!.join(', ')}` : 'Description only · no admitted runs');
  }
  await page.getByLabel('Search investigations').fill('flex');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\?q=flex/);
  await expect(cards).toHaveCount(1);
});

test('an investigation shows its scope, report, rights, hash and dataset; the checker uses the backend verdict', async ({ page }) => {
  await page.goto('/investigations/bass-ii');
  await expect(page.getByTestId('library-scope')).toContainText('Source description, not run evidence.');
  await expect(page.getByTestId('library-scope').getByRole('link', { name: 'bass2-b20' })).toHaveAttribute('href', '/experiments/bass2-b20');
  await expect(page.getByText(/DOI 10\.60555/)).toBeVisible();
  await expect(page.locator('dd.mono')).toHaveText(/^[a-f0-9]{64}$/);
  const checker = page.getByTestId('citation-checker');
  await checker.getByRole('button', { name: 'Check this reference' }).click();
  await expect(checker.getByTestId('checker-result')).toHaveAttribute('data-valid', 'true');
  await expect(checker).toContainText('does not prove the statement is scientifically true');
  await checker.getByLabel('PDF page').fill('13');
  await checker.getByRole('button', { name: 'Check this reference' }).click();
  await expect(checker.getByTestId('checker-result')).toHaveAttribute('data-valid', 'false');
  await expect(checker.getByTestId('checker-result')).toContainText('does not match');
});

test('a description-only investigation says nothing in it can answer a question; pages stay accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // the header reveal is animated; check settled colours
  await page.goto('/investigations/flex');
  await expect(page.getByTestId('library-scope')).toContainText('No run from this investigation is admitted yet');
  await expect(page.getByTestId('library-scope').getByRole('link')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const r = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  expect((await page.request.get('/investigations/not-a-real-one')).status()).toBe(404);
});
