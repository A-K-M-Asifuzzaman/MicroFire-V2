import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Evidence Transferability Analyzer on /gaps, against the real POST /api/evidence/frontier (ranking v3).
// The server classifies; these tests check the page reports that classification faithfully.
test('the recorded B20 observation is direct evidence; a lunar habitat question does not transfer', async ({ page }) => {
  await page.goto('/gaps');
  const tool = page.getByTestId('transferability');
  await tool.getByRole('button', { name: 'The recorded B20 observation' }).click();
  const verdict = tool.locator('.transfer-verdict');
  await expect(verdict).toHaveAttribute('data-classification', 'evidence-present');
  await expect(verdict).toContainText('A NASA observation speaks to this');
  await expect(tool.locator('.transfer-chips li[data-kind="match"]')).toContainText(['Oxygen']);

  await tool.getByRole('button', { name: 'A lunar habitat question' }).click();
  await expect(verdict).toHaveAttribute('data-classification', 'measurement-missing');
  await expect(tool.locator('.transfer-chips li[data-kind="differ"]')).toContainText(['Oxygen: target 26 vol%, recorded 17.4 vol%']);
  await expect(tool.locator('.transfer-chips li[data-kind="missing"]').filter({ hasText: 'Pressure' })).toHaveCount(1);
  await expect(tool.getByText(/Not fire risk, safety or scientific confidence/).first()).toBeVisible();
  await expect(tool.getByRole('link', { name: 'bass2-b20' })).toHaveAttribute('href', '/experiments/bass2-b20');
  await expect(tool.getByText('This classification describes the audited MicroFire catalog, not the whole NASA literature.')).toBeVisible();
});

test('typed questions work from the keyboard and the page stays accessible and within the screen', async ({ page }) => {
  await page.goto('/gaps');
  const tool = page.getByTestId('transferability');
  await tool.getByLabel('Your question').fill('Would a cotton fabric burn completely on Mars?');
  await tool.getByLabel('Material').fill('cotton');
  await tool.getByRole('button', { name: 'Analyse transfer' }).focus();
  await page.keyboard.press('Enter');
  await expect(tool.locator('.transfer-verdict')).toHaveAttribute('data-classification', /related-evidence-only|conditions-differ|measurement-missing|not-in-audited-catalog/);
  await expect(tool.locator('.transfer-verdict')).not.toHaveAttribute('data-classification', 'evidence-present');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const r = await new AxeBuilder({ page }).include('[data-testid="transferability"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
