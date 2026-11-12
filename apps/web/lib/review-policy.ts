// Owner/developer review routes (/design, /m2-fixtures) fail closed. They are served only when all of these hold:
//   1. explicit local authorization: the route's flag is exactly '1' in the server environment (absent by default);
//   2. no hosting-platform marker is present. Presence alone denies, whatever its value: VERCEL_ENV=production,
//      preview, development or any custom name is hosted even without VERCEL=1;
//   3. the raw HTTP authority (Host) is one of a few exact loopback spellings with an optional valid port, and any
//      X-Forwarded-Host is the same exact value. This is strict string validation, never URL parsing (which reads
//      `evil.example@localhost` as user-info plus host "localhost"). Headers are client-controlled, so this check
//      only narrows access (e.g. DNS rebinding against a local server); it never grants it;
//   4. a dedicated 256-bit server-configured credential matches the request header. Never use a URL credential.
// Enforced twice from this one module: proxy.ts before anything renders, and every review layout/page
// (lib/review-routes.ts). Dependency-free so the proxy can import it.

import { timingSafeEqual } from 'node:crypto';

export type ReviewFlag = 'MICROFIRE_DESIGN_REVIEW' | 'MICROFIRE_M2_FIXTURE_GALLERY';
export const REVIEW_TOKEN_HEADER = 'x-microfire-review-token';
export const validReviewToken = (value: string | null | undefined): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) && Buffer.from(value, 'base64url').toString('base64url') === value;

/**
 * Hosting-platform markers. Superset of the backend preview guard's list (VERCEL, NETLIFY, CF_PAGES,
 * AWS_LAMBDA_FUNCTION_NAME, K_SERVICE, RENDER, FLY_APP_NAME), plus the other variables those platforms and a few
 * common ones set at runtime, as defence in depth. A defined variable denies even if empty.
 */
export const HOSTED_MARKERS = [
  'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_REGION', 'VERCEL_DEPLOYMENT_ID', 'NOW_REGION',
  'NETLIFY', 'CF_PAGES', 'AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV', 'LAMBDA_TASK_ROOT',
  'K_SERVICE', 'GAE_SERVICE', 'RENDER', 'FLY_APP_NAME', 'RAILWAY_ENVIRONMENT', 'DYNO', 'WEBSITE_SITE_NAME'
] as const;

/** Exact loopback authorities: lower-case name or canonical address, optional port 1–65535 without a leading zero. */
const LOOPBACK_AUTHORITY = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::([1-9][0-9]{0,4}))?$/;

export function isLoopbackAuthority(authority: string | null | undefined): boolean {
  if (typeof authority !== 'string') return false;
  const m = LOOPBACK_AUTHORITY.exec(authority);
  return !!m && (m[1] === undefined || Number(m[1]) <= 65535);
}

export const hostedEnvironment = (env: Readonly<Record<string, string | undefined>>) => HOSTED_MARKERS.some((k) => env[k] !== undefined);

/** The review flag guarding a pathname, or null for every other route. */
export function reviewFlagFor(pathname: string): ReviewFlag | null {
  if (pathname === '/design' || pathname.startsWith('/design/')) return 'MICROFIRE_DESIGN_REVIEW';
  if (pathname === '/m2-fixtures' || pathname.startsWith('/m2-fixtures/')) return 'MICROFIRE_M2_FIXTURE_GALLERY';
  return null;
}

/** `forwardedHost`, when present, must equal `host` exactly. */
export function reviewRouteAllowed(flag: ReviewFlag, env: Readonly<Record<string, string | undefined>>, host: string | null, forwardedHost: string | null = null, credential: string | null = null) {
  if (env[flag] !== '1') return false;
  if (hostedEnvironment(env)) return false;
  if (!isLoopbackAuthority(host)) return false;
  if (forwardedHost !== null && forwardedHost !== host) return false;
  const expected = env.MICROFIRE_REVIEW_ACCESS_TOKEN;
  return validReviewToken(expected) && validReviewToken(credential) &&
    timingSafeEqual(Buffer.from(expected, 'base64url'), Buffer.from(credential, 'base64url'));
}
