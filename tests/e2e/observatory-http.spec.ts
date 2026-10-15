import { readFile } from 'node:fs/promises';
import { test, expect, type Page, type Route } from '@playwright/test';
import { ExperimentResponseSchema, type Experiment } from '@microfire/shared';
import { createGameState, saveKey } from '@microfire/game-core';
import { startDisposableServer, type DisposableServer } from './disposable-server';

// Real-HTTP UI regressions for Astra's M1 review (F1–F3, F6, transport states, production rate limit).
// Each group runs serially against its own disposable production server, so every group gets an unmodified
// 30-POST window without weakening the limiter. Routes below only delay, abort or observe real requests unless noted.
const shot = (page: Page, name: string) => page.screenshot({ path: `docs/qa/screenshots/m1/${name}.png`, fullPage: true });
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
/** Starts one disposable server per group in the desktop project only (mobile widths are set explicitly in group 3). */
function disposableGroup(port: number) {
  let server: DisposableServer | undefined;
  // eslint-disable-next-line no-empty-pattern -- Playwright requires object destructuring for fixtures
  test.beforeAll(async ({}, info) => { if (info.project.name === 'desktop') server = await startDisposableServer(port); });
  test.afterAll(async () => { await server?.stop(); });
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'desktop', 'Disposable-server group runs once, in the desktop project'); });
  return () => server!;
}

async function passportFixture(page: Page, mutate: (entry: Record<string, unknown>, e: Experiment) => void) {
  const e = ExperimentResponseSchema.parse(await (await page.request.get('/api/experiments/bass2-b20')).json()).data;
  const { datasetVersion } = (await (await page.request.get('/api/health')).json()).data;
  const claim = e.claims[0]!;
  const state = createGameState(datasetVersion, 'normal', '2026-10-15T00:00:00.000Z');
  const entry: Record<string, unknown> = { id: 'review-entry', missionId: 'station-arrival', experimentIds: [e.id], claimIds: [claim.id], observationType: 'observed',
    evidenceLevel: 'direct', conclusion: 'Learner conclusion', citations: claim.citations, limitations: [...e.limitations], learnerNotes: ['My note'], corrections: [],
    setupRevision: null, status: 'current', scenario: 'research', createdAt: '2026-10-15T00:00:00.000Z' };
  mutate(entry, e);
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [saveKey('normal'), JSON.stringify({ ...state, passport: { ...state.passport, entries: [entry] } })]);
  return e;
}

test.describe('real HTTP: Ask, research tools and Passport trust', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ baseURL: 'http://127.0.0.1:3231' });
  disposableGroup(3231);

  test('supported answers, abstentions and repeated/quarantined references (6 POSTs)', async ({ page }) => {
    await page.goto('/ask');
    for (const [question, abstained] of [['What happened in B20?', false], ['Can this certify a lunar habitat?', true], ['B16 '.repeat(999).trim(), true],
      ['B999 '.repeat(799).trim(), true], ['B20 '.repeat(999).trim(), false], ['What happened to cotton?', true]] as const) {
      await page.getByLabel('Your research question').fill(question);
      const response = page.waitForResponse((r) => r.url().endsWith('/api/ask'));
      await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
      expect((await response).status()).toBe(200);
      await expect(page.getByTestId(abstained ? 'pix-abstention' : 'pix-answer')).toBeVisible();
      await expect(page.getByTestId(abstained ? 'pix-answer' : 'pix-abstention')).toHaveCount(0);
    }
    await expect(page.getByText(/no AI model was used/)).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
  });

  test('F2: retry resends the exact submitted question and conditions; suggestions carry visible conditions (2 POSTs)', async ({ page }) => {
    const bodies: unknown[] = [];
    await page.route('**/api/ask', async (r) => { bodies.push(r.request().postDataJSON()); if (bodies.length === 1) await r.abort(); else await r.continue(); });
    await page.goto('/ask');
    await page.getByLabel('Your research question').fill('What happened in B20?');
    await page.getByText('Add target conditions (optional)').click();
    await page.getByLabel('Material', { exact: true }).fill('cotton');
    await page.getByLabel('Oxygen (vol%)').fill('21');
    await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
    await expect(page.locator('.notice[role="alert"]')).toContainText('could not be reached');
    // Editing the draft after a failure must not leak into the retry of the failed request.
    await page.getByLabel('Material', { exact: true }).fill('PMMA');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('pix-answer').or(page.getByTestId('pix-abstention'))).toBeVisible();
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[0]).toEqual({ question: 'What happened in B20?', targetConditions: { material: 'cotton', oxygenPct: 21 } });
    await expect(page.getByTestId('pix-request-conditions')).toHaveText('material cotton · oxygen 21 vol%');
    await shot(page, 'ask-retry-conditions-desktop');

    await page.getByRole('button', { name: 'What happened in B19?' }).click();
    await expect(page.getByTestId('pix-abstention')).toBeVisible();
    expect(bodies[2]).toEqual({ question: 'What happened in B19?', targetConditions: { material: 'PMMA', oxygenPct: 21 } });
    await expect(page.getByTestId('pix-request-conditions')).toHaveText('material PMMA · oxygen 21 vol%');
  });

  test('F3: a delayed older answer or error never replaces the newer abstention (2 POSTs)', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let started!: () => void;
    const firstStarted = new Promise<void>((r) => { started = r; });
    await page.route('**/api/ask', async (r: Route) => {
      if (r.request().postDataJSON().question !== 'What does B20 establish about airflow?') return r.continue();
      const response = await r.fetch(); // real backend answer, held back
      started(); await gate;
      await r.fulfill({ response }).catch(() => undefined); // the browser may already have cancelled it
    });
    await page.goto('/ask');
    await page.getByRole('button', { name: 'What does B20 establish about airflow?' }).click();
    await firstStarted;
    await page.getByRole('button', { name: 'What happened in B19?' }).click();
    await expect(page.getByTestId('pix-abstention')).toBeVisible();
    release();
    await page.waitForTimeout(600);
    await expect(page.getByTestId('pix-abstention')).toBeVisible();
    await expect(page.getByTestId('pix-answer')).toHaveCount(0);
    await expect(page.getByTestId('pix-request')).toContainText('What happened in B19?');
    await shot(page, 'ask-latest-wins-desktop');

    // A stale failure must not replace the newer result either (mocked transport, no POST reaches the server).
    let releaseError!: () => void;
    const errorGate = new Promise<void>((r) => { releaseError = r; });
    await page.unroute('**/api/ask');
    await page.route('**/api/ask', async (r) => { if (r.request().postDataJSON().question === 'stale question') { await errorGate; await r.abort().catch(() => undefined); } else await r.fulfill({ status: 503, json: { apiVersion: '1', error: { code: 'PROVIDER_UNAVAILABLE', message: 'Newer request failed safely.', retryable: true } } }); });
    await page.getByLabel('Your research question').fill('stale question');
    await page.getByRole('button', { name: 'Ask PIX', exact: true }).click();
    await page.getByLabel('Your research question').fill('newer question');
    await page.getByRole('button', { name: /Ask again|Ask PIX/ }).click();
    await expect(page.locator('.notice[role="alert"]')).toContainText('Newer request failed safely.');
    releaseError();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('pix-request')).toContainText('newer question');
    await expect(page.locator('.notice[role="alert"]')).toContainText('Newer request failed safely.');
    await expect(page.locator('.notice[role="alert"]')).not.toContainText('could not be reached');
  });

  test('workstation, frontier and compare over real HTTP (4 POSTs)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByLabel('Research question', { exact: true }).fill('What is the flame temperature in B20?');
    await page.getByLabel('Material', { exact: true }).fill('PMMA');
    await page.getByRole('button', { name: 'Trace the evidence' }).click();
    await expect(page.getByText('evidence level: gap')).toBeVisible();
    await expect(page.getByRole('meter', { name: /Retrieval relevance .* not evidence strength/ })).toBeVisible();
    await page.getByRole('button', { name: /recorded B20 observation/ }).click();
    await expect(page.getByText('evidence level: direct')).toBeVisible();
    await expect(page.getByTestId('ws-request')).toContainText('Oxygen 17.4 vol%'); // human labels, presentation only
    await page.goto('/gaps');
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByRole('row', { name: /Pressure/ }).getByText('Not recorded', { exact: true })).toBeVisible();
    await page.goto('/compare');
    await page.getByRole('button', { name: /Request comparison/ }).click();
    await expect(page.getByText('Comparison refused by the evidence service.')).toBeVisible();
    await expect(page.getByText(/quarantined/).last()).toBeVisible();
  });

  test('F1: Passport shows canonical caveats only from the catalog; saved prose stays untrusted (4 POSTs)', async ({ page }) => {
    await page.goto('/passport');
    await expect(page.getByTestId('passport-empty')).toBeVisible();

    // Fixture 1 (Astra): caveats replaced by learner prose. Real validation rejects it; real caveats still shown from the catalog.
    const e = await passportFixture(page, (entry) => { entry.limitations = ['Learner says there are no scientific limitations.']; });
    await page.reload();
    await expect(page.getByTestId('passport-invalid')).toContainText('Scientific validation failed');
    const canonical = page.getByTestId('canonical-limitations');
    for (const limitation of e.limitations) await expect(canonical.getByText(limitation, { exact: true })).toBeVisible();
    await expect(canonical.getByText('Learner says there are no scientific limitations.')).toHaveCount(0);
    await expect(page.getByTestId('untrusted-limitations')).toContainText('Learner says there are no scientific limitations.');
    await expect(page.getByTestId('missing-caveats')).toBeVisible();
    await shot(page, 'passport-invalid-desktop');

    // Fixture 2 (Astra): real caveats kept plus an appended lunar-safety claim. Lineage passes; the claim must never look canonical.
    const injected = 'Learner-added claim: this record certifies lunar habitat fire safety.';
    await passportFixture(page, (entry, x) => { entry.limitations = [...x.limitations, injected]; });
    await page.reload();
    await expect(page.getByTestId('passport-valid')).toContainText('1 saved statement is not part of the source record');
    await expect(page.locator('.limits').getByText(injected, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('canonical-limitations').getByText(injected)).toHaveCount(0);
    await expect(page.getByTestId('untrusted-content')).toContainText(injected);
    await expect(page.getByTestId('untrusted-content')).toContainText('Learner-authored · not verified, not NASA evidence');
    await shot(page, 'passport-injected-claim-desktop');

    // Transport failure is "Could not validate", never "failed"; Retry then reaches the real validator.
    await passportFixture(page, () => undefined);
    await page.route('**/api/passport/validate', (r) => r.abort());
    await page.reload();
    await expect(page.getByTestId('passport-unvalidated')).toContainText('Could not validate');
    await expect(page.getByTestId('passport-invalid')).toHaveCount(0);
    await expect(page.getByTestId('canonical-limitations')).toBeVisible();
    await page.unroute('**/api/passport/validate');
    await page.getByRole('button', { name: 'Retry validation' }).click();
    await expect(page.getByTestId('passport-valid')).toBeVisible();
    await expect(page.getByTestId('untrusted-content')).toContainText('My note');

    await page.evaluate(([key]) => localStorage.setItem(key!, '{not json'), [saveKey('normal')]);
    await page.reload();
    await expect(page.getByTestId('passport-recovery')).toContainText('has not been changed or deleted');
  });
});

test.describe('real HTTP: production rate limit', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ baseURL: 'http://127.0.0.1:3232' });
  disposableGroup(3232);

  test('30 POSTs accepted, then Ask and Passport report the budget honestly with no answer or verdict', async ({ page }) => {
    for (let i = 0; i < 30; i++) expect((await page.request.post('/api/ask', { data: { question: 'What happened in B20?', targetConditions: {} } })).status()).toBe(200);
    await page.goto('/ask');
    await page.getByRole('button', { name: 'What happened in B19?' }).click();
    const alert = page.locator('.notice[role="alert"]');
    await expect(alert).toContainText('Request budget reached');
    await expect(alert).toContainText(/Retry in about \d+ s/);
    await expect(page.getByTestId('pix-answer')).toHaveCount(0);
    await expect(page.getByTestId('pix-abstention')).toHaveCount(0);

    await page.goto('/passport');
    await passportFixture(page, () => undefined);
    await page.reload();
    await expect(page.getByTestId('passport-unvalidated')).toContainText('Could not validate');
    await expect(page.getByTestId('passport-invalid')).toHaveCount(0);
    await expect(page.getByTestId('passport-valid')).toHaveCount(0);
  });
});

test.describe('real HTTP: populated research views at mobile widths (F6)', () => {
  test.describe.configure({ mode: 'serial' });
  const server = disposableGroup(3233);

  for (const width of [390, 320]) test(`no document overflow after results at ${width} px (3 POSTs)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', baseURL: server().url });
    const page = await context.newPage();
    await page.goto('/gaps');
    expect(await noOverflow(page), `empty /gaps @${width}`).toBe(true);
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    expect(await noOverflow(page), `populated /gaps @${width}`).toBe(true);
    const region = page.getByRole('region', { name: 'Coverage matrix (scrolls horizontally on narrow screens)' });
    await region.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    if (await region.evaluate((el) => el.scrollWidth > el.clientWidth)) // keyboard reaches every column inside the local region
      await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await noOverflow(page), `scrolled /gaps @${width}`).toBe(true);
    await expect(page.getByRole('row', { name: /Pressure/ }).getByText('Not recorded', { exact: true })).toBeAttached();
    await shot(page, `frontier-populated-${width}`);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /recorded B20 observation/ }).click();
    await expect(page.getByText('evidence level: direct')).toBeVisible();
    expect(await noOverflow(page), `populated /dashboard @${width}`).toBe(true);
    await shot(page, `workstation-populated-${width}`);

    await page.goto('/ask');
    await page.getByRole('button', { name: 'What happened in B19?' }).click();
    await expect(page.getByTestId('pix-abstention')).toBeVisible();
    expect(await noOverflow(page), `populated /ask @${width}`).toBe(true);
    await shot(page, `ask-populated-${width}`);
    await context.close();
  });
});

test.describe('real HTTP: Passport with unknown and inherited-name references (Astra final review)', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ baseURL: 'http://127.0.0.1:3234' });
  disposableGroup(3234);

  /** Seeds a passport whose entry references `ids`, reloads, and returns the exact raw save written to storage. */
  async function seedReferences(page: Page, ids: string[]) {
    await page.goto('/passport');
    await passportFixture(page, (entry) => { entry.experimentIds = ids; });
    const raw = await page.evaluate((key) => localStorage.getItem(key)!, saveKey('normal'));
    await page.reload();
    return raw;
  }
  async function expectRawDownload(page: Page, raw: string) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the raw save' }).click();
    const file = await download;
    expect(await readFile((await file.path())!, 'utf8')).toBe(raw); // byte-for-byte the stored save
    expect(await page.evaluate((key) => localStorage.getItem(key), saveKey('normal'))).toBe(raw); // storage untouched
  }
  const trackErrors = (page: Page) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // A real 400 from the validator is logged by the browser as a failed resource; that is expected, not a crash.
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    return errors;
  };

  for (const id of ['constructor', 'prototype', 'bass2-b999']) test(`schema-valid unknown reference "${id}" is rejected, inspectable and recoverable (${id === 'constructor' ? 3 : 1} POSTs)`, async ({ page }) => {
    const errors = trackErrors(page);
    const raw = await seedReferences(page, [id]);
    await expect(page.getByTestId('passport-invalid')).toContainText('Scientific validation failed');
    await expect(page.getByTestId('unknown-references')).toContainText(id);
    await expect(page.getByTestId('canonical-limitations')).toHaveCount(0); // nothing borrowed from B20 or an inherited property
    await expect(page.getByTestId('passport-valid')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Evidence could not be loaded' })).toHaveCount(0);
    await expect(page.getByTestId('passport-entry-unrenderable')).toHaveCount(0);
    if (id === 'constructor') {
      for (let i = 0; i < 2; i++) { // repeated retries after a real 400 keep the interface working
        await page.getByRole('button', { name: 'Check again' }).click();
        await expect(page.getByTestId('passport-invalid')).toContainText('Scientific validation failed');
      }
      await page.screenshot({ path: 'docs/qa/screenshots/m1/passport-unknown-reference-desktop.png', fullPage: true });
    }
    await expectRawDownload(page, raw);
    expect(errors).toEqual([]);
  });

  for (const id of ['__proto__', 'toString', 'hasOwnProperty']) test(`schema-invalid reference "${id}" is malformed stored data with recovery intact (0 POSTs)`, async ({ page }) => {
    const errors = trackErrors(page);
    const raw = await seedReferences(page, [id]);
    await expect(page.getByTestId('passport-recovery')).toContainText('has not been changed or deleted');
    await expect(page.getByTestId('passport-loaded')).toHaveCount(0);
    await expectRawDownload(page, raw);
    expect(errors).toEqual([]);
  });

  test('mixed valid and unknown references: B20 canon only from the catalog, unknown stays unverified (1 POST)', async ({ page }) => {
    const errors = trackErrors(page);
    const raw = await seedReferences(page, ['bass2-b20', 'constructor']);
    await expect(page.getByTestId('passport-invalid')).toBeVisible();
    await expect(page.getByTestId('unknown-references')).toContainText('constructor');
    const e = ExperimentResponseSchema.parse(await (await page.request.get('/api/experiments/bass2-b20')).json()).data;
    const canonical = page.getByTestId('canonical-limitations');
    for (const limitation of e.limitations) await expect(canonical.getByText(limitation, { exact: true })).toBeVisible();
    await expect(canonical.locator('li')).toHaveCount(e.limitations.length);
    await expectRawDownload(page, raw);
    expect(errors).toEqual([]);
  });

  test('valid B20 reference still validates with catalog caveats (1 POST)', async ({ page }) => {
    const errors = trackErrors(page);
    const raw = await seedReferences(page, ['bass2-b20']);
    await expect(page.getByTestId('passport-valid')).toBeVisible();
    await expect(page.getByTestId('unknown-references')).toHaveCount(0);
    await expect(page.getByTestId('canonical-limitations')).toBeVisible();
    await expectRawDownload(page, raw);
    expect(errors).toEqual([]);
  });

  test('other research routes treat inherited names as unknown, never as records (0 POSTs)', async ({ page }) => {
    for (const id of ['constructor', 'prototype', 'toString', '__proto__', 'hasOwnProperty']) {
      // Soft 404 (status 200 while streaming) is pre-existing route behaviour; the safety property is: no record is rendered.
      for (const path of [`/experiments/${id}`, `/${id}`]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { name: 'Record or route not found' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Documented observation' })).toHaveCount(0);
      }
    }
    await page.goto('/atlas?q=constructor');
    await expect(page.getByText('No admitted record matches.')).toBeVisible();
  });
});
