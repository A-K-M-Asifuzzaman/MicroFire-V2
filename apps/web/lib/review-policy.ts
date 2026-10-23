// Owner/developer review routes (/design, /m2-fixtures) fail closed. They are served only when all three hold:
//   1. their flag is exactly '1' in the server environment (absent by default);
//   2. no hosted-platform marker is present: hosted deployments are denied whatever the flags say (the same markers
//      the backend's local-preview guard refuses);
//   3. the request reached a loopback host. This narrows access further (e.g. DNS rebinding against a local
//      server); it never grants access on its own, because Host is client-controlled.
// Enforced twice: by proxy.ts before anything renders, and again in every review layout/page (lib/review-routes.ts).
// Dependency-free so the proxy can import it.

export type ReviewFlag = 'MICROFIRE_DESIGN_REVIEW' | 'MICROFIRE_M2_FIXTURE_GALLERY';
export const HOSTED_MARKERS = ['VERCEL', 'NETLIFY', 'CF_PAGES', 'AWS_LAMBDA_FUNCTION_NAME', 'K_SERVICE', 'RENDER', 'FLY_APP_NAME'] as const;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

const loopback = (host: string | null) => {
  if (!host) return false;
  try { return LOOPBACK.has(new URL(`http://${host}`).hostname); } catch { return false; }
};

/** The review flag guarding a pathname, or null for every other route. */
export function reviewFlagFor(pathname: string): ReviewFlag | null {
  if (pathname === '/design' || pathname.startsWith('/design/')) return 'MICROFIRE_DESIGN_REVIEW';
  if (pathname === '/m2-fixtures' || pathname.startsWith('/m2-fixtures/')) return 'MICROFIRE_M2_FIXTURE_GALLERY';
  return null;
}

/** `forwardedHost` must also be loopback when present. */
export function reviewRouteAllowed(flag: ReviewFlag, env: Readonly<Record<string, string | undefined>>, host: string | null, forwardedHost: string | null = null) {
  if (env[flag] !== '1') return false;
  if (HOSTED_MARKERS.some((k) => !!env[k])) return false;
  return loopback(host) && (forwardedHost === null || loopback(forwardedHost));
}
