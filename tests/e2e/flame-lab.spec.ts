import { test, expect } from '@playwright/test';

test('Flame Lab is interactive and scientifically bounded', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const res = await page.goto('/lab');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Change the condition/i })).toBeVisible();
  await expect(page.getByTestId('flame-lab')).toBeVisible();
  await expect(page.getByText('17.4 vol% (calibrated)')).toBeVisible();
  await expect(page.getByText('Unknown in admitted B20 record')).toBeVisible();
  await expect(page.getByText('no predictive ML', { exact: false })).toBeVisible();

  await page.locator('.flab-preset').getByRole('button', { name: 'Earth 1 g' }).click();
  await expect(page.locator('.flab-preset').getByRole('button', { name: 'Earth 1 g' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.flab-steps li').first()).toHaveAttribute('data-done', 'true');

  await page.getByRole('slider', { name: /Scenario oxygen/i }).press('ArrowRight');
  await expect(page.locator('.flab-table')).toContainText('Different');
  await expect(page.locator('.flab-steps li').nth(1)).toHaveAttribute('data-done', 'true');

  await page.getByRole('radio', { name: 'No, insufficient evidence' }).check();
  await page.getByRole('button', { name: 'Check reasoning' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Correct: evidence is insufficient.' })).toBeVisible();
  await expect(page.locator('.flab-steps li').nth(2)).toHaveAttribute('data-done', 'true');
  expect(pageErrors).toEqual([]);
});

test('Lab exports clearly labelled, non-predictive, source-backed practice notes', async ({ page }) => {
  await page.goto('/lab');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export lab notes (JSON)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('microfire-flame-lab-notes.json');
  await expect(page.getByText('Lab notes exported locally')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open cited B20 dossier' })).toHaveAttribute('href', /experiments\/bass2-b20/);
});

test('Mission guide explains a first-time playthrough', async ({ page }) => {
  const res = await page.goto('/missions/guide');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Mission control: your field guide' })).toBeVisible();
  for (const name of ['Station Arrival','BASS-II Training Bay','Flame Detective','Claim Trial','Lunar Habitat']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Enter or resume the five missions' })).toHaveAttribute('href', '/missions/play');
});

test('Lab works at mobile viewport without horizontal document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lab');
  await expect(page.getByTestId('flame-lab')).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});
