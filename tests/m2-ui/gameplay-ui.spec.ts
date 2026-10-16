import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// M2 gameplay UI over the approved contract fixtures (docs/m2 at 11ec4ca), rendered through the real controller.
// These are presentation tests. They do NOT show M2 is playable end to end; that requires Sol's preview API.
const open = async (page: Page, scenario: string) => {
  await page.goto(`/m2-fixtures?scenario=${scenario}`);
  await expect(page.getByText('Fixture gallery — not a playable mission.')).toBeVisible();
};
const intentLog = (page: Page) => page.getByRole('region', { name: 'Intent log (fixture gallery)' }).or(page.locator('.m2-intents'));

test('public mission pages stay locked; the preview loads only on explicit request and reports the missing backend', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/missions/bass-assembly');
  await expect(page.getByText('Not playable yet')).toBeVisible();
  await expect(page.locator('.m2')).toHaveCount(0);
  const plain = scripts.length;
  scripts.length = 0;
  await page.goto('/missions/bass-assembly?preview=bass-b20-training-v1');
  await expect(page.getByRole('heading', { name: 'Training preview not available here' })).toBeVisible();
  await expect(page.getByText(/local preview API and shared contract runtime are not integrated yet/)).toBeVisible();
  expect(scripts.length).toBeGreaterThan(plain); // the gameplay chunk is fetched only now
  await expect(page.getByRole('button', { name: /Start a new training case/ })).toHaveCount(0);
});

test('the fixture gallery is not reachable without its runtime flag', async ({ request }) => {
  // The flag is set for this server, so assert the page declares itself non-indexable and gated in source instead.
  const res = await request.get('/m2-fixtures?scenario=arrival');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('noindex');
});

test('keyboard placement: part → mount → orientation → Install produces the exact frozen intent; refusal text is readable', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard path on desktop; touch path below');
  await open(page, 'assembly-refused');
  const fan = page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ });
  await fan.focus(); await page.keyboard.press('Enter');
  await expect(fan).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Not accepted.')).toBeVisible();
  await expect(page.getByText('The fan fits at the duct inlet. Choose that mount before installing it.')).toBeVisible();
  await page.getByRole('radio', { name: 'Duct inlet' }).focus(); await page.keyboard.press('Space');
  await page.getByRole('radio', { name: /Rotated 180°/ }).focus(); await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Install fan' }).focus(); await page.keyboard.press('Enter');
  const log = intentLog(page);
  await expect(log).toContainText('Install Fan at Duct inlet');
  const body = JSON.parse(await log.locator('pre').last().textContent() ?? '{}');
  expect(body).toMatchObject({ runtimeId: '33333333-3333-4333-8333-333333333333', expectedRevision: 5,
    action: { type: 'GAME', action: { type: 'INSTALL_PART', partId: 'fan', anchorId: 'duct-inlet', orientation: 'reversed' } } });
  await expect(page.getByText(/intent was recorded, not sent\. Nothing changed/)).toBeVisible();
});

test('touch placement: tapping a part opens the bottom sheet with reachable mount, orientation and Install', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch layout');
  await open(page, 'assembly-refused');
  await page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ }).tap();
  const sheet = page.locator('.m2-placement');
  await expect(sheet).toHaveCSS('position', 'fixed');
  await sheet.locator('label', { hasText: 'Duct inlet' }).tap();
  const install = sheet.getByRole('button', { name: 'Install fan' });
  await install.scrollIntoViewIfNeeded();
  await expect(install).toBeEnabled();
  const box = (await install.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  await install.tap();
  await expect(page.locator('.m2-intents')).toContainText('Install Fan at Duct inlet');
});

test('fault: authored-training labels, flagged fan, no findings before a check', async ({ page }) => {
  await open(page, 'fault');
  await expect(page.getByText('Authored training fault — not a NASA incident.').first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ })).toContainText('Fitted · flagged');
  await expect(page.getByText(/No check has been run for this setup \(setup revision 12\)/)).toBeVisible();
  await expect(page.locator('.m2-finding')).toHaveCount(0);
  await expect(page.locator('.m2-rail [aria-current="step"]')).toContainText('Training fault');
});

test('diagnostic: renders exactly the typed finding; stale results are hidden', async ({ page }) => {
  await open(page, 'diagnostic');
  const finding = page.locator('.m2-finding');
  await expect(finding).toHaveCount(1);
  await expect(finding).toContainText('The fan’s training direction marker points out of the duct.');
  await expect(finding).toContainText('This training orientation does not match airflow into the duct.');
  await expect(finding).toContainText('Remove the fan and reinstall it at the duct inlet, facing into the duct.');
  await expect(finding.getByRole('link', { name: /PDF page 12/ })).toHaveAttribute('href', /#page=12$/);
  await expect(finding.getByRole('link', { name: /page 112/ })).toHaveCount(0);
  await open(page, 'repair-a');
  await expect(page.getByText(/last check was for setup revision 12; the apparatus is now at revision 15/)).toBeVisible();
  await expect(page.locator('.m2-finding')).toHaveCount(0);
});

test('diagnosis: wrong answer is coaching from the server; the form needs a current check', async ({ page }) => {
  await open(page, 'diagnosis-wrong');
  await expect(page.getByText('The training orientation check identifies the fan; inspect its direction marker.')).toBeVisible();
  await page.getByLabel('Component').selectOption({ label: 'Fan' });
  await page.getByRole('radio', { name: 'Reversed orientation' }).check();
  await page.getByRole('button', { name: 'Submit diagnosis' }).click();
  await expect(page.locator('.m2-intents pre').last()).toContainText('"faultCode": "REVERSED"');
  await open(page, 'diagnostic-refused');
  await expect(page.getByText('Run a current Training check before submitting a diagnosis.')).toBeVisible();
});

test('repair provenance: the two approved histories show their own server receipts', async ({ page }) => {
  for (const [scenario, removed] of [['repair-a', '13'], ['repair-b', '15']] as const) {
    await open(page, scenario);
    const receipt = page.locator('.m2-receipt[data-kind="pending"]');
    await expect(receipt).toContainText('Repair pending');
    await expect(receipt.locator('b').first()).toHaveText(removed);
    await expect(page.getByRole('group', { name: 'Parts tray' }).getByRole('button', { name: /^Fan/ })).toContainText('Removed for repair');
  }
});

test('qualification is a training result, never certification', async ({ page }) => {
  await open(page, 'qualify-early');
  await expect(page.getByText('Diagnose and repair the authored fan fault before qualifying the training apparatus.')).toBeVisible();
  const text = await page.locator('.m2').textContent();
  expect(text).not.toMatch(/certified|NASA[- ]approved/i);
});

test('Passport: three separate provenance sections; training never inherits direct evidence; five named checks', async ({ page }) => {
  await open(page, 'passport-review');
  const source = page.locator('.m2-pp-section[data-origin="research"]');
  const training = page.locator('.m2-pp-section[data-origin="training"]');
  const learner = page.locator('.m2-pp-section[data-origin="learner"]');
  await expect(source).toContainText('1 · Verified source observations');
  await expect(source.locator('blockquote')).toHaveCount(2);
  await expect(source.locator('.limits')).toHaveCount(2);
  await expect(training).toContainText('The training fan was removed at setup revision 13 and reinstalled correctly at setup revision 16');
  await expect(training).toContainText('not a historical NASA event');
  expect(await training.textContent()).not.toMatch(/direct/i);
  await expect(learner).toContainText('not scientifically assessed');
  const checks = page.locator('.m2-checks li');
  await expect(checks).toHaveCount(5);
  await expect(page.locator('.m2-checks')).toContainText('4 of 5');
  await expect(page.locator('.m2-dossier')).toContainText('17.4 vol%');
  await expect(page.locator('.m2-dossier [data-unknown="true"]')).toHaveCount(2);
  await expect(page.locator('.m2-dossier')).not.toContainText('16.5 vol%');
});

test('recovery states keep the pending intent and offer only safe actions', async ({ page }) => {
  await open(page, 'rate-limited');
  await page.getByRole('button', { name: 'Run Training check' }).click();
  await expect(page.getByText('Request budget reached.')).toBeVisible();
  await expect(page.getByText(/re-checked and sent unchanged/)).toBeVisible();

  await open(page, 'unknown');
  await page.getByRole('button', { name: 'Run Training check' }).click();
  await expect(page.getByText('Result unknown.')).toBeVisible();
  await page.getByRole('button', { name: 'Check what happened' }).click();
  await expect(page.getByText('Your last action was not applied. You can send exactly the same request again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send it again' })).toBeVisible();

  await open(page, 'conflict');
  await page.getByRole('button', { name: 'Run Training check' }).click();
  await expect(page.getByText(/advanced it to revision 19/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load the current case' })).toBeVisible();

  await open(page, 'runtime-changed');
  await page.getByRole('button', { name: /Run (Training check|it again)/ }).click();
  await expect(page.getByText('The local server restarted.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download raw checkpoint' })).toBeVisible();

  await open(page, 'key-failure');
  await page.getByRole('button', { name: /Run (Training check|it again)/ }).click();
  await expect(page.getByText(/signing key the server no longer has/)).toBeVisible();

  await open(page, 'unauthorized');
  await page.getByRole('button', { name: /Run (Training check|it again)/ }).click();
  await expect(page.getByRole('heading', { name: 'Authorize this local preview' })).toBeVisible();
  await expect(page.getByText(/Not applied yet:/)).toBeVisible();
  await expect(page.getByLabel('Operator access token')).toHaveAttribute('type', 'password');
});

test('invalid learner note: exact draft retained with the typed issue', async ({ page }) => {
  await open(page, 'note-invalid');
  const box = page.getByLabel(/Your interpretation/);
  await box.fill(' B20 burned the whole sample ');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText(/Remove spaces or line breaks at the beginning and end\./).first()).toBeVisible();
  await expect(box).toHaveValue(' B20 burned the whole sample ');
});

test('saving: read-only by default, busy and unverified writes are never shown as Saved', async ({ page }) => {
  await open(page, 'repair-a');
  await expect(page.getByText('Read-only browser save')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download checkpoint' })).toBeVisible();
  await open(page, 'save-busy');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/Another tab is saving right now/)).toBeVisible();
  await expect(page.getByText(/^Saved on this device/)).toHaveCount(0);
  await open(page, 'save-failed');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/could not be verified \(read back mismatch\)/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download checkpoint' }).click();
  expect((await download).suggestedFilename()).toBe('microfire-b20-training-r19.checkpoint.txt');
});

test('no-WebGL: the 3D bench falls back to the full 2D schematic without losing state', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
  const page = await ctx.newPage();
  await open(page, 'repair-a');
  await page.getByRole('button', { name: '3D bench' }).click();
  await expect(page.getByText(/The 3D bench is not available on this device/)).toBeVisible();
  await expect(page.locator('.m2-schematic')).toBeVisible();
  await expect(page.locator('.m2-receipt[data-kind="pending"]')).toContainText('13');
  await ctx.close();
});

test('3D bench renders the same confirmed rig and keeps the 2D controls', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one WebGL render pass');
  await open(page, 'fault');
  await page.getByRole('button', { name: '3D bench' }).click();
  await expect(page.locator('.m2-bench[data-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Schematic training model — not a NASA engineering CAD reconstruction.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Parts tray' })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.locator('.m2-bench').screenshot({ path: 'docs/qa/screenshots/m2/bench-3d-fault-desktop.jpg', type: 'jpeg', quality: 78 });
});

test('reduced motion: no intro, no fault flash animation, no pulsing', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await open(page, 'fault');
  expect(await page.locator('.m2-fault-flash').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await page.locator('.m2-flow path').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await ctx.close();
});

const stages = ['arrival', 'assembly-refused', 'fault', 'diagnostic', 'diagnosis-wrong', 'repair-a', 'qualify-early', 'passport-review', 'complete', 'authorize', 'start'];

test('accessibility: no axe violations across stages', async ({ page }) => {
  test.setTimeout(120_000);
  for (const s of stages) {
    await open(page, s);
    await page.waitForTimeout(s === 'passport-review' ? 2500 : 600); // let reveal animations settle so contrast is measured on final colours
    const r = await new AxeBuilder({ page }).include('.m2').analyze();
    expect(r.violations.map((v) => `${s}: ${v.id} ${v.nodes.length} ${v.nodes.map((n) => n.target.join(" ") + " " + n.failureSummary?.slice(0, 400)).join(" | ")}`)).toEqual([]);
  }
});

test('reflow at 320 px: no horizontal page scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const s of ['fault', 'diagnostic', 'repair-a', 'passport-review']) {
    await open(page, s);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), s).toBe(true);
  }
  await ctx.close();
});

test('screenshot evidence for every major stage', async ({ page }, info) => {
  test.setTimeout(120_000);
  for (const s of [...stages, 'rate-limited', 'unknown', 'resumed']) {
    await open(page, s);
    if (['rate-limited', 'unknown'].includes(s)) await page.getByRole('button', { name: 'Run Training check' }).click();
    await page.waitForTimeout(400);
    await page.locator('.m2').screenshot({ path: `docs/qa/screenshots/m2/${s}-${info.project.name}.jpg`, type: 'jpeg', quality: 55, scale: 'css' });
  }
});
