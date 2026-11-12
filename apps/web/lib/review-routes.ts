import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { reviewRouteAllowed, REVIEW_TOKEN_HEADER, type ReviewFlag } from './review-policy';

/**
 * Second line of the review-route gate (the first is proxy.ts): call first in every review layout and page. A
 * client-router request can render a page without re-rendering its layout, so a layout check alone is not enough.
 */
export async function requireReviewRoute(flag: ReviewFlag) {
  const h = await headers();
  if (!reviewRouteAllowed(flag, process.env, h.get('host'), h.get('x-forwarded-host'), h.get(REVIEW_TOKEN_HEADER))) notFound();
}
