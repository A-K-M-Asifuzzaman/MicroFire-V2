import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceResponseSchema, InvestigationsResponseSchema, TransferResponseSchema, InvestigationCitationResponseSchema } from '@microfire/shared';
import { startDisposableServer } from '../e2e/disposable-server';

test('production HTTP: source-only library, exact citations, calibrated target comparison, abstention and real POST limit', { timeout: 60000 }, async () => {
  const server = await startDisposableServer(3418);
  try {
    const get = (path: string) => fetch(server.url + '/api/' + path);
    let postCount = 0;
    const post = (path: string, body: unknown) => {
      postCount++;
      return fetch(server.url + '/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    };
    const library = InvestigationsResponseSchema.parse(await (await get('investigations')).json()).data;
    assert.equal(library.items.length, 6); assert.equal(library.coverage.validatedExperiments, 1); assert.equal(library.coverage.quarantinedCandidates, 55);
    assert.deepEqual(library.items.flatMap(x => x.admittedExperimentIds), ['bass2-b20']);
    const flex = library.items.find(x => x.id === 'flex')!;
    assert.equal(flex.dataset!.doi, '10.60555/mbq8-0451');
    assert.equal(library.items.find(x => x.id === 'acme-bre')!.dataset!.doi, '10.60555/vb93-3y72');
    assert.equal(library.items.find(x => x.id === 'saffire-i')!.dataset!.doi, '10.60555/0t15-1z43');
    const verified = await post('investigations/verify', { investigationId: 'flex', citations: [flex.contextCitation] });
    assert.equal(verified.status, 200); assert(InvestigationCitationResponseSchema.parse(await verified.json()).data.valid);
    const forged = structuredClone(flex.citation); if (forged.locator.kind === 'pdf') forged.locator.page++;
    assert.equal(InvestigationCitationResponseSchema.parse(await (await post('investigations/verify', { investigationId: 'flex', citations: [forged] })).json()).data.valid, false);
    const input = { environment: 'moon', experimentIds: ['bass2-b20'], targetConditions: { oxygenPct: 17.4, gravity: 'lunar', pressureKpa: 70 } };
    const response = await post('evidence/transfer', input); assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.match(response.headers.get('content-security-policy')!, /default-src 'none'/);
    const transfer = TransferResponseSchema.parse(await response.json()).data;
    assert.equal(transfer.records[0]!.conclusion, 'insufficient-evidence');
    assert.equal(transfer.records[0]!.dimensions.find(d => d.field === 'oxygenPct')!.source, 17.4);
    assert.equal(transfer.records[0]!.dimensions.find(d => d.field === 'gravity')!.source, null);
    assert.equal((await post('evidence/transfer', { ...input, experimentIds: ['bass2-b19'] })).status, 404);
    assert.equal((await post('evidence/transfer', { ...input, experimentIds: ['flex'] })).status, 404);
    for (const id of ['candidate-saffire-i-1-1', 'candidate-saffire-i-1-2', 'candidate-saffire-ii-2-1'])
      assert.equal((await post('evidence/transfer', { ...input, experimentIds: [id] })).status, 404);
    assert.equal((await get('investigations?q=flex&q=acme')).status, 400);
    for (const [question, abstained] of [['What happened in B20?', false], ['Can this certify a lunar habitat?', true], ['What happened with PMMA in FLEX?', true]] as const) {
      const r = await post('intelligence', { question, environment: 'moon', targetConditions: { oxygenPct: 17.4 } }); assert.equal(r.status, 200);
      const data = IntelligenceResponseSchema.parse(await r.json()).data;
      assert.equal(data.summary.abstained, abstained); assert.equal(data.producer, 'deterministic-source-templates-no-model');
    }
    // Count every POST, including refusals, against the unchanged shared window.
    while (postCount < 31) {
      const r = await post('evidence/transfer', input);
      if (postCount < 31) assert.equal(r.status, 200);
      else { assert.equal(r.status, 429); assert(Number(r.headers.get('retry-after')) > 0); }
    }
    assert.equal((await get('game/campaign/v1/capability')).status, 404);
    assert.equal((await get('game/public-campaign/v1/session')).status, 404);
    assert.equal((await get('game/preview/capability')).status, 404);
    console.log('Real HTTP: 6 descriptions, 1 admitted run, 55 quarantined; 17.4 preserved; unsupported summaries abstain; unchanged POST budget; no campaign API exposed.');
  } finally { await server.stop(); }
});
