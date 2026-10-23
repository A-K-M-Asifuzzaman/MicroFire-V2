import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createGetHandler, createMemoryLimiter, createPostHandler, readApi } from '../../apps/web/lib/api';
import { ApiErrorSchema, AskResponseSchema, CitationVerifyResponseSchema, ExperimentsResponseSchema, ExportResponseSchema, FeaturesResponseSchema, GapsResponseSchema, HealthResponseSchema, RankResponseSchema, SourceDetailResponseSchema } from '@microfire/shared';
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
const post = (path: string, body: unknown) => createPostHandler()(path.split('/'), new Request(`http://localhost/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
it('abstains on unsupported safety questions instead of fabricating answers', async () => {
  const response = await post('ask', { question: 'Is a lunar habitat safe?', targetConditions: {} });
  expect(response.status).toBe(200);
  expect(AskResponseSchema.parse(await response.json()).data).toMatchObject({ abstained: true, code: 'unsupported-intent' });
});
it('serves rank, gaps, verification and export with schema-valid, data-only responses', async () => {
  const rank = await post('evidence/rank', { question: 'PMMA flame', targetConditions: { material: 'PMMA' } });
  expect(RankResponseSchema.parse(await rank.json()).data.coverage.validatedExperiments).toBe(1);
  expect(rank.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
  const gaps = await post('gaps', { targetConditions: { pressureKpa: 101 } });
  expect(GapsResponseSchema.parse(await gaps.json()).data.fields[0]!.status).toBe('not-recorded');
  expect((await post('gaps', { targetConditions: {} })).status).toBe(400);
  const record = ExperimentsResponseSchema.parse(await readApi(['experiments'], new URL('http://localhost/api/experiments')).json()).data.items[0]!;
  const verify = await post('citations/verify', { subject: { type: 'claim', claimId: record.claims[0]!.id }, citations: record.claims[0]!.citations });
  expect(CitationVerifyResponseSchema.parse(await verify.json()).data.verdict).toBe('lineage-verified');
  const exported = readApi(['export'], new URL('http://localhost/api/export?ids=bass2-b20'));
  expect(ExportResponseSchema.parse(await exported.json()).data.records).toHaveLength(1);
  expect(readApi(['export'], new URL('http://localhost/api/export?ids=bass2-b20&ids=x')).status).toBe(400);
  expect(SourceDetailResponseSchema.parse(await readApi(['sources', 'nasa-bass-ii-20210011385'], new URL('http://localhost')).json()).data.citedBy[0]!.experimentId).toBe('bass2-b20');
});
it('answers quarantined and invalid comparisons with truthful 404s', async () => {
  const compare = await post('evidence/compare', { experimentIds: ['bass2-b20', 'bass2-b19'] });
  expect(compare.status).toBe(404);
  expect(ApiErrorSchema.parse(await compare.json()).error.message).toMatch(/quarantined legacy candidate/);
  expect((await post('evidence/compare', { experimentIds: ['bass2-b20', 'bass2-b20'] })).status).toBe(400);
  const missing = await post('evidence/compare', { experimentIds: ['bass2-b20', 'nowhere'] });
  expect(ApiErrorSchema.parse(await missing.json()).error.message).toMatch(/1 validated experiment/);
  const legacy = readApi(['experiments', 'bass2-b16'], new URL('http://localhost'));
  expect(legacy.status).toBe(404);
  expect(ApiErrorSchema.parse(await legacy.json()).error.message).toMatch(/quarantined/);
  expect(ExperimentsResponseSchema.parse(await readApi(['experiments'], new URL('http://localhost/api/experiments?q=B19')).json()).data.total).toBe(0);
});
it('bounds GET traffic separately from POST', async () => {
  let time = 0; const get = createGetHandler(createMemoryLimiter({ read: 2, write: 0 }, () => time));
  const url = new URL('http://localhost/api/health');
  expect(get(['health'], url).status).toBe(200);
  expect(get(['health'], url).status).toBe(200);
  expect(get(['health'], url).headers.get('retry-after')).toBe('60');
  time += 60_000;
  expect(HealthResponseSchema.parse(await get(['health'], url).json()).data.phase).toBe('one');
});
it('fails closed with a safe JSON error if the limiter fails', async () => {
  const broken = { take() { throw new Error('private limiter connection detail'); } };
  for (const run of [() => createGetHandler(broken)(['health'], new URL('http://localhost/api/health')), () => createPostHandler(Date.now, broken)(['ask'], request('{"question":"What happened in B20?","targetConditions":{}}'))]) {
    const response = await run();
    expect(response.status).toBe(500);
    expect(ApiErrorSchema.parse(await response.json()).error.message).not.toContain('private limiter');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
  }
});
it('bounds displayed target text while matching the full ranking request', async () => {
  const rank = await post('evidence/rank', { question: 'B20', targetConditions: { material: 'x'.repeat(4000) } });
  expect(rank.status).toBe(200);
  expect(RankResponseSchema.parse(await rank.json()).data.items[0]!.mismatches[0]).toContain('truncated');
});
it('abstains safely when a valid question would exceed the answer size contract', async () => {
  const ask = await post('ask', { question: `${'x'.repeat(3900)} B20`, targetConditions: {} });
  expect(ask.status).toBe(200);
  expect(AskResponseSchema.parse(await ask.json()).data).toMatchObject({ abstained: true, code: 'unsupported-intent', reason: expect.stringMatching(/response size/) });
});
it('does not promote backend-implemented features or missions without UI verification', async () => {
  const registry = FeaturesResponseSchema.parse(await readApi(['feature-status'], new URL('http://localhost')).json()).data;
  expect(Object.fromEntries(registry.filter((f) => ['dashboard', 'atlas', 'experiment', 'gaps', 'ask', 'methodology'].includes(f.id)).map((f) => [f.id, f.state]))).toEqual({ dashboard: 'coming_soon', atlas: 'preview', experiment: 'preview', gaps: 'coming_soon', ask: 'coming_soon', methodology: 'preview' });
  expect(registry.some((f) => ['available', 'locked'].includes(f.state))).toBe(false);
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
