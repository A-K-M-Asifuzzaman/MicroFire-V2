import { test, expect } from '@playwright/test';
import { features, MissionIdSchema } from '@microfire/shared';

test('offline source journey, keyboard access, corrected science and screenshots', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.screenshot({ path: `docs/qa/screenshots/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Inspect the scientific fixture' }).click();
  await page.getByRole('link', { name: 'B20 — opposed-flow PMMA film' }).click();
  await expect(page.getByRole('heading', { name: 'Documented observation' })).toBeVisible();
  await expect(page.getByText('17.4 vol%', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Table A\.1.*PDF page 112/ })).toHaveAttribute('href', /TM-20210011385.pdf#page=112$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/qa/screenshots/dossier-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});
test('every advertised route resolves and all missions remain unavailable', async ({ page }) => {
  for (const feature of features) {
    const response = await page.goto(feature.route.replace('[id]', 'bass2-b20'));
    expect(response?.status()).toBe(200);
    if (MissionIdSchema.options.some((id) => id === feature.id)) await expect(page.getByRole('button', { name: 'Coming Soon' })).toBeDisabled();
  }
  await page.goto('/experiments/not-a-record');
  await expect(page.getByRole('heading', { name: 'Record or route not found' })).toBeVisible();
});
test('API contracts, errors and no-service fallback', async ({ request }) => {
  const response = await request.get('/api/experiments?limit=1');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.apiVersion).toBe('1'); expect(body.data.items[0].conditions.oxygenPct.value).toBe(17.4);
  expect((await request.get('/api/experiments?limit=-1')).status()).toBe(400);
  expect((await request.get('/api/experiments/missing')).status()).toBe(404);
  const ask = await request.post('/api/ask', { data: { question: 'Can this certify a lunar habitat?', targetConditions: {} } });
  expect(ask.status()).toBe(200);
  expect((await ask.json()).data).toMatchObject({ abstained: true, code: 'unsupported-intent' });
  expect((await request.post('/api/constructor', { data: {} })).status()).toBe(404);
  const record = body.data.items[0];
  const mismatchedPassport = { schemaVersion: 1, purpose: 'educational-research-record', entries: [{
    id: 'mismatched-entry', missionId: 'station-arrival', experimentIds: [record.id], claimIds: [record.claims[0].id],
    observationType: 'hypothesis', evidenceLevel: 'direct', conclusion: 'Learner note', citations: record.claims[0].citations,
    limitations: record.limitations, corrections: [], setupRevision: null, status: 'current', scenario: 'research', createdAt: '2026-10-11T09:00:00Z'
  }] };
  expect((await request.post('/api/passport/validate', { data: mismatchedPassport })).status()).toBe(400);
  const passport = await request.post('/api/passport/validate', { data: { schemaVersion: 1, purpose: 'educational-research-record', entries: [] } });
  expect((await passport.json()).data.certification).toBe(false);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
test('evidence works with JavaScript disabled and no WebGL', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3217/experiments/bass2-b20');
  await expect(page.getByRole('heading', { name: 'Documented observation' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await context.close();
});
