import {
  CAMPAIGN_RULES_VERSION, CampaignActionSchema, CampaignRecordSchema, campaignJson, canonicalJson,
  type CampaignAction, type CampaignRecord, type Catalog, type Citation, type GameState, type Training
} from '@microfire/shared';
import { createTrainingCase, transitionTraining } from './training';
import { claimTrialStatements, partDefinitions, transition } from './index';

export type CampaignFeedback = { correct: boolean; reasons: string[]; citations: Citation[]; scope: 'educational-criteria-not-semantic-validation' };
export type CampaignView = {
  state: GameState; training: Training; sourceReviewed: boolean; selectedExperimentId: string | null;
  explanation: CampaignFeedback | null; appraisals: Record<string, CampaignFeedback>; habitat: CampaignFeedback | null;
};
export type CampaignResult = { ok: true; record: CampaignRecord; view: CampaignView; feedback?: CampaignFeedback }
  | { ok: false; record: CampaignRecord; code: string; message: string };
const unique = (items: readonly string[]) => new Set(items).size === items.length;
const matchesCitations = (got: Citation[], expected: Citation[]) => got.length > 0 &&
  got.every(c => expected.some(e => canonicalJson(e) === canonicalJson(c))) &&
  expected.every(e => got.some(c => canonicalJson(e) === canonicalJson(c)));
const assess = (checks: [boolean, string][], citations: Citation[]): CampaignFeedback => ({
  correct: checks.every(([ok]) => ok), reasons: checks.filter(([ok]) => !ok).map(([, why]) => why), citations,
  scope: 'educational-criteria-not-semantic-validation'
});
const anchorClaim = (dataset: Catalog) => dataset.experiments[0]!.claims.find(c => c.id === 'bass2-b20-burned-entire-sample')!;
function apply(view: CampaignView, action: CampaignAction, dataset: Catalog, at: string): { ok: true; view: CampaignView; feedback?: CampaignFeedback } | { ok: false; code: string; message: string } {
  const fail = (code: string, message: string) => ({ ok: false as const, code, message });
  const v = structuredClone(view), s = v.state, claim = anchorClaim(dataset);
  const phase = (id: string) => s.activeMission === id;
  if (s.activeMission && s.completedMissions.includes(s.activeMission) && !(action.type === 'CORE' && ['START_MISSION', 'INSPECT_EVIDENCE', 'COMPLETE_MISSION'].includes(action.action.type)))
    return fail('WRONG_PHASE', 'Completed mission evidence is read-only. Revisit the source or start a separate investigation to revise it.');
  const result = (feedback?: CampaignFeedback) => ({ ok: true as const, view: v, ...(feedback ? { feedback } : {}) });
  if (action.type === 'REVIEW_SOURCE') {
    if (!phase('station-arrival') || !s.inspectedExperimentIds.includes('bass2-b20')) return fail('NOT_INSPECTED', 'Inspect the B20 evidence terminal before verifying its source.');
    const feedback = assess([
      [action.claimId === claim.id && matchesCitations(action.citations, claim.citations), 'Select the B20 observation and its exact primary-source locator.'],
      [action.observationOrigin === 'research', 'The B20 observation is documented research.'],
      [action.incidentOrigin === 'fiction', 'The station incident is authored fiction, not NASA telemetry.']
    ], claim.citations);
    v.sourceReviewed = feedback.correct; return result(feedback);
  }
  if (action.type === 'TRAINING') {
    if (action.action.type === 'GAME' && action.action.action.type === 'COMPLETE_MISSION' && action.action.action.missionId === 'station-arrival' && !v.sourceReviewed)
      return fail('SOURCE_REVIEW_REQUIRED', 'Verify the source and distinguish the fictional incident before leaving Station Arrival.');
    const next = transitionTraining({ state: s, training: v.training }, action.action, dataset, at);
    if (!next.ok) return fail(next.code, next.message);
    v.state = next.current.state; v.training = next.current.training;
    return result(next.feedback ? assess([[next.feedback.correct, next.feedback.hint]], []) : undefined);
  }
  if (action.type === 'SELECT_EXPERIMENT') {
    if (!phase('flame-detective')) return fail('WRONG_MISSION', 'Start Flame Detective before selecting an experiment.');
    const e = dataset.experiments.find(e => e.id === action.experimentId);
    if (!e) return fail('UNKNOWN_EXPERIMENT', 'Only admitted experiments can reveal a documented observation.');
    if (s.predictions.some(p => p.setupRevision === s.setup.revision)) return fail('PREDICTION_LOCKED', 'The prediction already binds this experiment and setup.');
    for (const [field, value] of Object.entries(action.targetConditions)) {
      const c = e.conditions[field as keyof typeof action.targetConditions];
      if (!c || c.status !== 'known' || c.value !== value) return fail('HYPOTHETICAL_CONDITIONS', 'These conditions are unsupported or differ from the source. No NASA outcome is generated.');
    }
    v.selectedExperimentId = e.id; return result();
  }
  if (action.type === 'EXPLAIN_OBSERVATION') {
    if (!phase('flame-detective') || !s.passport.entries.some(e => e.missionId === 'flame-detective' && e.status === 'current'))
      return fail('OBSERVATION_REQUIRED', 'Lock a prediction and deliberately open the source observation first.');
    const feedback = assess([
      [action.claimId === claim.id && matchesCitations(action.citations, claim.citations), 'Cite the admitted observation at its exact locator.'],
      [action.relation === 'source-observation', 'One B20 run establishes an observation; it cannot isolate airflow causation or prove lunar behavior.'],
      [unique(action.limitations) && ['single-run-no-causality', 'pressure-unknown', 'not-lunar-evidence'].every(x => action.limitations.includes(x as typeof action.limitations[number])), 'Acknowledge the single run, unknown pressure and lack of lunar evidence.']
    ], claim.citations);
    v.explanation = feedback;
    const entry = v.state.passport.entries.find(e => e.missionId === 'flame-detective')!;
    // Learner prose is retained without upgrading it to source-verified scientific truth.
    entry.learnerNotes = [action.learnerExplanation]; return result(feedback);
  }
  if (action.type === 'APPRAISE_CLAIM') {
    if (!phase('claim-trial')) return fail('WRONG_MISSION', 'Start Claim Trial before evaluating an argument.');
    const statement = claimTrialStatements.find(x => x.id === action.statementId);
    if (!statement) return fail('UNKNOWN_CLAIM', 'Choose one of the authored trial statements.');
    const thickness = statement.id === 'trial-b20-thickness', causal = statement.id === 'trial-flow-caused-burnout', lunar = statement.id === 'trial-ai-lunar-claim';
    const expectedCites = thickness ? [dataset.experiments[0]!.conditions.thicknessMm].flatMap(c => c.status === 'known' ? [c.citation] : []) : claim.citations;
    const feedback = assess([
      [action.kind === statement.expected.kind && action.evidenceLevel === (thickness ? 'analogous' : statement.expected.evidenceLevel), statement.hint + (thickness ? ' A unit derivation is not a directly transcribed observation.' : '')],
      [matchesCitations(action.citations, expectedCites), 'Select the source locator for this statement, rather than an unrelated citation.'],
      [action.support === (causal || lunar ? 'insufficient' : 'supports'), 'Separate lack of support from contradiction: this run does not settle a lunar claim or isolate an airflow cause.'],
      [unique(action.confounders) && (!causal || action.confounders.includes('flow-history')) && (!lunar || ['gravity', 'pressure'].every(x => action.confounders.includes(x as typeof action.confounders[number]))), 'Identify the varying flow history or the missing gravity and pressure applicability.']
    ], expectedCites);
    v.appraisals[statement.id] = feedback;
    // Keep the legacy reducer's classification vocabulary; the campaign's stricter applicability assessment is separate.
    const classified = transition(s, { type: 'CLASSIFY_CLAIM', claimId: statement.id, kind: feedback.correct ? statement.expected.kind : 'unknown', evidenceLevel: feedback.correct ? statement.expected.evidenceLevel : 'direct' }, dataset, at, { isMissionAvailable: () => true });
    if (!classified.ok) return fail(classified.code, classified.message);
    v.state = classified.state; return result(feedback);
  }
  if (action.type === 'ASSESS_HABITAT') {
    if (!phase('lunar-habitat')) return fail('WRONG_MISSION', 'Start the fictional habitat case before assessing its evidence.');
    const feedback = assess([
      [action.verdict === 'insufficient-evidence', 'The admitted orbital record cannot certify this fictional habitat as safe or unsafe.'],
      [matchesCitations(action.citations, claim.citations), 'Use the admitted B20 source as related evidence, with its applicability limits.'],
      [unique(action.gaps) && ['gravity', 'oxygen', 'pressure', 'ventilation', 'material'].every(x => action.gaps.includes(x as typeof action.gaps[number])), 'Assess all five applicability dimensions; related PMMA evidence is not a lunar material qualification.'],
      [unique(action.nextMeasurements) && action.nextMeasurements.includes('gravity') && action.nextMeasurements.includes('pressure'), 'Propose measurements addressing at least lunar gravity and the missing pressure evidence.']
    ], claim.citations);
    v.habitat = feedback; return result(feedback);
  }
  const a = action.action;
  if ((a.type === 'START_MISSION' || a.type === 'COMPLETE_MISSION') && ['station-arrival', 'bass-assembly'].includes(a.missionId)) return fail('WRONG_PHASE', 'The completed training episode is immutable. Start a separate case to rebuild it.');
  if (['INSTALL_PART', 'REMOVE_PART', 'QUALIFY_INSTRUMENT', 'COLLECT_EVIDENCE', 'CLASSIFY_CLAIM'].includes(a.type)) return fail('UNSUPPORTED_OPERATION', 'Use the campaign assessment actions; the completed M2 apparatus stays locked.');
  if (a.type === 'PREDICT_OUTCOME') {
    if (v.selectedExperimentId !== a.experimentId) return fail('EXPERIMENT_REQUIRED', 'Select and inspect admitted source conditions first.');
    if (s.predictions.some(p => p.experimentId === a.experimentId && p.setupRevision === s.setup.revision)) return fail('PREDICTION_LOCKED', 'The first registered prediction is locked before observation.');
  }
  if (a.type === 'OBSERVE_DOCUMENTED_RESULT' && v.selectedExperimentId !== a.experimentId) return fail('EXPERIMENT_REQUIRED', 'The observation must belong to the selected admitted experiment.');
  if (a.type === 'RECORD_DECISION' && !v.habitat?.correct) return fail('ASSESSMENT_REQUIRED', 'Evaluate applicability and evidence gaps before recording a decision.');
  if (a.type === 'COMPLETE_MISSION') {
    if (a.missionId === 'flame-detective' && !v.explanation?.correct) return fail('EXPLANATION_REQUIRED', 'Reconcile the observation with the prediction and identify the evidence limits.');
    if (a.missionId === 'claim-trial' && !claimTrialStatements.every(x => Object.hasOwn(v.appraisals, x.id) && v.appraisals[x.id]?.correct)) return fail('APPRAISAL_REQUIRED', 'Classify every statement, select its evidence and explain the applicability or confounder.');
    if (a.missionId === 'lunar-habitat' && !v.habitat?.correct) return fail('ASSESSMENT_REQUIRED', 'Assess the fictional scenario using source evidence and remaining gaps.');
  }
  const next = transition(s, a, dataset, at, { isMissionAvailable: () => true });
  if (!next.ok) return fail(next.code, next.message);
  v.state = next.state; return result();
}

export function createCampaign(sessionId: string, dataset: Catalog, at: string): CampaignRecord {
  return CampaignRecordSchema.parse({ campaignVersion: 1, rulesVersion: CAMPAIGN_RULES_VERSION, datasetVersion: dataset.datasetVersion, sessionId, startedAt: at, events: [] });
}
/** Replaying accepted events derives all proof. A parsed or edited snapshot never becomes authority. */
export function replayCampaign(input: unknown, dataset: Catalog): CampaignView {
  const record = CampaignRecordSchema.parse(input);
  if (campaignJson(record) !== campaignJson(input) || record.datasetVersion !== dataset.datasetVersion || new TextEncoder().encode(campaignJson(record)).length > 131072) throw Error('Incompatible campaign record');
  const initial = createTrainingCase(dataset, record.startedAt);
  let view: CampaignView = { ...initial, sourceReviewed: false, selectedExperimentId: null, explanation: null, appraisals: {}, habitat: null };
  let previous = record.startedAt;
  for (const event of record.events) {
    if (event.at < previous) throw Error('Campaign clock moved backwards');
    const r = apply(view, event.action, dataset, event.at);
    if (!r.ok) throw Error('Unreachable campaign event: ' + r.code);
    view = r.view; previous = event.at;
  }
  return view;
}
export function transitionCampaign(record: CampaignRecord, input: unknown, dataset: Catalog, at: string): CampaignResult {
  const view = replayCampaign(record, dataset), parsed = CampaignActionSchema.safeParse(input);
  const fail = (code: string, message: string): CampaignResult => ({ ok: false, record, code, message });
  if (!parsed.success) return fail('INVALID_ACTION', 'Action does not match campaign v1.');
  if (at < (record.events.at(-1)?.at ?? record.startedAt)) return fail('INVALID_TIME', 'Preserve the previous record and correct the local clock.');
  if (record.events.length >= 256) return fail('CAMPAIGN_LIMIT_REACHED', 'The bounded campaign log is full; preserve this record.');
  const r = apply(view, parsed.data, dataset, at);
  if (!r.ok) return fail(r.code, r.message);
  // shortcut: bounded local replay log, review compaction before a public or long-running campaign.
  const essential = advancesCompletion(view, r.view, parsed.data);
  if (record.events.length >= 192 && !essential)
    return fail('CAMPAIGN_LIMIT_REACHED', 'Optional history budget reached. Required investigation and repair steps remain available; preserve a checkpoint.');
  const next = { ...record, events: [...record.events, { at, action: parsed.data }] };
  if (!essential && new TextEncoder().encode(campaignJson(next)).length > 98304)
    return fail('CAMPAIGN_LIMIT_REACHED', 'Optional byte budget reached. Completion headroom and the previous record are preserved.');
  try { replayCampaign(next, dataset); } catch { return fail('INVALID_STATE', 'The proposed record failed replay validation; previous progress is unchanged.'); }
  return { ok: true, record: next, view: r.view, ...(r.feedback ? { feedback: r.feedback } : {}) };
}

function advancesCompletion(before: CampaignView, after: CampaignView, action: CampaignAction): boolean {
  const healthy = (v: CampaignView) => v.state.setup.installedParts.filter(p => p.orientation === 'correct').length;
  const reversed = (v: CampaignView) => v.state.setup.installedParts.filter(p => p.orientation === 'reversed').length;
  if (after.state.completedMissions.length > before.state.completedMissions.length || after.state.passport.entries.length > before.state.passport.entries.length ||
    after.state.predictions.length > before.state.predictions.length || healthy(after) > healthy(before) || reversed(after) < reversed(before)) return true;
  if (!before.sourceReviewed && after.sourceReviewed || !before.selectedExperimentId && after.selectedExperimentId ||
    !before.explanation?.correct && after.explanation?.correct || !before.habitat?.correct && after.habitat?.correct ||
    Object.keys(after.appraisals).some(id => !before.appraisals[id]?.correct && after.appraisals[id]?.correct)) return true;
  if (!before.state.inspectedExperimentIds.length && after.state.inspectedExperimentIds.length ||
    !before.state.decision && after.state.decision || !before.state.proposals.length && after.state.proposals.length ||
    before.state.activeMission !== after.state.activeMission && after.state.activeMission !== null ||
    before.state.setup.qualifiedRevision === null && after.state.setup.qualifiedRevision !== null) return true;
  if (!before.training.fault && after.training.fault || !before.training.diagnosis && after.training.diagnosis ||
    !before.training.pendingRepair && after.training.pendingRepair || !before.training.repair && after.training.repair) return true;
  if (before.training.fault && !before.training.diagnosis && before.training.diagnosticRevision !== before.state.setup.revision && after.training.diagnosticRevision === after.state.setup.revision) return true;
  if (action.type === 'TRAINING' && action.action.type === 'GAME' && action.action.action.type === 'REMOVE_PART') {
    const partId = action.action.action.partId;
    return partDefinitions.find(p => p.id === partId)!.requires.some(id => before.state.setup.installedParts.some(p => p.partId === id && p.orientation === 'reversed'));
  }
  return false;
}
