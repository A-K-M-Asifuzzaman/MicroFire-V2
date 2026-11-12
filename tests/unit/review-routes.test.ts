import { describe, expect, test } from 'vitest';
import { randomBytes } from 'node:crypto';
import { HOSTED_MARKERS, isLoopbackAuthority, reviewFlagFor, reviewRouteAllowed as allowed, type ReviewFlag } from '../../apps/web/lib/review-policy';

// Review routes fail closed: explicit local flag, no hosting marker (presence alone denies), exact loopback authority.
const FLAGS: readonly ReviewFlag[] = ['MICROFIRE_DESIGN_REVIEW', 'MICROFIRE_M2_FIXTURE_GALLERY'];
const token = randomBytes(32).toString('base64url');
const on = (flag: ReviewFlag, extra: Record<string, string> = {}) => ({ [flag]: '1', MICROFIRE_REVIEW_ACCESS_TOKEN: token, ...extra });
const reviewRouteAllowed = (flag: ReviewFlag, env: Record<string, string>, host: string | null, forwarded: string | null = null) => allowed(flag, env, host, forwarded, token);
const LOCAL = '127.0.0.1:3240';

/** Authorities that must never pass, whatever the environment (Astra R2 and the adversarial set). */
const HOSTILE_AUTHORITIES = [
  'evil.example@localhost', 'localhost@evil.example', 'localhost.evil.example', '127.0.0.1.evil.example',
  'localhost:invalid', 'localhost/path', 'localhost?x=1', 'localhost#x', 'localhost%40evil.example',
  'user:pass@localhost:3240', 'localhost:3240@evil.example', 'localhost\\evil.example', 'localhost evil', ' localhost', 'localhost ',
  'LOCALHOST', 'LocalHost:3240', 'localhost.', '127.0.0.1.', '127.1', '127.0.0.2', '0.0.0.0', '2130706433', '0x7f000001',
  '[::1', '::1', '[::1]x', '[0:0:0:0:0:0:0:1]', '[::ffff:127.0.0.1]', '[::1%25lo0]',
  'localhost:0', 'localhost:03240', 'localhost:65536', 'localhost:99999', 'localhost:', 'localhost:-1', 'localhost:+80', 'localhost::80',
  'localhost, evil.example', 'localhost,localhost', '%6Cocalhost', 'xn--localhost', 'evil.example', 'microfire-v2-preview.vercel.app', '', '   '
] as const;

describe('isLoopbackAuthority (strict raw HTTP authority, not URL parsing)', () => {
  test('accepts only the explicit loopback spellings with an optional valid port', () => {
    for (const a of ['localhost', 'localhost:3241', '127.0.0.1', '127.0.0.1:3241', '[::1]', '[::1]:3241', 'localhost:1', 'localhost:65535'])
      expect(isLoopbackAuthority(a), a).toBe(true);
  });
  test('rejects user-info, suffixes, delimiters, encodings, case variants, IPv6 variants, bad ports and lists', () => {
    for (const a of HOSTILE_AUTHORITIES) expect(isLoopbackAuthority(a), JSON.stringify(a)).toBe(false);
    for (const a of [null, undefined]) expect(isLoopbackAuthority(a)).toBe(false);
  });
});

describe('reviewRouteAllowed: required environment cases', () => {
  for (const flag of FLAGS) {
    test(`${flag} A: local, flag absent or not exactly '1' → deny`, () => {
      expect(reviewRouteAllowed(flag, {}, LOCAL)).toBe(false);
      for (const v of ['', '0', 'true', 'yes', '1 ', ' 1']) expect(reviewRouteAllowed(flag, { [flag]: v }, LOCAL), v).toBe(false);
    });
    test(`${flag} B: local, flag '1', valid loopback authority → allow`, () => {
      for (const h of ['127.0.0.1:3240', 'localhost:3000', '[::1]:3240', 'localhost', '127.0.0.1']) expect(reviewRouteAllowed(flag, on(flag), h), h).toBe(true);
    });
    test(`${flag} C: VERCEL=1 → deny`, () => { expect(reviewRouteAllowed(flag, on(flag, { VERCEL: '1' }), LOCAL)).toBe(false); });
    // Astra R1, the exact reproduction: VERCEL unset, VERCEL_ENV alone.
    for (const [id, v] of [['D', 'production'], ['E', 'preview'], ['F', 'development'], ['G', 'qa-custom-env']] as const)
      test(`${flag} ${id}: Astra R1 regression — VERCEL_ENV=${v} with VERCEL unset → deny`, () => {
        const env = on(flag, { VERCEL_ENV: v });
        expect('VERCEL' in env).toBe(false);
        expect(reviewRouteAllowed(flag, env, LOCAL)).toBe(false);
      });
    test(`${flag} H: every other hosting marker, alone and even when empty → deny`, () => {
      for (const k of HOSTED_MARKERS) {
        expect(reviewRouteAllowed(flag, on(flag, { [k]: '1' }), LOCAL), k).toBe(false);
        expect(reviewRouteAllowed(flag, on(flag, { [k]: '' }), LOCAL), `${k}=''`).toBe(false);
      }
    });
    // Astra R2, the exact reproduction.
    test(`${flag} I: Astra R2 regression — Host evil.example@localhost (user-info) → deny`, () => {
      expect(reviewRouteAllowed(flag, on(flag), 'evil.example@localhost')).toBe(false);
    });
    test(`${flag} J: every malformed or hostile Host → deny`, () => {
      for (const h of HOSTILE_AUTHORITIES) expect(reviewRouteAllowed(flag, on(flag), h), JSON.stringify(h)).toBe(false);
    });
    test(`${flag} K: X-Forwarded-Host that is not exactly the Host → deny`, () => {
      for (const f of ['evil.example', 'localhost, evil.example', 'localhost:3240', '[::1]:3240', 'evil.example@localhost', '', ...HOSTILE_AUTHORITIES])
        expect(reviewRouteAllowed(flag, on(flag), LOCAL, f), JSON.stringify(f)).toBe(false);
      expect(reviewRouteAllowed(flag, on(flag), LOCAL, LOCAL)).toBe(true);
    });
    test(`${flag} L: hosted environment with a forged loopback Host (and matching forwarded host) → deny`, () => {
      for (const env of [{ VERCEL: '1' }, { VERCEL_ENV: 'production' }, { NETLIFY: 'true' }, { K_SERVICE: 'svc' }])
        for (const h of ['localhost', '127.0.0.1:3240', '[::1]']) expect(reviewRouteAllowed(flag, on(flag, env), h, h), `${JSON.stringify(env)} ${h}`).toBe(false);
    });
    test(`${flag} M: missing or ambiguous authority → deny`, () => {
      for (const h of [null, '', 'localhost,127.0.0.1', 'localhost 127.0.0.1']) expect(reviewRouteAllowed(flag, on(flag), h), JSON.stringify(h)).toBe(false);
    });
  }
  test('one flag never opens the other route', () => {
    expect(reviewRouteAllowed('MICROFIRE_DESIGN_REVIEW', { MICROFIRE_M2_FIXTURE_GALLERY: '1' }, LOCAL)).toBe(false);
    expect(reviewRouteAllowed('MICROFIRE_M2_FIXTURE_GALLERY', { MICROFIRE_DESIGN_REVIEW: '1' }, LOCAL)).toBe(false);
  });
  test('NODE_ENV=production alone does not block the supported local `next start` workflow', () => {
    expect(reviewRouteAllowed('MICROFIRE_DESIGN_REVIEW', on('MICROFIRE_DESIGN_REVIEW', { NODE_ENV: 'production' }), LOCAL)).toBe(true);
  });
});

test('reviewFlagFor guards exactly the review routes', () => {
  for (const p of ['/design', '/design/', '/design/a', '/design/b/lab']) expect(reviewFlagFor(p), p).toBe('MICROFIRE_DESIGN_REVIEW');
  for (const p of ['/m2-fixtures', '/m2-fixtures/x']) expect(reviewFlagFor(p), p).toBe('MICROFIRE_M2_FIXTURE_GALLERY');
  for (const p of ['/', '/designs', '/atlas', '/missions/bass-assembly/tour', '/m2-fixturesx', '/api/design']) expect(reviewFlagFor(p), p).toBeNull();
});

test('R4: forged headers and unknown hosting markers never substitute for a dedicated credential', () => {
  for (const flag of FLAGS) {
    const env = on(flag, { UNKNOWN_HOSTING_PROVIDER: '1' });
    for (const credential of [null, '', 'wrong', randomBytes(32).toString('base64url'), `${token},${token}`])
      expect(allowed(flag, env, LOCAL, LOCAL, credential)).toBe(false);
    expect(allowed(flag, env, LOCAL, LOCAL, token)).toBe(true);
    for (const secret of ['', 'weak', token + '=', undefined])
      expect(allowed(flag, { ...env, MICROFIRE_REVIEW_ACCESS_TOKEN: secret }, LOCAL, LOCAL, token)).toBe(false);
    expect(allowed(flag, on(flag), LOCAL)).toBe(false);
  }
});
