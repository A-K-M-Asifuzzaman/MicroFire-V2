import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CampaignActionSchema } from '@microfire/shared';

// Mission scenes in FIXTURE mode: engine-generated campaign states (docs/campaign/fixtures), actions validated and
// logged, never applied. These are interface tests; they do not show any mission is playable end to end.
const authorize = async (page: Page) => page.route('http://127.0.0.1:3240/m2-fixtures**', (route) => route.continue({
  headers: { ...route.request().headers(), 'x-microfire-review-token': process.env.MICROFIRE_REVIEW_ACCESS_TOKEN! } }));
const M1 = '/m2-fixtures/missions/station-arrival';
const intents = (page: Page) => page.getByRole('region', { name: 'Intent log (fixture gallery)' }).locator('code');
const lastIntent = async (page: Page) => CampaignActionSchema.parse(JSON.parse((await intents(page).first().textContent())!));
const spot = (page: Page, name: RegExp) => page.getByRole('group', { name: 'Station hotspots' }).getByRole('button', { name });

test.beforeEach(async ({ page }) => authorize(page));

test('Station Arrival: labelled fixture-only, objectives follow the engine states, the next station is highlighted', async ({ page }) => {
  await page.goto(M1);
  await expect(page.getByText('Fixture gallery: not a playable mission.')).toBeVisible();
  const objectives = page.getByRole('region', { name: 'Station Arrival objectives' });
  await expect(objectives.locator('li[aria-current="step"]')).toContainText('Open the source record');
  await expect(spot(page, /Research terminal/)).toHaveAttribute('data-next', 'true');
  await page.getByRole('navigation', { name: 'Fixture states' }).getByRole('button', { name: /Collect the documented observation/ }).click();
  await expect(objectives.locator('li[data-done="true"]')).toHaveCount(3);
  await expect(spot(page, /Training-bay hatch/)).toHaveAttribute('data-next', 'true');
  await expect(page.getByRole('region', { name: 'Evidence Passport' })).toContainText('The B20 observation log reports that the flame burned the entire sample.');
  await expect(page.getByRole('region', { name: 'Evidence Passport' })).toContainText('PDF page 112');
});

test('Station Arrival: stations emit schema-valid campaign intents (keyboard on desktop, touch on mobile); nothing is applied', async ({ page }, info) => {
  await page.goto(M1);
  const press = async (name: RegExp) => { const b = spot(page, name); if (info.project.name === 'mobile') await b.tap(); else { await b.focus(); await page.keyboard.press('Enter'); } };
  await press(/Research terminal/);
  await page.getByRole('button', { name: 'Open the source record', exact: true }).click();
  expect(await lastIntent(page)).toEqual({ type: 'TRAINING', action: { type: 'GAME', action: { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' } } });
  await press(/Evidence scanner/);
  const submit = page.getByRole('button', { name: 'Submit the source review' });
  await expect(submit).toBeDisabled();
  await page.getByRole('group', { name: 'The B20 observation is…' }).getByLabel('Documented research').check();
  await page.getByRole('group', { name: 'The station fire alarm in this story is…' }).getByLabel('Authored fiction').check();
  await submit.click();
  const review = await lastIntent(page);
  expect(review).toMatchObject({ type: 'REVIEW_SOURCE', claimId: 'bass2-b20-burned-entire-sample', observationOrigin: 'research', incidentOrigin: 'fiction' });
  // Still the first fixture state: the browser never advances the campaign itself.
  await expect(page.getByRole('region', { name: 'Station Arrival objectives' }).locator('li[data-done="true"]')).toHaveCount(0);
  await expect(page.getByText('validated, not sent (fixture mode)').first()).toBeVisible();
});

test('Station Arrival: a wrong source review shows the engine’s own reasons and citation', async ({ page }) => {
  await page.goto(M1);
  await page.getByRole('navigation', { name: 'Fixture states' }).getByRole('button', { name: /filed as fiction \(wrong\)/ }).click();
  const verdict = page.locator('.mf-verdict');
  await expect(verdict).toContainText('Not yet. Here is why:');
  await expect(verdict).toContainText('The B20 observation is documented research.');
  await expect(verdict).toContainText('PDF page 112');
});

test('Station Arrival: without WebGL every station is still a usable button on a 2D plan', async ({ page }) => {
  await page.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, k: string, ...a: unknown[]) { return /webgl/.test(k) ? null : Reflect.apply(o, this, [k, ...a]); } as typeof o; });
  await page.goto(M1);
  await expect(page.locator('.mf-viewport')).toHaveAttribute('data-mode', '2d');
  await expect(page.getByText(/The 3D module is not available on this device/)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Station hotspots' }).getByRole('button')).toHaveCount(4);
  await spot(page, /Evidence lockers/).click();
  await page.getByRole('button', { name: 'Collect the documented observation', exact: true }).click();
  expect(await lastIntent(page)).toMatchObject({ type: 'TRAINING', action: { type: 'GAME', action: { type: 'COLLECT_EVIDENCE' } } });
});

test('Station Arrival: no horizontal overflow and no axe violations', async ({ page }) => {
  await page.goto(M1);
  await expect(page.locator('.mf-viewport')).toHaveAttribute('data-ready', /true|false/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const r = await new AxeBuilder({ page }).include('.mf-gallery').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('mission scenes stay behind the review gate: without the credential the route is a plain 404', async ({ browser }) => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const res = await page.goto('http://127.0.0.1:3240' + M1);
  expect(res?.status()).toBe(404);
  await expect(page.getByText('Fixture gallery')).toHaveCount(0);
  await ctx.close();
});
