import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// NASA Investigation Library + Citation Checker over Codex's investigation-library-v1 (real backend; 2 verify POSTs).
test('the library lists four source descriptions but only one admitted run, and search narrows it', async ({ page }) => {
  await page.goto('/investigations');
  const cards = page.locator('.library-card');
  await expect(cards).toHaveCount(4);
  await expect(page.locator('.results-meta')).toContainText('1 admitted run usable as evidence');
  await expect(cards.filter({ hasText: 'BASS-II' })).toContainText('1 admitted run: bass2-b20');
  await expect(cards.filter({ hasText: 'FLEX' })).toContainText('Description only · no admitted runs');
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
