import { expect, test } from '@playwright/test';

// Design B homepage (team decision 2026-11-07): an illustrated sky and Earth, a module whose porthole holds the Gravity
// Lens flame, PIX guiding from a balloon, route stickers and research stations; then the guided bay tour.
// Presentation only: every PIX line is fixed copy (counts from the catalog); nothing here is a measurement.
const TOUR = '/missions/bass-assembly/tour';
const balloon = '.home-balloon';

test('Design B hero: the flame is an illustration in the module porthole; the only 3D on the page is the lens flame', async ({ page }) => {
  await page.addInitScript(() => { const w = window as unknown as { __gl: number }; w.__gl = 0; const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, t: string, ...r: unknown[]) { const c = (o as (...a: unknown[]) => unknown).call(this, t, ...r); if (c && /webgl/.test(t) && this.isConnected) w.__gl++; return c; } as typeof o; });
  await page.goto('/');
  const hero = page.getByTestId('home-hero');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Fire, without the weight of gravity.');
  await expect(hero.locator('figure.lens .home-hull')).toHaveCount(1);
  await expect(hero.locator('.home-window-tag')).toHaveText('Illustration');
  await expect(hero.locator('figure.lens figcaption')).toContainText('educational illustration, not NASA footage or data');
  await expect(page.getByRole('navigation', { name: 'Your route through MicroFire' }).getByRole('link')).toHaveCount(6);
  await expect(page.getByRole('navigation', { name: 'Research stations' }).getByRole('link')).toHaveCount(6);
  await expect(page.getByRole('link', { name: /Prepare for the mission/ })).toContainText('Not playable yet');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl), 'at most the lens flame uses WebGL').toBeLessThanOrEqual(1);
});

test('PIX guides: greeting, then a station-specific line with the right tone for evidence and for gaps', async ({ page }) => {
  await page.goto('/');
  const pix = page.locator(balloon);
  await expect(pix).toContainText("Hi, I'm PIX!");
  const stations = page.getByRole('navigation', { name: 'Research stations' }).getByRole('link');
  await stations.nth(1).focus();
  await expect(pix).toHaveAttribute('data-mood', 'cite');
  await expect(pix).toContainText('links to the page it came from');
  await stations.nth(4).focus();
  await expect(pix).toHaveAttribute('data-mood', 'gap');
  await expect(pix).toContainText('I mark the gaps instead of guessing');
  await stations.nth(0).focus();
  await expect(pix).toContainText(/1 admitted, 55 still in quarantine/);
  await expect(page.locator('.home-pix .pix-avatar')).toHaveAttribute('data-mood', 'bay');
});

test('PIX narrates the gravity control (illustration, never a measurement)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Earth 1 g' }).check();
  await expect(page.locator(balloon)).toContainText('Gravity on!');
  await expect(page.locator('.home')).toHaveAttribute('data-coach', 'done');
  await page.getByRole('radio', { name: 'Microgravity, still air' }).check();
  await expect(page.locator(balloon)).toContainText('Still-air microgravity');
});

test('Training Bay entrance: focus gives PIX the bay line; activating it arrives at the tour', async ({ page }) => {
  await page.goto('/');
  const enter = page.getByRole('link', { name: 'Enter the training bay' });
  await expect(enter).toHaveAttribute('href', TOUR);
  await enter.focus();
  await expect(page.locator(balloon)).toContainText('schematic model of the BASS-II flow duct');
  await enter.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${TOUR}$`), { timeout: 8000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Step inside the training bay.' })).toBeVisible();
});

test('reduced motion: plain links, no replay control, no moving decoration', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Replay intro' })).toBeHidden();
  expect(await page.locator('.home-star').first().evaluate((el) => getComputedStyle(el).animationName === 'none' || parseFloat(getComputedStyle(el).animationDuration) < 0.01)).toBe(true);
  await page.getByRole('link', { name: 'Enter the training bay' }).click();
  await expect(page).toHaveURL(new RegExp(`${TOUR}$`));
  await ctx.close();
});

test('after a navigation, keyboard focus lands on the new page heading', async ({ page }, info) => {
  await page.goto('/atlas');
  if (info.project.name === 'desktop') await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: /Missions/ }).click();
  else { await page.getByText('Menu').click(); await page.locator('details.mobile-nav').getByRole('link', { name: /Missions/ }).first().click(); }
  await expect(page).toHaveURL(/\/missions$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
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
