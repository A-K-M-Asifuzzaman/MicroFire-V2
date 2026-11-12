import {type CampaignAction, type GameAction} from '@microfire/shared';
import {catalog} from '@microfire/science';
import {claimTrialStatements} from '@microfire/game-core';
export const at = '2026-11-12T10:00:00.000Z';
export const claim = catalog.experiments[0]!.claims[0]!;
export const review: Extract<CampaignAction, {type:'REVIEW_SOURCE'}> = { type: 'REVIEW_SOURCE', claimId: claim.id, citations: claim.citations, observationOrigin: 'research', incidentOrigin: 'fiction' };
export const core = (action: GameAction): CampaignAction => ({ type: 'CORE', action });
export const detective: CampaignAction[] = [core({ type: 'START_MISSION', missionId: 'flame-detective' }),
  { type: 'SELECT_EXPERIMENT', experimentId: 'bass2-b20', targetConditions: { oxygenPct: 17.4, material: 'PMMA' } },
  core({ type: 'PREDICT_OUTCOME', experimentId: 'bass2-b20', prediction: 'The sample may not fully burn.' }),
  core({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }),
  { type: 'EXPLAIN_OBSERVATION', claimId: claim.id, citations: claim.citations, relation: 'source-observation', limitations: ['single-run-no-causality', 'pressure-unknown', 'not-lunar-evidence'], learnerExplanation: 'The source reports the entire sample burned. One run cannot identify its cause.' },
  core({ type: 'COMPLETE_MISSION', missionId: 'flame-detective' })];
export const appraise = (id: string): CampaignAction => {
  const s = claimTrialStatements.find(x => x.id === id)!;
  const thickness = id === 'trial-b20-thickness', lunar = id === 'trial-ai-lunar-claim', causal = id === 'trial-flow-caused-burnout';
  const c = catalog.experiments[0]!.conditions.thicknessMm;
  return { type: 'APPRAISE_CLAIM', statementId: id, kind: s.expected.kind, evidenceLevel: thickness ? 'analogous' : s.expected.evidenceLevel,
    citations: thickness && c.status === 'known' ? [c.citation] : claim.citations, support: lunar || causal ? 'insufficient' : 'supports', confounders: lunar ? ['gravity', 'pressure'] : causal ? ['flow-history'] : [] };
};
export const trial: CampaignAction[] = [core({ type: 'START_MISSION', missionId: 'claim-trial' }), ...claimTrialStatements.map(s => appraise(s.id)), core({ type: 'COMPLETE_MISSION', missionId: 'claim-trial' })];
export const habitat: CampaignAction = { type: 'ASSESS_HABITAT', scenario: { gravity: 'lunar', oxygenPct: 26, pressureKpa: 55, ventilation: 'Fictional forced ventilation', material: 'PMMA panel' }, verdict: 'insufficient-evidence', citations: claim.citations, gaps: ['gravity', 'oxygen', 'pressure', 'ventilation', 'material'], nextMeasurements: ['gravity', 'pressure'], learnerExplanation: 'Investigate the missing conditions before drawing a conclusion.' };

