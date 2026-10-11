import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createPostHandler, readApi } from '../../apps/web/lib/api';
import { ApiErrorSchema, ExperimentsResponseSchema } from '@microfire/shared';
const request = (body: string, type = 'application/json') => new Request('http://localhost/api/ask', { method: 'POST', headers: { 'Content-Type': type }, body });
it('validates pagination, rejects unknown/duplicate filters and distinguishes missing records', async () => {
  const response = readApi(['experiments'], new URL('http://localhost/api/experiments?limit=1'));
  expect(ExperimentsResponseSchema.parse(await response.json()).data.total).toBe(1);
  for (const query of ['limit=-1', 'unknown=x', 'limit=1&limit=2']) expect(readApi(['experiments'], new URL(`http://localhost/?${query}`)).status).toBe(400);
  expect(readApi(['experiments','absent'], new URL('http://localhost')).status).toBe(404);
});
it('rejects malformed, oversized and wrong-media requests before any service call', async () => {
  const post = createPostHandler();
  expect((await post(['ask'], request('{bad'))).status).toBe(400);
  expect((await post(['ask'], request('{}', 'text/plain'))).status).toBe(415);
  expect((await post(['ask'], request('x'.repeat(33000)))).status).toBe(413);
  expect((await post(['ask'], request('{}'))).status).toBe(400);
});
it('returns a truthful 501 for future science services, not fabricated answers', async () => {
  const response = await createPostHandler()(['ask'], request(JSON.stringify({ question: 'Is a lunar habitat safe?', targetConditions: {} })));
  expect(response.status).toBe(501);
  expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('NOT_IMPLEMENTED');
});
it('bounds repeated POST traffic and recovers after the window', async () => {
  let time = 100_000; const post = createPostHandler(() => time);
  for (let i = 0; i < 30; i++) await post(['ask'], request('{}'));
  const limited = await post(['ask'], request('{}'));
  expect(limited.status).toBe(429);
  expect(limited.headers.get('retry-after')).toBe('60');
  time += 60_000;
  expect((await post(['ask'], request('{}'))).status).toBe(400);
});
it.each(['constructor', 'toString', '__proto__'])('treats inherited object name %s as an unknown API route', async (path) => {
  const response = await createPostHandler()([path], request('{}'));
  expect(response.status).toBe(404);
  expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('NOT_FOUND');
});
