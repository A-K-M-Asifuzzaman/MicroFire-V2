import { expect, test, type Page } from '@playwright/test';

// Atlas investigation filters over the verified GET /api/experiments filters (Codex d9a3313): NASA source, documented
// observation terms, gravity and exact recorded oxygen / pressure / airflow. Unknown values never match.
const more = async (page: Page) => { const d = page.locator('details.atlas-more'); if (!(await d.getAttribute('open'))) await d.locator('summary').click(); };
const search = (page: Page) => page.getByRole('search', { name: 'Search experiments' }).getByRole('button', { name: 'Search' }).click();
const count = (page: Page) => page.locator('.results-meta');

test('documented observation and recorded oxygen find B20; unrecorded or different values never match', async ({ page }) => {
  await page.goto('/atlas');
  await more(page);
  await page.getByLabel('Documented observation contains').fill('burned entire sample');
  await page.getByLabel('Oxygen, recorded (vol%)').fill('17.4');
  await search(page);
  await expect(count(page)).toContainText('1 admitted record match');
  await expect(page).toHaveURL(/observation=burned\+entire\+sample/);
  await expect(page.getByRole('link', { name: /Inspect B20/ })).toBeVisible();

  await page.getByLabel('Oxygen, recorded (vol%)').fill('21');
  await search(page);
  await expect(count(page)).toContainText('0 admitted records match');

  await page.getByLabel('Oxygen, recorded (vol%)').fill('');
  await page.getByLabel('Pressure, recorded (kPa)').fill('101');
  await search(page);
  await expect(count(page)).toContainText('0 admitted records match'); // B20 recorded no per-test pressure
});

test('the NASA source filter and a shared URL restore the same filtered view', async ({ page }) => {
  await page.goto('/atlas');
  await more(page);
  const source = page.getByLabel('NASA source');
  const value = await source.locator('option').nth(1).getAttribute('value');
  await source.selectOption(value!);
  await search(page);
  await expect(count(page)).toContainText('1 admitted record match');
  const url = page.url();
  await page.goto(url);
  await expect(page.locator('details.atlas-more')).toHaveAttribute('open', '');
  await expect(page.getByLabel('NASA source')).toHaveValue(value!);
  await expect(count(page)).toContainText('1 admitted record match');
});
