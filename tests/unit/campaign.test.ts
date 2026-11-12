import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCampaign, replayCampaign, transitionCampaign } from '@microfire/game-core';
import { type CampaignAction, type CampaignRecord } from '@microfire/shared';
import { catalog, validatePassport } from '@microfire/science';
import { episodeActions, initialActions, diagnoseActions, repairActions, finishActions } from './training-helpers';

import {at,claim,review,core,detective,trial,habitat,appraise} from './campaign-helpers';

function advance(record: CampaignRecord, actions: CampaignAction[]): CampaignRecord {
  for (const action of actions) {
    const result = transitionCampaign(record, action, catalog, at);
    expect(result.ok, JSON.stringify(result.ok ? {} : {code:result.code, action})).toBe(true);
    if (!result.ok) throw Error(result.code);
    record = result.record;
  }
  return record;
}
function assembly() {
  let record = createCampaign(randomUUID(), catalog, at);
  record = advance(record, [{ type: 'TRAINING', action: episodeActions[0]! }, review]);
  return advance(record, episodeActions.slice(1).map(action => ({ type: 'TRAINING', action })));
}
it('runs all five missions through the same apparatus, provenance and replay record', () => {
  let record = advance(assembly(), [...detective, ...trial, core({ type: 'START_MISSION', missionId: 'lunar-habitat' }), habitat,
    core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }), core({ type: 'PROPOSE_NEXT_TEST', question: 'Measure flame spread under lunar gravity at the proposed pressure.', limitations: ['Fictional scenario; the B20 run does not establish lunar behavior.'] }), core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })]);
  const view = replayCampaign(record, catalog);
  expect(view.state.completedMissions).toHaveLength(5);
  expect(view.training.repair).not.toBeNull();
  expect(validatePassport(view.state.passport).entries).toHaveLength(5);
  expect(view.state.passport.entries.at(-1)).toMatchObject({ scenario: 'fictional-scenario', evidenceLevel: 'gap' });
  expect(replayCampaign(JSON.parse(JSON.stringify(record)), catalog)).toEqual(view);
  record = advance(record, [core({ type: 'START_MISSION', missionId: 'claim-trial' }), core({ type: 'COMPLETE_MISSION', missionId: 'claim-trial' })]);
  expect(replayCampaign(record, catalog).state.passport.entries).toHaveLength(5);
});
it('requires actual source review and rejects a fictional observation as NASA evidence', () => {
  let record = createCampaign(randomUUID(), catalog, at);
  record = advance(record, episodeActions.slice(0, 2).map(action => ({ type: 'TRAINING', action })));
  expect(transitionCampaign(record, { type: 'TRAINING', action: episodeActions[2]! }, catalog, at)).toMatchObject({ ok: false, code: 'SOURCE_REVIEW_REQUIRED' });
  const wrong = transitionCampaign(record, { ...review, incidentOrigin: 'research' }, catalog, at);
  expect(wrong).toMatchObject({ ok: true, feedback: { correct: false } });
  if (!wrong.ok) throw Error();
  record = advance(wrong.record, [review, { type: 'TRAINING', action: episodeActions[2]! }]);
  expect(replayCampaign(record, catalog).state.completedMissions).toEqual(['station-arrival']);
});
it('locks predictions before observation, refuses hypothetical and quarantined scenarios, and requires explanation', () => {
  let record = advance(assembly(), detective.slice(0, 1));
  for (const [experimentId, targetConditions] of [['bass2-b16', {}], ['bass2-b20', { oxygenPct: 16.5 }], ['bass2-b20', { pressureKpa: 101 }]] as const)
    expect(transitionCampaign(record, { type: 'SELECT_EXPERIMENT', experimentId, targetConditions }, catalog, at).ok).toBe(false);
  record = advance(record, detective.slice(1, 3));
  expect(transitionCampaign(record, detective[2]!, catalog, at)).toMatchObject({ ok: false, code: 'PREDICTION_LOCKED' });
  record = advance(record, detective.slice(3, 4));
  expect(transitionCampaign(record, detective.at(-1)!, catalog, at)).toMatchObject({ ok: false, code: 'EXPLANATION_REQUIRED' });
  const wrong = transitionCampaign(record, { ...detective[4]!, relation: 'flow-caused-outcome' }, catalog, at);
  expect(wrong).toMatchObject({ ok: true, feedback: { correct: false } });
  expect(transitionCampaign(record, core({ type: 'REMOVE_PART', partId: 'fan' }), catalog, at)).toMatchObject({ ok: false, code: 'UNSUPPORTED_OPERATION' });
});
it('explains missing evidence, derivations, confounders and wrong classifications and permits revision', () => {
  let record = advance(assembly(), [...detective, trial[0]!]);
  expect(transitionCampaign(record, { ...appraise('trial-flow-caused-burnout'), support: 'supports', confounders: [] }, catalog, at)).toMatchObject({ ok: true, feedback: { correct: false, reasons: expect.arrayContaining([expect.stringContaining('lack of support')]) } });
  expect(transitionCampaign(record, { ...appraise('trial-b20-thickness'), evidenceLevel: 'direct' }, catalog, at)).toMatchObject({ ok: true, feedback: { correct: false } });
  const wrong = transitionCampaign(record, { ...appraise('trial-ai-lunar-claim'), support: 'contradicts' }, catalog, at);
  if (!wrong.ok) throw Error(); record = wrong.record;
  expect(replayCampaign(record, catalog).state.classifications.at(-1)).toMatchObject({kind:'unknown',evidenceLevel:'gap',correct:false});
  expect(transitionCampaign(record, trial.at(-1)!, catalog, at)).toMatchObject({ ok: false, code: 'APPRAISAL_REQUIRED' });
  record = advance(record, trial.slice(1));
  expect(replayCampaign(record, catalog).state.passport.entries.find(e => e.missionId === 'claim-trial')!.corrections).toHaveLength(1);
});
it('scores habitat reasoning rather than hazard probability and preserves unknown scenario values', () => {
  const record = advance(assembly(), [...detective, ...trial, core({ type: 'START_MISSION', missionId: 'lunar-habitat' })]);
  for (const patch of [{ verdict: 'safe' }, { gaps: [] }, { nextMeasurements: ['oxygen'] }, { citations: [{ ...claim.citations[0]!, sourceId: 'invented-source' }] }])
    expect(transitionCampaign(record, { ...habitat, ...patch }, catalog, at)).toMatchObject({ ok: true, feedback: { correct: false } });
  const a = habitat as Extract<CampaignAction, { type: 'ASSESS_HABITAT' }>;
  const next = advance(record, [{ ...a, scenario: { ...a.scenario, oxygenPct: null, pressureKpa: null } }]);
  expect(next.events.at(-1)!.action).toMatchObject({ scenario: { oxygenPct: null, pressureKpa: null } });
  expect(transitionCampaign(record, core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }), catalog, at)).toMatchObject({ ok: false, code: 'ASSESSMENT_REQUIRED' });
});
it('rejects invalid state, unknown operations, backwards clocks and replayed impossible progression', () => {
  const record = createCampaign(randomUUID(), catalog, at);
  expect(transitionCampaign(record, { type: 'SKIP_MISSION' }, catalog, at)).toMatchObject({ ok: false, code: 'INVALID_ACTION' });
  expect(transitionCampaign(record, review, catalog, '2026-11-11T00:00:00.000Z')).toMatchObject({ ok: false, code: 'INVALID_TIME' });
  expect(() => replayCampaign({ ...record, completedMissions: ['lunar-habitat'] }, catalog)).toThrow();
  expect(() => replayCampaign({ ...record, events: [{ at, action: core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' }) }] }, catalog)).toThrow();
  expect(() => replayCampaign({ ...record, datasetVersion: 'other-dataset' }, catalog)).toThrow();
});
it('completed mission evidence remains read-only during a revisit', () => {
  const complete = advance(assembly(), [...detective, ...trial]);
  const revisit = advance(complete, [core({ type: 'START_MISSION', missionId: 'claim-trial' })]);
  expect(transitionCampaign(revisit, { ...appraise('trial-ai-lunar-claim'), support: 'supports' }, catalog, at)).toMatchObject({ ok: false, code: 'WRONG_PHASE' });
});
it('reserves completion after repeated mistaken reviews without erasing history', () => {
  let record = advance(createCampaign(randomUUID(), catalog, at), [{ type: 'TRAINING', action: episodeActions[0]! }]);
  const wrong: CampaignAction = { ...review, incidentOrigin: 'research' };
  for (let i = 0; i < 191; i++) record = advance(record, [wrong]);
  expect(transitionCampaign(record, wrong, catalog, at)).toMatchObject({ ok: false, code: 'CAMPAIGN_LIMIT_REACHED' });
  record = advance(record, [review, ...[...initialActions.slice(1), ...diagnoseActions, repairActions[0]!, repairActions[3]!, ...finishActions].map(action => ({ type: 'TRAINING' as const, action })), ...detective, ...trial,
    core({ type: 'START_MISSION', missionId: 'lunar-habitat' }), habitat, core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }),
    core({ type: 'PROPOSE_NEXT_TEST', question: 'Measure lunar gravity at the scenario pressure.', limitations: ['Not established by B20.'] }), core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })]);
  expect(replayCampaign(record, catalog).state.completedMissions).toHaveLength(5);
  expect(record.events.length).toBeLessThan(256);
}, 15000);
