import { expect, test } from '@playwright/test';

// M3 cinematic homepage: opening flight, PIX as a guide, the Training Bay entrance, station transitions, guided tour.
// Presentation only: every PIX line is fixed copy (counts from the catalog); nothing here is a measurement.
const hero = '[data-testid=observatory]';
const TOUR = '/missions/bass-assembly/tour';

test('opening flight plays once per session, is labelled, and any input skips it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(hero)).toHaveAttribute('data-intro', 'play', { timeout: 15_000 });
  await expect(page.locator('.obs-letterbox')).toContainText('artistic illustration');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator(hero)).toHaveAttribute('data-intro', 'done', { timeout: 4000 });
  await expect(page.getByRole('button', { name: 'Skip intro' })).toHaveCount(0);
  // The research tools were usable throughout, and the flame stays an illustration.
  await expect(page.locator('figure.lens')).toHaveCount(1);
  await page.reload();
  await expect(page.locator(hero)).toHaveAttribute('data-scene', /active|static/, { timeout: 15_000 });
  await expect(page.locator(hero)).toHaveAttribute('data-intro', 'done'); // same session: no replay
});

test('PIX guides: greeting, then a station-specific line with the right tone for evidence and for gaps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15_000 }).catch(() => undefined);
  const pix = page.locator('.pix-greeter');
  await expect(pix).toContainText("Hi, I'm PIX!");
  const stations = page.getByRole('navigation', { name: 'Observatory stations' }).getByRole('link');
  await stations.nth(1).focus();
  await expect(pix).toHaveAttribute('data-mood', 'cite');
  await expect(pix).toContainText('links to the page it came from');
  await stations.nth(4).focus();
  await expect(pix).toHaveAttribute('data-mood', 'gap');
  await expect(pix).toContainText('I mark the gaps instead of guessing');
  await stations.nth(0).focus();
  await expect(pix).toContainText(/1 admitted, 55 still in quarantine/);
});

test('Training Bay entrance: focus sends PIX to the door; activating it arrives at the tour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 15_000 }).catch(() => undefined);
  const enter = page.getByRole('link', { name: 'Enter the training bay' });
  await expect(enter).toHaveAttribute('href', TOUR);
  await enter.focus();
  await expect(page.locator('.pix-greeter')).toHaveAttribute('data-mood', 'bay');
  await expect(page.locator('.pix-greeter')).toContainText('schematic model of the BASS-II flow duct');
  await enter.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${TOUR}$`), { timeout: 8000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Step inside the training bay.' })).toBeVisible();
});

test('reduced motion: no flight, no letterbox, and the entrance is a plain link', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator(hero)).toHaveAttribute('data-scene', /static|unavailable/, { timeout: 15_000 });
  await expect(page.locator(hero)).toHaveAttribute('data-intro', 'done');
  await expect(page.locator('.obs-letterbox')).toBeHidden();
  await page.getByRole('link', { name: 'Enter the training bay' }).click();
  await expect(page).toHaveURL(new RegExp(`${TOUR}$`));
  await expect(page.locator('.route-veil')).toBeHidden();
  await ctx.close();
});

test('station transitions name the destination after a navigation, never on first load', async ({ page }, info) => {
  await page.goto('/atlas');
  await expect(page.locator('.route-veil')).toBeHidden();
  if (info.project.name === 'desktop') await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: /Missions/ }).click();
  else { await page.getByText('Menu').click(); await page.locator('details.mobile-nav').getByRole('link', { name: /Missions/ }).first().click(); }
  await expect(page).toHaveURL(/\/missions$/);
  await expect(page.locator('.route-veil')).toContainText('Arriving · Mission map');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused(); // keyboard focus still lands on the page
});

test('sound and PIX voice are opt-in on the homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Lab sound/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'PIX voice' })).toHaveAttribute('aria-pressed', 'false');
});

test('guided tour: PIX walks through the parts with the frozen NASA descriptions; any choice of the visitor ends it', async ({ page }) => {
  await page.goto(TOUR);
  await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 5000 }).catch(() => undefined);
  await expect(page.locator('.m2-bench')).toHaveAttribute('data-frame', 'true', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Guided tour' }).click();
  await expect(page.locator('.m2-pix-line')).toContainText(/^1 of 10: the flow duct/);
  await expect(page.locator('.m2-pix-line')).toContainText('NASA’s description:');
  await expect(page.getByRole('button', { name: /Stop tour · 1\/10/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.m2-pix-line')).toContainText(/^2 of 10/, { timeout: 9000 });
  await page.getByRole('button', { name: 'Igniter' }).click();
  await expect(page.getByRole('button', { name: 'Guided tour' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('main')).not.toContainText(/qualified|certif/i);
});
