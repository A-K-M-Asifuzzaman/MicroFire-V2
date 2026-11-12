import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { HOSTED_MARKERS, REVIEW_TOKEN_HEADER } from '../../apps/web/lib/review-policy';

test('R4 real HTTP: credential required for HTML/RSC; forged locality denies; both protection layers remain installed', async () => {
  const token = randomBytes(32).toString('base64url');
  for (const [index, marker] of [null, 'UNKNOWN_HOSTING_PROVIDER', 'VERCEL_ENV'].entries()) {
    const port = 3280 + index, origin = `http://127.0.0.1:${port}`;
    const env: NodeJS.ProcessEnv = { ...process.env, MICROFIRE_DESIGN_REVIEW: '1', MICROFIRE_M2_FIXTURE_GALLERY: '1', MICROFIRE_REVIEW_ACCESS_TOKEN: token };
    for (const key of HOSTED_MARKERS) delete env[key];
    if (marker) Object.assign(env, { [marker]: marker === 'VERCEL_ENV' ? '' : '1' });
    await assert.rejects(fetch(origin + '/api/health'), 'Test port must be unoccupied');
    const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: path.resolve('apps/web'), env, stdio: 'ignore' });
    try {
      let ready = false;
      for (let n = 0; n < 100; n++) {
        assert.equal(child.exitCode, null, 'Disposable server exited');
        try { if ((await fetch(origin + '/api/health')).ok) { ready = true; break; } } catch { /* server starting */ }
        await delay(100);
      }
      assert(ready);
      for (const route of ['/design', '/design/b/lab', '/m2-fixtures']) for (const rsc of [false, true]) {
        for (const credential of [undefined, randomBytes(32).toString('base64url'), token]) {
          const headers: Record<string, string> = { host: `127.0.0.1:${port}`, 'x-forwarded-host': `127.0.0.1:${port}`, ...(rsc ? { rsc: '1' } : {}), ...(credential ? { [REVIEW_TOKEN_HEADER]: credential } : {}) };
          const response = await fetch(origin + route, { headers });
          const text = await response.text();
          const allowed = credential === token && marker !== 'VERCEL_ENV';
          assert.equal(response.status, allowed ? 200 : 404);
          assert(!text.includes(token), 'Credential must never render');
          if (!allowed) assert(!/M2 fixture gallery|Choose a direction|START_RESPONSE/.test(text));
        }
      }
      assert.equal((await fetch(origin + '/atlas')).status, 200);
    } finally {
      if (child.exitCode === null) await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill('SIGTERM'); });
    }
  }
});
