import { test, expect } from '@playwright/test';
import {
  AskResponseSchema, CitationVerifyResponseSchema, ExperimentsResponseSchema, ExportResponseSchema, GapsResponseSchema, RankResponseSchema
} from '@microfire/shared';

// Phase One science API against the production server. No UI is asserted here; Claude owns research pages.
test('research APIs serve truthful limited-data responses end to end', async ({ request }) => {
  const search = ExperimentsResponseSchema.parse(await (await request.get('/api/experiments?q=PMMA%20opposed')).json()).data;
  expect(search.items.map((e) => e.id)).toEqual(['bass2-b20']);
  expect(search.coverage).toMatchObject({ validatedExperiments: 1, quarantinedCandidates: 55 });

  const rank = RankResponseSchema.parse(await (await request.post('/api/evidence/rank', { data: { question: 'PMMA flame', targetConditions: { material: 'PMMA', gravity: 'microgravity' } } })).json()).data;
  expect(rank.items[0]).toMatchObject({ experimentId: 'bass2-b20', evidenceLevel: 'analogous' });

  const gaps = GapsResponseSchema.parse(await (await request.post('/api/gaps', { data: { targetConditions: { pressureKpa: 70 } } })).json()).data;
  expect(gaps.fields[0]!.status).toBe('not-recorded');

  const record = search.items[0]!;
  const verify = await request.post('/api/citations/verify', { data: { subject: { type: 'claim', claimId: record.claims[0]!.id }, citations: record.claims[0]!.citations } });
  expect(CitationVerifyResponseSchema.parse(await verify.json()).data.resolvedUrls[0]).toMatch(/#page=112$/);

  const exported = ExportResponseSchema.parse(await (await request.get('/api/export?ids=bass2-b20')).json()).data;
  expect(exported.records[0]!.experiment.conditions.oxygenPct.value).toBe(17.4);

  const answer = AskResponseSchema.parse(await (await request.post('/api/ask', { data: { question: 'What does B20 establish about airflow?', targetConditions: {} } })).json()).data;
  expect(answer.abstained).toBe(false);
  if (!answer.abstained) expect(answer.citations.length).toBeGreaterThan(0);
});

test('quarantined legacy records stay unavailable over HTTP', async ({ request }) => {
  expect((await request.get('/api/experiments/bass2-b16')).status()).toBe(404);
  expect((await request.post('/api/evidence/compare', { data: { experimentIds: ['bass2-b20', 'bass2-b19'] } })).status()).toBe(404);
  const ask = AskResponseSchema.parse(await (await request.post('/api/ask', { data: { question: 'What happened in B19?', targetConditions: {} } })).json()).data;
  expect(ask).toMatchObject({ abstained: true, code: 'quarantined-record' });
  const response = await request.get('/api/export?ids=bass2-b19');
  expect(response.status()).toBe(404);
  expect(response.headers()['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
});
