import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { CAMPAIGN_BODY_LIMITS, readCampaignBody } from '../../apps/web/lib/campaign-body';
import { readPreviewBody } from '../../apps/web/lib/game-preview';

const request = (text: string, headers: Record<string, string> = {}) => new Request('http://localhost/api/game/campaign/v1/action', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: text
});
it('refuses unknown or inherited route names before body acquisition', async () => {
  for (const route of ['unknown', '__proto__', 'constructor'])
    await expect(readCampaignBody(request('{}'), route as 'action')).rejects.toMatchObject({ status: 404 });
});
it('preserves decimal B20 conditions and does not enlarge the frozen M2 body envelope', async () => {
  expect(await readCampaignBody(request('{"oxygenPct":17.4}'), 'action')).toEqual({ oxygenPct: 17.4 });
  const text = JSON.stringify({ note: 'x'.repeat(40000) });
  expect(await readCampaignBody(request(text), 'action')).toEqual(JSON.parse(text));
  await expect(readPreviewBody(request(text))).rejects.toMatchObject({ status: 413 });
});
it.each(Object.entries(CAMPAIGN_BODY_LIMITS))('enforces the exact UTF-8 byte budget for %s', async (route, limit) => {
  const endpoint = route as keyof typeof CAMPAIGN_BODY_LIMITS;
  const exact = JSON.stringify('x'.repeat(limit - 2));
  expect(new TextEncoder().encode(exact)).toHaveLength(limit);
  expect(await readCampaignBody(request(exact), endpoint)).toHaveLength(limit - 2);
  await expect(readCampaignBody(request(exact + ' '), endpoint)).rejects.toMatchObject({ status: 413 });
  await expect(readCampaignBody(request(JSON.stringify('é'.repeat(limit / 2))), endpoint)).rejects.toMatchObject({ status: 413 });
});
it.each(['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"nested":{"a":1,"a":2}}', '{"oxygenPct":1e400}', '[1,]', '{', '{}{}'])('rejects duplicate, nonfinite or malformed JSON: %s', async text => {
  await expect(readCampaignBody(request(text), 'action')).rejects.toMatchObject({ status: 400 });
});
it.each(['-1', 'NaN', '1.5', '9007199254740992'])('refuses an invalid declared byte length: %s', async length => {
  await expect(readCampaignBody(request('{}', { 'content-length': length }), 'start')).rejects.toMatchObject({ status: 400 });
});
it('bounds streaming bodies despite an absent or understated Content-Length and cancels overflow', async () => {
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(1025)); },
    cancel() { canceled = true; }
  });
  const streamed = new Request('http://localhost/', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '2' }, body, duplex: 'half' } as RequestInit);
  await expect(readCampaignBody(streamed, 'start')).rejects.toMatchObject({ status: 413 });
  expect(canceled).toBe(true);
});
it('rejects malformed UTF-8, unsupported media, missing bodies and excessive nesting', async () => {
  const malformed = new Request('http://localhost/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: new Uint8Array([0x22, 0xc3, 0x28, 0x22]) });
  await expect(readCampaignBody(malformed, 'start')).rejects.toMatchObject({ status: 400 });
  await expect(readCampaignBody(request('{}', { 'content-type': 'text/plain' }), 'start')).rejects.toMatchObject({ status: 415 });
  await expect(readCampaignBody(new Request('http://localhost/', { method: 'POST', headers: { 'content-type': 'application/json' } }), 'start')).rejects.toMatchObject({ status: 400 });
  await expect(readCampaignBody(request('['.repeat(66) + '0' + ']'.repeat(66)), 'start')).rejects.toMatchObject({ status: 400 });
});
