import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The unified public site: the 3D training bay is reachable through ordinary navigation as a labelled, illustrative
// tour. These tests use no fixtures. The mission itself stays gated until Sol's backend is integrated.
const TOUR = '/missions/bass-assembly/tour';
const skipIntro = async (page: Page) => { await page.getByRole('button', { name: 'Skip intro' }).click({ timeout: 5000 }).catch(() => undefined); };

test('journey: home → training bay tour → missions → briefing → home, through real links', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const teaser = page.getByRole('region', { name: 'Step inside the training bay.' });
  await expect(teaser).toContainText('Illustrative scene rendered from MicroFire');
  await teaser.getByRole('link', { name: 'Tour the training bay' }).click();
  await expect(page).toHaveURL(new RegExp(`${TOUR}$`));
  await expect(page.getByRole('dialog', { name: 'Arriving at the training bay' })).toContainText('Illustrative tour');
  await skipIntro(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Step inside the training bay.' })).toBeVisible();
  await expect(page.locator('.status-line')).toContainText('this tour records nothing.');
  await expect(page.locator('.m2-bench')).toHaveAttribute('data-env', /ready|off/, { timeout: 30_000 });
  await expect(page.getByText(/Illustrative tour\. The apparatus is shown in its reference configuration/)).toBeVisible();
  // Interactive parts: same frozen equipment copy as the mission; nothing is qualified or recorded.
  await page.getByRole('button', { name: 'Fan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fan', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const card = page.locator('.m2-tour-card');
  await expect(card).toContainText('Duct inlet');
  await expect(card).toContainText('Flow was blown through the duct');
  await expect(page.locator('.m2-pix-line')).toContainText('the fan. It mounts at the duct inlet');
  await page.getByRole('button', { name: 'Inspect fan' }).click();
  await expect(page.locator('main')).not.toContainText(/qualified|certif|Passport entry/i);
  // Sound and narration: present, off by default.
  await expect(page.getByRole('button', { name: 'Lab sound' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Read PIX aloud' })).toHaveAttribute('aria-pressed', 'false');
  // Mission navigation keeps the honest gate.
  if (info.project.name === 'desktop') await page.getByRole('navigation', { name: 'Mission tools' }).getByRole('link', { name: 'Mission map' }).click();
  else await page.getByRole('link', { name: 'Mission map' }).first().click();
  await expect(page).toHaveURL(/\/missions$/);
  await expect(page.getByRole('region', { name: 'Step inside the training bay.' })).toBeVisible();
  await page.getByRole('link', { name: 'BASS-II Assembly' }).click();
  await expect(page).toHaveURL(/\/missions\/bass-assembly$/);
  await expect(page.getByRole('button', { name: 'Preview' })).toBeDisabled(); // no campaign backend in this suite
  await expect(page.getByText(/open only after the mission.s server integration is approved/)).toBeVisible();
  await page.getByRole('link', { name: /MicroFire, the Living Science Observatory/ }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('navigation: the training bay is in the mission menu on desktop and mobile', async ({ page }, info) => {
  await page.goto('/missions');
  if (info.project.name === 'desktop') {
    await expect(page.getByRole('navigation', { name: 'Mission tools' }).getByRole('link', { name: 'Training bay' })).toHaveAttribute('href', TOUR);
  } else {
    await page.getByText('Menu').click();
    await expect(page.locator('details.mobile-nav').getByRole('link', { name: 'Training bay tour' })).toHaveAttribute('href', TOUR);
  }
});

test('WebGL scenes are released on client navigation: no stacked contexts after repeated round trips', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one context accounting run is enough');
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: { made: number; lost: number } };
    w.__gl = { made: 0, lost: 0 };
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement & { __gl?: true }, type: string, ...rest: unknown[]) {
      const c = (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      if (c && /webgl/.test(type) && !this.__gl) { this.__gl = true; w.__gl.made++; this.addEventListener('webglcontextlost', () => { w.__gl.lost++; }); }
      return c;
    } as typeof orig;
  });
  await page.goto('/');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('region', { name: 'Step inside the training bay.' }).getByRole('link', { name: 'Tour the training bay' }).click();
    await expect(page).toHaveURL(new RegExp(`${TOUR}$`));
    await skipIntro(page);
    await expect(page.locator('.m2-bench')).toHaveAttribute('data-frame', 'true', { timeout: 30_000 });
    await page.getByRole('link', { name: 'Discover' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForTimeout(800);
  }
  const gl = await page.evaluate(() => (window as unknown as { __gl: { made: number; lost: number } }).__gl);
  const live = gl.made - gl.lost, onPage = await page.locator('canvas').count();
  expect(gl.made).toBeGreaterThan(3);
  expect(live).toBeLessThanOrEqual(onPage); // only the current page's scenes hold a context
});

test('no WebGL: the tour shows a rendered still and keeps the parts inspector', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
  const page = await ctx.newPage();
  await page.goto(TOUR);
  await skipIntro(page);
  await expect(page.getByText(/3D isn’t available on this device/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Igniter' }).click();
  await expect(page.locator('.m2-tour-card')).toContainText('Front-window igniter lever');
  await ctx.close();
});

test('reduced motion: the tour opens with no intro and no scroll animations on the invitation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  expect(await page.locator('.bay-teaser-copy').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.goto(TOUR);
  await expect(page.getByRole('heading', { level: 1, name: 'Step inside the training bay.' })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ctx.close();
});

test('accessibility and reflow: tour and invitation pages have no axe violations and no horizontal scroll at 320 px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 720 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const results: Record<string, string[]> = {};
  for (const path of ['/', '/missions', '/missions/bass-assembly', TOUR]) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const v = axe.violations.map((x) => `${x.id}: ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    if (v.length) results[path] = v;
  }
  expect(results).toEqual({});
  await ctx.close();
});
