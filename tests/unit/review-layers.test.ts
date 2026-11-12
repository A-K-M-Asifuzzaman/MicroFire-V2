import { expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
const mocked = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => mocked.headers }));
vi.mock('next/navigation', () => ({ notFound: () => { throw Error('review-not-found'); } }));
import { proxy } from '../../apps/web/proxy';
import { requireReviewRoute } from '../../apps/web/lib/review-routes';

it('both independent review protection layers enforce the same credential and rotation', async () => {
  const token = randomBytes(32).toString('base64url');
  vi.stubEnv('MICROFIRE_DESIGN_REVIEW', '1'); vi.stubEnv('MICROFIRE_REVIEW_ACCESS_TOKEN', token);
  try {
    for (const credential of [null, 'invalid', token]) {
      mocked.headers = new Headers({ host: '127.0.0.1:3240', ...(credential ? { 'x-microfire-review-token': credential } : {}) });
      const request = new NextRequest('http://127.0.0.1:3240/design', { headers: mocked.headers });
      expect(proxy(request).status).toBe(credential === token ? 200 : 404);
      if (credential === token) await expect(requireReviewRoute('MICROFIRE_DESIGN_REVIEW')).resolves.toBeUndefined();
      else await expect(requireReviewRoute('MICROFIRE_DESIGN_REVIEW')).rejects.toThrow('review-not-found');
    }
    vi.stubEnv('MICROFIRE_REVIEW_ACCESS_TOKEN', randomBytes(32).toString('base64url'));
    expect(proxy(new NextRequest('http://127.0.0.1:3240/design', { headers: mocked.headers })).status).toBe(404);
    await expect(requireReviewRoute('MICROFIRE_DESIGN_REVIEW')).rejects.toThrow();
  } finally { vi.unstubAllEnvs(); }
});
