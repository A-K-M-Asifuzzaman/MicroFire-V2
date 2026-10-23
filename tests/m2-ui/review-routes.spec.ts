import { spawn, type ChildProcess } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Hosted review-route gate, over real HTTP: each configuration is its own `next start` production server built from
// this tree. /design and /m2-fixtures answer 200 only for a local, non-hosted server with the route's flag set and a
// loopback Host; every hosted configuration is 404 whatever the flags say. Writes the observed matrix to the report.
test.describe.configure({ mode: 'serial' });

const ROUTES = ['/design', '/design/a', '/design/b/lab', '/m2-fixtures'] as const;
/** Spellings that must never reach a review page when it is closed (encoded and data-request forms). */
const ALIASES = ['/%64esign', '/design%2Fa', '/design.rsc', '/m2-fixtures.rsc', '/m2-fixtures?scenario=fault', '/design/?_rsc=1'] as const;
const FLAGS = { MICROFIRE_DESIGN_REVIEW: '1', MICROFIRE_M2_FIXTURE_GALLERY: '1' };
const CONFIGS = [
  { name: 'local, flags absent', env: {}, open: false },
  { name: 'local, flags enabled', env: FLAGS, open: true },
  { name: 'hosted (VERCEL=1), flags absent', env: { VERCEL: '1', VERCEL_ENV: 'preview' }, open: false },
  { name: 'hosted (VERCEL=1), flags enabled', env: { ...FLAGS, VERCEL: '1', VERCEL_ENV: 'preview' }, open: false },
  { name: 'production hosted (VERCEL_ENV=production), flags enabled', env: { ...FLAGS, VERCEL: '1', VERCEL_ENV: 'production' }, open: false },
  { name: 'other host (NETLIFY=true), flags enabled', env: { ...FLAGS, NETLIFY: 'true' }, open: false }
] as const;
const STRIP = ['MICROFIRE_DESIGN_REVIEW', 'MICROFIRE_M2_FIXTURE_GALLERY', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'NETLIFY', 'CF_PAGES', 'AWS_LAMBDA_FUNCTION_NAME', 'K_SERVICE', 'RENDER', 'FLY_APP_NAME'];

type Reply = { status: number; csp: string | undefined; body: string; location: string | undefined };
const once = (port: number, p: string, headers: Record<string, string>) => new Promise<Reply>((resolve, reject) => {
  const req = httpRequest({ host: '127.0.0.1', port, path: p, headers }, (res) => {
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

async function serve(port: number, extra: Record<string, string>) {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', ...extra };
  for (const k of STRIP) if (!(k in extra)) delete env[k];
  const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: path.resolve('apps/web'), env, stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    try { if ((await get(port, '/', { host: `127.0.0.1:${port}` })).status === 200) return child; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill(); throw new Error(`server for ${JSON.stringify(extra)} did not start`);
}

const matrix: string[] = [];
test.afterAll(() => { if (matrix.length) console.log(['config | host | path | status', ...matrix].join('\n')); });

CONFIGS.forEach((c, i) => {
  test(`review routes: ${c.name} → ${c.open ? '200 on loopback only' : '404 everywhere'}`, async () => {
    test.skip(test.info().project.name !== 'desktop', 'server-side matrix: once');
    test.setTimeout(90000);
    const port = 3470 + i;
    let child: ChildProcess | undefined;
    try {
      child = await serve(port, c.env);
      const hosts: [string, Record<string, string>, boolean][] = [
        [`127.0.0.1:${port}`, { host: `127.0.0.1:${port}` }, c.open],
        [`localhost:${port}`, { host: `localhost:${port}` }, c.open],
        ['evil.example (unexpected Host)', { host: 'evil.example' }, false],
        ['microfire-v2-preview.vercel.app', { host: 'microfire-v2-preview.vercel.app' }, false],
        ['127.0.0.1 + X-Forwarded-Host evil.example', { host: `127.0.0.1:${port}`, 'x-forwarded-host': 'evil.example' }, false],
        // An App Router RSC data request (what the client router fetches) is gated like a document request.
        ['127.0.0.1 RSC data request', { host: `127.0.0.1:${port}`, rsc: '1' }, c.open]
      ];
      for (const [label, headers, open] of hosts) for (const route of ROUTES) {
        const r = await get(port, route, headers);
        matrix.push(`${c.name} | ${label} | ${route} | ${r.status}`);
        expect(r.status, `${c.name} · ${label} · ${route}`).toBe(open ? 200 : 404);
        // The security headers stay on every answer, and a denial reveals nothing of the review content.
        expect(r.csp, 'CSP present').toContain("default-src 'self'");
        if (!open) for (const leak of ['M2 fixture gallery', 'Choose a direction', 'Orbital observatory', 'START_RESPONSE', 'MICROFIRE_'])
          expect(r.body, `${route} 404 must not contain ${leak}`).not.toContain(leak);
      }
      // Closed configurations: no alternative spelling serves review content (any status other than 200 is a denial).
      if (!c.open) for (const route of ALIASES) for (const [label, headers] of hosts) {
        const r = await get(port, route, headers);
        matrix.push(`${c.name} | ${label} | ${route} | ${r.status}`);
        expect(r.status, `${c.name} · ${label} · ${route}`).not.toBe(200);
        for (const leak of ['M2 fixture gallery', 'Choose a direction', 'Orbital observatory', 'START_RESPONSE']) expect(r.body).not.toContain(leak);
      }
      // The public site is unaffected by the gate.
      expect((await get(port, '/', { host: `127.0.0.1:${port}` })).status).toBe(200);
    } finally { child?.kill('SIGTERM'); }
  });
});
