import { describe, expect, test } from 'vitest';
import { HOSTED_MARKERS, reviewFlagFor, reviewRouteAllowed } from '../../apps/web/lib/review-policy';

test('reviewFlagFor guards exactly the review routes', () => {
  for (const p of ['/design', '/design/', '/design/a', '/design/b/lab']) expect(reviewFlagFor(p), p).toBe('MICROFIRE_DESIGN_REVIEW');
  for (const p of ['/m2-fixtures', '/m2-fixtures/x']) expect(reviewFlagFor(p), p).toBe('MICROFIRE_M2_FIXTURE_GALLERY');
  for (const p of ['/', '/designs', '/atlas', '/missions/bass-assembly/tour', '/m2-fixturesx', '/api/design']) expect(reviewFlagFor(p), p).toBeNull();
});

// Review routes (/design, /m2-fixtures) fail closed: flag exactly '1', no hosted-platform marker, loopback host.
describe('reviewRouteAllowed', () => {
  const local = '127.0.0.1:3240';
  for (const flag of ['MICROFIRE_DESIGN_REVIEW', 'MICROFIRE_M2_FIXTURE_GALLERY'] as const) {
    test(`${flag}: denied by default, allowed only locally with the flag`, () => {
      expect(reviewRouteAllowed(flag, {}, local)).toBe(false);
      for (const v of ['', '0', 'true', 'yes', '1 ']) expect(reviewRouteAllowed(flag, { [flag]: v }, local)).toBe(false);
      expect(reviewRouteAllowed(flag, { [flag]: '1' }, local)).toBe(true);
      for (const h of ['localhost:3000', '[::1]:3240', '127.0.0.1']) expect(reviewRouteAllowed(flag, { [flag]: '1' }, h)).toBe(true);
    });
    test(`${flag}: every hosted marker denies, whatever the flag says`, () => {
      for (const k of HOSTED_MARKERS) expect(reviewRouteAllowed(flag, { [flag]: '1', [k]: '1' }, local), k).toBe(false);
      expect(reviewRouteAllowed(flag, { [flag]: '1', VERCEL: '1', VERCEL_ENV: 'production', NODE_ENV: 'production' }, local)).toBe(false);
    });
    test(`${flag}: a non-loopback, missing or malformed Host denies (Host only narrows access, never grants it)`, () => {
      for (const h of [null, '', 'evil.example', 'microfire-v2-preview.vercel.app', '127.0.0.1.evil.example', '10.0.0.5:3240', 'localhost@evil.example', '[::1'])
        expect(reviewRouteAllowed(flag, { [flag]: '1' }, h), String(h)).toBe(false);
      expect(reviewRouteAllowed(flag, { [flag]: '1' }, local, 'evil.example')).toBe(false);
      expect(reviewRouteAllowed(flag, { [flag]: '1' }, local, '127.0.0.1:3240')).toBe(true);
      // A loopback Host never overrides the hosted denial.
      expect(reviewRouteAllowed(flag, { [flag]: '1', VERCEL: '1' }, 'localhost')).toBe(false);
    });
  }
  test('one flag never opens the other route', () => {
    expect(reviewRouteAllowed('MICROFIRE_DESIGN_REVIEW', { MICROFIRE_M2_FIXTURE_GALLERY: '1' }, '127.0.0.1')).toBe(false);
    expect(reviewRouteAllowed('MICROFIRE_M2_FIXTURE_GALLERY', { MICROFIRE_DESIGN_REVIEW: '1' }, '127.0.0.1')).toBe(false);
  });
});
