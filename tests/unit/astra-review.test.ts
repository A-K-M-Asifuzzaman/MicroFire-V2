import { expect, it, vi } from 'vitest';
// Astra's eight original probes, with the save probe adapted to verify safe early rejection.
vi.mock('server-only', () => ({}));
import { createPostHandler } from '../../apps/web/lib/api';
import { ApiErrorSchema, AskRequestSchema, AskResponseSchema, CatalogSchema, GameStateSchema, PassportSchema, RankResponseSchema, type GameAction, type GameState } from '@microfire/shared';
import { answerQuestion, catalog, rankEvidence, validatePassport } from '@microfire/science';
import { MAX_SAVE, claimTrialStatements, createGameState, exportPassport, loadProgress, partDefinitions, saveKey, saveProgress, transition } from '@microfire/game-core';

const at = '2026-10-14T17:30:00Z';
const available = { isMissionAvailable: () => true };
function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
function act(state: GameState, action: GameAction) {
  const result = transition(state, action, catalog, at, available);
  expect(result.ok, `${action.type}: ${'code' in result ? result.code : ''}`).toBe(true);
  return result.state;
}
function throughDetective() {
  let s = createGameState(catalog.datasetVersion, 'normal', at);
  const actions: GameAction[] = [
    { type: 'START_MISSION', missionId: 'station-arrival' },
    { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' },
    { type: 'COLLECT_EVIDENCE', experimentId: 'bass2-b20', claimId: 'bass2-b20-burned-entire-sample' },
    { type: 'COMPLETE_MISSION', missionId: 'station-arrival' },
    { type: 'START_MISSION', missionId: 'bass-assembly' },
    ...partDefinitions.map((p): GameAction => ({ type: 'INSTALL_PART', partId: p.id, anchorId: p.anchorId, orientation: 'correct' })),
    { type: 'QUALIFY_INSTRUMENT' },
    { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' },
    { type: 'COMPLETE_MISSION', missionId: 'bass-assembly' },
    { type: 'START_MISSION', missionId: 'flame-detective' },
    { type: 'PREDICT_OUTCOME', experimentId: 'bass2-b20', prediction: 'The flame will extinguish.' },
    { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' },
    { type: 'COMPLETE_MISSION', missionId: 'flame-detective' }
  ];
  for (const action of actions) s = act(s, action);
  return s;
}
function lunarStart() {
  let s = act(throughDetective(), { type: 'START_MISSION', missionId: 'claim-trial' });
  for (const item of claimTrialStatements) s = act(s, { type: 'CLASSIFY_CLAIM', claimId: item.id, ...item.expected });
  s = act(s, { type: 'COMPLETE_MISSION', missionId: 'claim-trial' });
  s = act(s, { type: 'START_MISSION', missionId: 'lunar-habitat' });
  return act(s, { type: 'RECORD_DECISION', verdict: 'insufficient-evidence' });
}

it.each(['B999 ', 'B16 '])('valid repeated %s references must return a bounded 200 abstention', async word => {
  const input = AskRequestSchema.parse({ question: word.repeat(Math.floor(3999 / word.length)).trim(), targetConditions: {} });
  const pure = answerQuestion(input);
  console.log('abstention-bound', { word, inputLength: input.question.length, reasonLength: pure.abstained ? pure.reason.length : null });
  const response = await createPostHandler()(['ask'], new Request('http://localhost/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
  }));
  expect(response.status).toBe(200);
  expect(AskResponseSchema.parse(await response.json()).data.abstained).toBe(true);
});

it('learner limitations must not displace every canonical scientific caveat', () => {
  let s = act(lunarStart(), { type: 'PROPOSE_NEXT_TEST', question: 'Measure a new condition.', limitations: Array.from({ length: 20 }, (_, i) => `Learner note ${i}.`) });
  s = act(s, { type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' });
  expect(() => validatePassport(s.passport)).not.toThrow();
  const entry = s.passport.entries.find(e => e.missionId === 'lunar-habitat')!;
  console.log('canonical-caveats-retained', catalog.experiments[0]!.limitations.filter(x => entry.limitations.includes(x)));
  for (const limitation of catalog.experiments[0]!.limitations) expect(entry.limitations).toContain(limitation);
  expect(entry.learnerNotes).toEqual(Array.from({ length: 20 }, (_, i) => `Learner note ${i}.`));
  const storage = memory();
  expect(saveProgress(storage, s).ok).toBe(true);
  const restored = loadProgress(storage, s.mode, s.datasetVersion);
  expect(restored.status).toBe('loaded');
  if (restored.status === 'loaded') expect(exportPassport(restored.state)).toEqual(s.passport);
  const stripped = structuredClone(s.passport);
  stripped.entries.find(e => e.missionId === 'lunar-habitat')!.limitations = ['Learner warning only.'];
  expect(() => validatePassport(stripped)).toThrow(/canonical source limitations/);
});

it('a sequence of accepted proposals should remain persistable or reject before committing state', () => {
  let s = lunarStart();
  expect(transition(s, { type: 'REMOVE_PROPOSAL', index: 0 }, catalog, at, available)).toMatchObject({ ok: false, code: 'INVALID_ACTION', state: s });
  const storage = memory();
  let rejected = 0;
  // Original reproduction required all seven actions to succeed. Safe early rejection is now the contract.
  for (let i = 0; i < 7; i++) {
    const previous = s;
    const result = transition(s, {
      type: 'PROPOSE_NEXT_TEST', question: `Proposed next measurement ${i}`,
      limitations: Array.from({ length: 20 }, (_, j) => `${j}:` + 'x'.repeat(3996))
    }, catalog, at, available);
    if (!result.ok) {
      expect(result.code).toBe('SAVE_LIMIT_REACHED');
      expect(result.state).toBe(previous);
      rejected++;
    } else s = result.state;
    expect(saveProgress(storage, s)).toEqual({ ok: true });
    expect(JSON.stringify(s).length).toBeLessThanOrEqual(MAX_SAVE);
  }
  expect(rejected).toBe(1);
  expect(GameStateSchema.safeParse(s).success).toBe(true);
  console.log('accepted-state-size', JSON.stringify(s).length);
  expect(saveProgress(storage, s)).toEqual({ ok: true });
  s = act(s, { type: 'REMOVE_PROPOSAL', index: 0 });
  s = act(s, { type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' });
  expect(s.passport.entries.at(-1)!.learnerNotes).toHaveLength(20);
  expect(s.passport.entries.at(-1)!.limitations).toEqual(catalog.experiments[0]!.limitations);
  expect(saveProgress(storage, s)).toEqual({ ok: true });
});

it('a learner can correct a classification after the attempt-history cap', () => {
  let s = act(throughDetective(), { type: 'START_MISSION', missionId: 'claim-trial' });
  for (let i = 0; i < 200; i++) s = act(s, { type: 'CLASSIFY_CLAIM', claimId: 'trial-b20-burned-sample', kind: 'unknown', evidenceLevel: 'gap' });
  const correction = transition(s, { type: 'CLASSIFY_CLAIM', claimId: 'trial-b20-burned-sample', kind: 'observed', evidenceLevel: 'direct' }, catalog, at, available);
  console.log('classification-correction', correction.ok ? 'accepted' : correction.code);
  expect(correction.ok).toBe(true);
  s = correction.state;
  const storage = memory();
  expect(saveProgress(storage, s).ok).toBe(true);
  const restored = loadProgress(storage, s.mode, s.datasetVersion);
  expect(restored.status).toBe('loaded');
  if (restored.status !== 'loaded') throw new Error('Expected saved correction');
  s = restored.state;
  for (const item of claimTrialStatements) s = act(s, { type: 'CLASSIFY_CLAIM', claimId: item.id, ...item.expected });
  expect(s.classifications).toHaveLength(200);
  s = act(s, { type: 'COMPLETE_MISSION', missionId: 'claim-trial' });
  expect(s.completedMissions).toContain('claim-trial');
  expect(saveProgress(storage, s).ok).toBe(true);
});

it('a condition match is not direct evidence for an unmeasured requested outcome', () => {
  const result = rankEvidence({ question: 'What is the flame temperature in B20?', targetConditions: { material: 'PMMA' }, limit: 5 });
  console.log('unsupported-outcome-rank', result.items[0]);
  expect(result.items[0]!.evidenceLevel).not.toBe('direct');
});

it('documented limitation: a correct locator does not verify the truth of arbitrary generated prose', () => {
  const claim = catalog.experiments[0]!.claims[0]!;
  const answer = answerQuestion({ question: 'What happened in B20?', targetConditions: {} }, catalog, () => [{
    category: 'direct-observation', text: 'The measured B20 flame temperature was 9999 kelvin.', claimId: claim.id, citations: claim.citations
  }]);
  expect(answer.abstained).toBe(false);
});

it('future corpus gate: the B20 apparatus accepts an incompatible synthetic concurrent-flow record', () => {
  const dataset = structuredClone(catalog);
  const other = structuredClone(dataset.experiments[0]!);
  other.id = 'synthetic-concurrent'; other.testId = 'X1'; other.provenance.upstreamRecordId = 'synthetic-x1';
  other.claims[0]!.id = 'synthetic-observation';
  if (other.conditions.flowDirection.status === 'known') other.conditions.flowDirection.value = 'concurrent';
  dataset.experiments.push(other);
  const s = act(throughDetective(), { type: 'START_MISSION', missionId: 'bass-assembly' });
  const result = transition(s, { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: other.id }, CatalogSchema.parse(dataset), at, available);
  expect(result.ok).toBe(true);
  expect(result.state.passport.entries.at(-1)?.evidenceLevel).toBe('direct');
});

it.each([
  'What is the flame temperature in B20?',
  'PMMA flame',
  'The B20 observation log reports that the flame did not burn the entire sample.',
  'The B20 observation log reports that the flame burned the entire sample because airflow caused it.'
])('matching metadata cannot support an unverified outcome: %s', question => {
  const result = rankEvidence({ question, targetConditions: { material: 'PMMA' }, limit: 5 });
  expect(result.items[0]).toMatchObject({ evidenceLevel: 'gap', support: { kind: 'unsupported', claimId: null, citations: [] } });
  expect(RankResponseSchema.safeParse({ apiVersion: '1', data: result }).success).toBe(true);
});

it('direct support requires the recorded observation and exact conditions, not retrieval tolerances', () => {
  const claim = catalog.experiments[0]!.claims[0]!;
  const request = { question: claim.text, targetConditions: { oxygenPct: 17.4 }, limit: 5 };
  const item = rankEvidence(request).items[0]!;
  expect(item).toMatchObject({ evidenceLevel: 'direct', support: { kind: 'observed', claimId: claim.id, citations: claim.citations } });
  expect(rankEvidence({ ...request, targetConditions: { oxygenPct: 17.5 } }).items[0]!.evidenceLevel).toBe('analogous');
  expect(rankEvidence({ ...request, targetConditions: { gravity: 'microgravity' } }).items[0]!.evidenceLevel).toBe('gap');
  expect(rankEvidence({ ...request, targetConditions: {} }).items[0]!.evidenceLevel).toBe('direct');
  expect(RankResponseSchema.safeParse({ apiVersion: '1', data: { ...rankEvidence(request), items: [{ ...item, support: { kind: 'unsupported', claimId: null, citations: [] } }] } }).success).toBe(false);
});

it.each(['derived', 'interpretation', 'hypothesis', 'unknown'] as const)('keeps %s claims distinct from observations', kind => {
  const dataset = structuredClone(catalog);
  const claim = dataset.experiments[0]!.claims[0]!;
  claim.kind = kind;
  const item = rankEvidence({ question: claim.text, targetConditions: { material: 'PMMA' }, limit: 5 }, dataset).items[0]!;
  expect(item.evidenceLevel).toBe(kind === 'interpretation' ? 'mechanistic' : kind === 'derived' ? 'analogous' : 'gap');
  expect(item.support.kind).toBe(kind === 'hypothesis' || kind === 'unknown' ? 'unsupported' : kind);
});

it('will not support a claim with an unresolved citation', () => {
  const dataset = structuredClone(catalog), claim = dataset.experiments[0]!.claims[0]!;
  claim.citations[0]!.sourceId = 'unresolved-source';
  expect(rankEvidence({ question: claim.text, targetConditions: {}, limit: 5 }, dataset).items[0]!.support.kind).toBe('unsupported');
});

it('bounds distinct and very long references, and deduplicates valid citation lineage', async () => {
  for (const question of [Array.from({ length: 200 }, (_, i) => `B${1000+i}`).join(' '), 'B' + '9'.repeat(3999), 'B20 b20 B20 What was observed?']) {
    const response = await createPostHandler()(['ask'], new Request('http://localhost/api/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, targetConditions: {} })
    }));
    expect(response.status).toBe(200);
    const answer = AskResponseSchema.parse(await response.json()).data;
    if (!answer.abstained) expect(answer.citations).toEqual(catalog.experiments[0]!.claims[0]!.citations);
  }
  const baseline = answerQuestion({ question: 'B20 What was observed?', targetConditions: {} });
  expect(answerQuestion({ question: 'B20 b20 B20 What was observed?', targetConditions: {} })).toEqual(baseline);
});

it('rejects malformed requests and hides unexpected server errors', async () => {
  const request = (body: string) => new Request('http://localhost/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  for (const body of ['{broken', JSON.stringify({ question: 'B20', targetConditions: {}, injected: true })]) {
    const response = await createPostHandler()(['ask'], request(body));
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('INVALID_REQUEST');
  }
  const brokenLimiter = { take() { throw new Error('private-internal-error'); } };
  const response = await createPostHandler(Date.now, brokenLimiter)(['ask'], request(JSON.stringify({ question: 'B20', targetConditions: {} })));
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain('private-internal-error');
});

it('preserves latest answers for other statements when pruning attempt history', () => {
  let s = act(throughDetective(), { type: 'START_MISSION', missionId: 'claim-trial' });
  for (const item of claimTrialStatements.slice(1)) s = act(s, { type: 'CLASSIFY_CLAIM', claimId: item.id, ...item.expected });
  for (let i = 0; i < 205; i++) s = act(s, { type: 'CLASSIFY_CLAIM', claimId: claimTrialStatements[0]!.id, kind: 'unknown', evidenceLevel: 'gap' });
  const first = claimTrialStatements[0]!;
  s = act(s, { type: 'CLASSIFY_CLAIM', claimId: first.id, ...first.expected });
  s = act(s, { type: 'COMPLETE_MISSION', missionId: 'claim-trial' });
  expect(s.completedMissions).toContain('claim-trial');
});

it('enforces the exact serialized save boundary and preserves the prior save on rejection', () => {
  let s = lunarStart();
  const storage = memory();
  for (let i = 0; i < 6; i++) s = act(s, { type: 'PROPOSE_NEXT_TEST', question: `Measurement ${i}`, limitations: Array.from({ length: 20 }, (_, j) => `${j}:` + 'x'.repeat(3996)) });
  // Fill valid strings to the exact boundary; no scientific field is changed.
  for (const p of s.proposals) {
    const remaining = MAX_SAVE - JSON.stringify(s).length;
    p.question = p.question.padEnd(Math.min(4000, p.question.length + remaining), 'x');
  }
  expect(JSON.stringify(s)).toHaveLength(MAX_SAVE);
  expect(saveProgress(storage, s).ok).toBe(true);
  expect(loadProgress(storage, s.mode, s.datasetVersion)).toMatchObject({ status: 'loaded', state: s });
  const before = storage.getItem(saveKey(s.mode));
  const larger = structuredClone(s);
  const p = larger.proposals.find(p => p.question.length < 4000)!;
  p.question += 'x';
  expect(saveProgress(storage, larger)).toEqual({ ok: false, reason: 'invalid-state' });
  expect(storage.getItem(saveKey(s.mode))).toBe(before);
  const result = transition(s, { type: 'PROPOSE_NEXT_TEST', question: 'One more', limitations: ['One more note'] }, catalog, at, available);
  expect(result).toMatchObject({ ok: false, code: 'SAVE_LIMIT_REACHED', state: s });
});

it('loads existing v2 entries without learnerNotes and preserves a rejected oversized restore', () => {
  const s = lunarStart(), storage = memory();
  const raw = JSON.parse(JSON.stringify(s));
  for (const entry of raw.passport.entries) delete entry.learnerNotes;
  storage.setItem(saveKey(s.mode), JSON.stringify(raw));
  expect(loadProgress(storage, s.mode, s.datasetVersion)).toMatchObject({ status: 'loaded', migratedFrom: null, state: s });
  expect(PassportSchema.parse(raw.passport).entries.every(e => e.learnerNotes.length === 0)).toBe(true);
  const oversized = ' '.repeat(MAX_SAVE + 1);
  storage.setItem(saveKey(s.mode), oversized);
  expect(loadProgress(storage, s.mode, s.datasetVersion).status).toBe('corrupt');
  expect(saveProgress(storage, s)).toEqual({ ok: false, reason: 'existing-save-needs-review' });
  expect(storage.getItem(saveKey(s.mode))).toBe(oversized);
});
