import { expect, test } from '@playwright/test';

// The 3D ISS Adventure: a full playthrough with the accessible buttons (Guide me + Interact), desktop only.
test('ISS Adventure: read the NASA record, collect four parts, install them, run B20, answer Mission Control honestly', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one full 3D playthrough is enough');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (/Context Lost|Too many active WebGL/.test(m.text())) errors.push(m.text()); });
  await page.goto('/adventure');
  const start = page.getByRole('button', { name: 'Start the adventure' });
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  // Guide me floats to the objective; wait until the HUD says it is in reach, then interact.
  const go = async () => {
    await page.getByRole('button', { name: 'Guide me to the objective' }).click();
    await expect.poll(async () => parseFloat(await page.locator('.adv-dist').innerText()), { timeout: 10_000 }).toBeLessThan(1.5);
    await page.getByRole('button', { name: 'Interact' }).click();
  };
  await go();
  const dialog = page.getByRole('dialog', { name: 'BASS-II test B20' });
  await expect(dialog).toContainText('17.4 vol%');
  await dialog.getByRole('button', { name: 'Log the record' }).click();
  for (let i = 0; i < 4; i++) await go();
  await expect(page.locator('.adv-obj')).toContainText('glovebox');
  await go();
  await page.getByRole('button', { name: 'Start test B20' }).click();
  await expect(page.getByRole('button', { name: 'Test complete' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Watch the chamber' }).click();
  await expect(page.locator('.adv-obj')).toContainText('Mission Control');
  await go();
  await page.getByRole('button', { name: /Yes\. B20 burned/ }).click();
  await expect(page.locator('.adv-wrong')).toContainText('cannot assess or certify fire safety');
  await page.getByRole('button', { name: /One orbital test does not cover/ }).click();
  await expect(page.locator('.adv-win')).toContainText('Correct, and honest');
  await expect(page.locator('.adv-steps li[data-done="true"]')).toHaveCount(5);
  expect(errors).toEqual([]);
});
