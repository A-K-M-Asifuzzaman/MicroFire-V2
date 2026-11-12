import { NextResponse, type NextRequest } from 'next/server';
import { reviewFlagFor, reviewRouteAllowed } from './lib/review-policy';

// Review routes fail closed before anything renders (no page code, metadata or fixture read runs for a denied
// request). A denial is a plain 404 for every request kind: a rewrite would answer the client router's RSC fetch
// with a redirect instead. These addresses are unlisted, so no styled not-found page is needed.
export function proxy(request: NextRequest) {
  const flag = reviewFlagFor(request.nextUrl.pathname);
  if (flag && !reviewRouteAllowed(flag, process.env, request.headers.get('host'), request.headers.get('x-forwarded-host')))
    return new NextResponse('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  return NextResponse.next();
}

export const config = { matcher: ['/design', '/design/:path*', '/m2-fixtures', '/m2-fixtures/:path*'] };
