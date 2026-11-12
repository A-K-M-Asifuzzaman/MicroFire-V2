import { spawn, type ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Review-route gate over real HTTP against this tree's production build: each environment is its own `next start`.
// /design (all pages) and /m2-fixtures answer 200 only for a local server with the route's flag and an exact loopback
// authority. Every hosted environment, hostile or malformed authority, forwarded-host disagreement, missing Host and
// path variant is denied without review content. Hosted cases set exactly one marker; every other marker is stripped
// (and asserted absent), so one marker can never mask another — Astra R1 was VERCEL_ENV alone.
test.describe.configure({ mode: 'serial' });

const REVIEW_PATHS = ['/design', '/design/a', '/design/a/lab', '/design/a/b20', '/design/b', '/design/b/lab', '/design/b/b20', '/m2-fixtures'] as const;
const PATH_VARIANTS = ['/%64esign', '/design%2Fa', '/%6d2-fixtures', '/design/a/%62%32%30', '/design.rsc', '/m2-fixtures.rsc', '/design/?_rsc=1',
  '/design//a', '/design/a/', '/DESIGN', '/m2-fixtures?scenario=fault', '/design/a/lab?_rsc=abc'] as const;
const LEAKS = ['M2 fixture gallery', 'Choose a direction', 'Orbital observatory', 'Living science adventure', 'START_RESPONSE', 'Design review', 'MICROFIRE_DESIGN_REVIEW', 'MICROFIRE_M2_FIXTURE_GALLERY'];
const reviewToken = randomBytes(32).toString('base64url');
const FLAGS = { MICROFIRE_DESIGN_REVIEW: '1', MICROFIRE_M2_FIXTURE_GALLERY: '1' };
const MARKERS = ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_REGION', 'VERCEL_DEPLOYMENT_ID', 'NOW_REGION', 'NETLIFY', 'CF_PAGES', 'AWS_LAMBDA_FUNCTION_NAME',
  'AWS_EXECUTION_ENV', 'LAMBDA_TASK_ROOT', 'K_SERVICE', 'GAE_SERVICE', 'RENDER', 'FLY_APP_NAME', 'RAILWAY_ENVIRONMENT', 'DYNO', 'WEBSITE_SITE_NAME'] as const;

type Config = { id: string; name: string; env: Record<string, string>; open: boolean };
const CONFIGS: Config[] = [
  { id: 'A', name: 'local, review flags absent', env: {}, open: false },
  { id: 'B', name: 'local, review flags enabled', env: FLAGS, open: true },
  { id: 'C', name: 'VERCEL=1, flags enabled', env: { ...FLAGS, VERCEL: '1' }, open: false },
  { id: 'D', name: 'Astra R1: VERCEL_ENV=production, VERCEL unset, flags enabled', env: { ...FLAGS, VERCEL_ENV: 'production' }, open: false },
  { id: 'E', name: 'Astra R1: VERCEL_ENV=preview, VERCEL unset, flags enabled', env: { ...FLAGS, VERCEL_ENV: 'preview' }, open: false },
  { id: 'F', name: 'VERCEL_ENV=development, VERCEL unset, flags enabled', env: { ...FLAGS, VERCEL_ENV: 'development' }, open: false },
  { id: 'G', name: 'custom VERCEL_ENV=qa-custom-env, VERCEL unset, flags enabled', env: { ...FLAGS, VERCEL_ENV: 'qa-custom-env' }, open: false },
  { id: 'G0', name: 'VERCEL_ENV defined but empty, flags enabled', env: { ...FLAGS, VERCEL_ENV: '' }, open: false },
  ...MARKERS.filter((m) => m !== 'VERCEL' && m !== 'VERCEL_ENV').map((m) => ({ id: `H:${m}`, name: `${m} alone, flags enabled`, env: { ...FLAGS, [m]: 'x' }, open: false }))
];

type Reply = { status: number; csp: string | undefined; body: string; location: string | undefined };
const once = (port: number, p: string, headers: Record<string, string>) => new Promise<Reply>((resolve, reject) => {
  const req = httpRequest({ host: '127.0.0.1', port, path: p, headers: { 'x-microfire-review-token': reviewToken, ...headers }, setHost: false }, (res) => {
    let body = ''; res.setEncoding('utf8'); res.on('data', (c) => { body += c; });
    res.on('end', () => resolve({ status: res.statusCode ?? 0, csp: res.headers['content-security-policy'] as string | undefined, body, location: res.headers.location }));
  });
  req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('timeout'))); req.end();
});
/** An RSC request without Next's `_rsc` cache key is answered 307 to the keyed URL: follow that one hop, as the router does. */
const get = async (port: number, p: string, headers: Record<string, string>) => {
  const r = await once(port, p, headers);
  if (!headers.rsc || r.status !== 307 || !r.location) return r;
  const next = new URL(r.location, 'http://x');
  return once(port, next.pathname + next.search, headers);
};
/** HTTP/1.0 with no Host header at all (HTTP/1.1 clients cannot omit it). */
const noHost = (port: number, p: string) => new Promise<{ status: number; body: string }>((resolve, reject) => {
  const s = connect(port, '127.0.0.1', () => s.write(`GET ${p} HTTP/1.0\r\nConnection: close\r\n\r\n`));
  let raw = ''; s.setEncoding('utf8'); s.on('data', (c) => { raw += c; }); s.on('error', reject);
  s.on('end', () => resolve({ status: Number(/^HTTP\/1\.[01] (\d{3})/.exec(raw)?.[1] ?? 0), body: raw }));
});

async function serve(port: number, extra: Record<string, string>) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production' };
  for (const k of [...MARKERS, 'MICROFIRE_DESIGN_REVIEW', 'MICROFIRE_M2_FIXTURE_GALLERY']) delete env[k];
  Object.assign(env, { MICROFIRE_REVIEW_ACCESS_TOKEN: reviewToken }, extra);
  for (const m of MARKERS) expect(m in env, `only the configured marker is present: ${m}`).toBe(m in extra);
  const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: path.resolve('apps/web'), env, stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    try { if ((await once(port, '/', { host: `127.0.0.1:${port}` })).status === 200) return child; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill(); throw new Error(`server for ${JSON.stringify(extra)} did not start`);
}

/** Authorities that never pass (Astra R2 first). Whitespace-padded values are omitted: HTTP parsing strips that padding. */
const HOSTILE = ['evil.example@localhost', 'localhost@evil.example', 'localhost.evil.example', '127.0.0.1.evil.example', 'localhost:invalid', 'localhost/path',
  'localhost?x=1', 'localhost#x', 'localhost%40evil.example', 'user:pass@localhost', 'localhost\\evil.example', 'localhost evil', 'LOCALHOST', 'LocalHost',
  'localhost.', '127.1', '127.0.0.2', '0.0.0.0', '[::1', '[0:0:0:0:0:0:0:1]', '[::ffff:127.0.0.1]', 'localhost:0', 'localhost:03240', 'localhost:65536',
  'localhost:', 'localhost, evil.example', '%6Cocalhost', 'evil.example', 'microfire-v2-preview.vercel.app', ''];

const matrix: string[] = [];
test.afterAll(() => { if (matrix.length) console.log(['config | request | path | status', ...matrix].join('\n')); });
const record = (c: Config, label: string, p: string, status: number) => { matrix.push(`${c.id} ${c.name} | ${label} | ${p} | ${status}`); };
const noLeak = (body: string, where: string) => { for (const l of LEAKS) expect(body, `${where} must not contain ${l}`).not.toContain(l); };

CONFIGS.forEach((c, i) => {
  test(`review routes ${c.id}: ${c.name} → ${c.open ? 'ALLOW on exact loopback authority only' : 'DENY everything'}`, async () => {
    test.skip(test.info().project.name !== 'desktop', 'server-side matrix: once');
    test.setTimeout(180000);
    const port = 3500 + i;
    let child: ChildProcess | undefined;
    try {
      child = await serve(port, c.env);
      const loopback: [string, Record<string, string>][] = [
        [`Host 127.0.0.1:${port}`, { host: `127.0.0.1:${port}` }],
        [`Host localhost:${port}`, { host: `localhost:${port}` }],
        [`Host [::1]:${port}`, { host: `[::1]:${port}` }],
        ['Host localhost', { host: 'localhost' }],
        ['Host 127.0.0.1', { host: '127.0.0.1' }],
        ['RSC data request, loopback', { host: `127.0.0.1:${port}`, rsc: '1' }],
        ['X-Forwarded-Host equal to Host', { host: `127.0.0.1:${port}`, 'x-forwarded-host': `127.0.0.1:${port}` }]
      ];
      // L: in hosted environments these exact loopback authorities are forged and must still be denied.
      for (const [label, h] of loopback) for (const p of REVIEW_PATHS) {
        const r = await get(port, p, h);
        record(c, label, p, r.status);
        expect(r.status, `${c.id} · ${label} · ${p}`).toBe(c.open ? 200 : 404);
        expect(r.csp, 'CSP present').toContain("default-src 'self'");
        if (!c.open) noLeak(r.body, `${c.id} ${label} ${p}`);
      }
      // I/J: hostile and malformed authorities (Astra R2 first); K: forwarded-host disagreement.
      const hostile: [string, Record<string, string>][] = [
        ...HOSTILE.map((h): [string, Record<string, string>] => [`${h === 'evil.example@localhost' ? 'Astra R2 ' : ''}Host ${JSON.stringify(h)}`, { host: h }]),
        ...['evil.example', 'localhost, evil.example', `localhost:${port}`, 'evil.example@localhost', ''].map((f): [string, Record<string, string>] =>
          [`X-Forwarded-Host ${JSON.stringify(f)} vs Host 127.0.0.1:${port}`, { host: `127.0.0.1:${port}`, 'x-forwarded-host': f }]),
        ['Astra R2 RSC data request, Host evil.example@localhost', { host: 'evil.example@localhost', rsc: '1' }]
      ];
      for (const [label, h] of hostile) for (const p of REVIEW_PATHS) {
        const r = await get(port, p, h);
        record(c, label, p, r.status);
        expect(r.status, `${c.id} · ${label} · ${p}`).not.toBe(200);
        noLeak(r.body, `${c.id} ${label} ${p}`);
      }
      // M: no Host header at all.
      for (const p of REVIEW_PATHS) {
        const r = await noHost(port, p);
        record(c, 'HTTP/1.0 without Host', p, r.status);
        expect(r.status, `${c.id} · no Host · ${p}`).not.toBe(200);
        noLeak(r.body, `${c.id} no Host ${p}`);
      }
      // Path variants (encoded, data-request, case and slash forms) never serve review content when closed.
      if (!c.open) for (const p of PATH_VARIANTS) {
        const r = await get(port, p, { host: `127.0.0.1:${port}` });
        record(c, 'path variant, loopback', p, r.status);
        expect(r.status, `${c.id} · ${p}`).not.toBe(200);
        noLeak(r.body, `${c.id} variant ${p}`);
      }
      expect((await once(port, '/', { host: `127.0.0.1:${port}` })).status, 'public homepage unaffected').toBe(200);
    } finally { child?.kill('SIGTERM'); }
  });
});

// Genuine App Router client navigation: the authorized index is loaded, then the same port restarts hosted; clicking a
// link makes the real router fetch the page's RSC payload with its router-state tree. It must not render the page.
([{ VERCEL: '1' }, { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'preview' }] as Record<string, string>[]).forEach((hosted, i) => {
  test(`client-side navigation after the server becomes hosted (${JSON.stringify(hosted)}) cannot render a review page`, async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'server-side matrix: once');
    test.setTimeout(90000);
    const port = 3560 + i;
    let child: ChildProcess | undefined;
    try {
      child = await serve(port, FLAGS);
      await page.route('**/*', async (r) => { if (r.request().headers()['next-router-prefetch']) await r.abort(); else await r.continue(); });
      await page.setExtraHTTPHeaders({ 'x-microfire-review-token': reviewToken });
      await page.goto(`http://127.0.0.1:${port}/design`);
      const lab = page.getByRole('link', { name: 'Laboratory', exact: true }).first();
      await expect(lab).toBeVisible();
      const before = await page.locator('body').innerText();
      child.kill('SIGTERM'); await new Promise((r) => child!.once('exit', r));
      child = await serve(port, { ...FLAGS, ...hosted });
      const seen: { status: number; rsc: boolean; tree: boolean }[] = [];
      page.on('response', (r) => { if (new URL(r.url()).pathname.startsWith('/design/a/lab')) seen.push({ status: r.status(), rsc: !!r.request().headers().rsc, tree: !!r.request().headers()['next-router-state-tree'] }); });
      await lab.click();
      await page.waitForTimeout(2500);
      expect(seen.length, 'the router fetched the page').toBeGreaterThan(0);
      expect(seen.some((s) => s.rsc && s.tree), 'a genuine RSC navigation request with router state was made').toBe(true);
      for (const s of seen) expect(s.status, 'no review payload served').not.toBe(200);
      // Either the router kept the already-authorized index, or it fell back to a document load answered "Not found".
      const after = (await page.locator('body').innerText()).trim();
      expect(after === before.trim() || after === 'Not found', `lab page did not render; body now: ${after.slice(0, 120)}`).toBe(true);
    } finally { child?.kill('SIGTERM'); }
  });
});
