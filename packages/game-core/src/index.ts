import {
  GameActionSchema, GameStateSchema, GameStateV1Schema, PassportSchema, features, missionDefinitions, resolveFeature,
  type Catalog, type Citation, type EvidenceLevel, type GameState, type GameStateV1, type InstalledPart, type MissionId, type PartId,
  type Passport, type PassportEntry, type SessionMode, type StatementType
} from '@microfire/shared';

// ---------------- BASS-II apparatus model ----------------
/** Hardware description used to justify the part list and placements. Placement order is an educational model, not a NASA procedure. */
export const BASS_HARDWARE_CITATION: Citation = {
  sourceId: 'nasa-bass-ii-20210011385',
  locator: { kind: 'pdf', page: 12, printedPage: '4', section: 'Section 1.2 Experiment Description, BASS–II hardware' }
};
export type PartDefinition = { id: PartId; anchorId: string; requires: readonly PartId[]; orientationFault: { message: string; repair: string } | null; sourceNote: string };
export const partDefinitions: readonly PartDefinition[] = [
  { id: 'flow-duct', anchorId: 'msg-work-volume-mount', requires: [], orientationFault: null, sourceNote: '7.6 × 7.6 × 17 cm rectangular flow duct installed in the Microgravity Science Glovebox.' },
  { id: 'fan', anchorId: 'duct-inlet', requires: ['flow-duct'], orientationFault: { message: 'The fan is reversed, so it would not blow flow through the duct toward the test section.', repair: 'Remove the fan and reinstall it at the duct inlet facing into the duct.' }, sourceNote: 'Flow was blown through the duct by a variable-speed fan.' },
  { id: 'flow-straightener', anchorId: 'duct-honeycomb-slot', requires: ['flow-duct'], orientationFault: null, sourceNote: 'Flow passed through a honeycomb flow straightener and inlet screen to reduce swirl.' },
  { id: 'nitrogen-nozzle', anchorId: 'test-section-n2-port', requires: ['flow-duct'], orientationFault: null, sourceNote: 'A nozzle for N2 flow was inside the test section.' },
  { id: 'sample-holder', anchorId: 'top-mounting-rail', requires: ['flow-duct'], orientationFault: { message: 'The sample is mounted for concurrent flow, but the documented B20 run is opposed flow; its observation would not apply.', repair: 'Remove the sample holder and remount it in the opposed-flow orientation.' }, sourceNote: 'The top window was replaced by a mounting rail for solid samples; samples could be mounted for opposed or concurrent flow.' },
  { id: 'igniter', anchorId: 'front-window-igniter-lever', requires: ['sample-holder'], orientationFault: null, sourceNote: 'A hot-wire igniter coil was moved into position with a deployment lever; sample and igniter were changed through the front window.' },
  { id: 'still-camera', anchorId: 'top-window', requires: ['sample-holder'], orientationFault: { message: 'The still camera faces away from the top window, so the sample is out of view.', repair: 'Remove the still camera and reinstall it looking through the top window.' }, sourceNote: 'A still camera with a 60-mm lens used the top window.' },
  { id: 'video-camera', anchorId: 'front-window-mirror', requires: ['sample-holder'], orientationFault: { message: 'The video camera faces away from the turning mirror, so it cannot see the front window.', repair: 'Remove the video camera and reinstall it facing the turning mirror at the front window.' }, sourceNote: 'A color video camera with a turning mirror looked in the front window.' },
  { id: 'radiometer', anchorId: 'downstream-top-back-corner', requires: ['flow-duct'], orientationFault: { message: 'The radiometer faces downstream, but it must view the upstream direction where the flame is.', repair: 'Remove the radiometer and reinstall it in the downstream corner viewing upstream.' }, sourceNote: 'A thermopile detector sat in the downstream top back corner viewing upstream; its signal was not calibrated.' },
  { id: 'exit-plate', anchorId: 'duct-exit', requires: ['flow-duct'], orientationFault: null, sourceNote: 'The duct exit contained a perforated copper plate followed by a brass screen.' }
];
const partDef = (id: PartId) => partDefinitions.find((p) => p.id === id)!;

export type Fault = { partId: PartId; code: 'MISSING' | 'WRONG_ANCHOR' | 'MISSING_PREREQUISITE' | 'REVERSED'; message: string; repair: string };
export function diagnose(installed: readonly InstalledPart[]): { qualified: boolean; faults: Fault[] } {
  const faults: Fault[] = [];
  for (const def of partDefinitions) {
    const part = installed.find((p) => p.partId === def.id);
    if (!part) { faults.push({ partId: def.id, code: 'MISSING', message: `${def.id} is not installed.`, repair: `Install ${def.id} at ${def.anchorId}.` }); continue; }
    if (part.anchorId !== def.anchorId) faults.push({ partId: def.id, code: 'WRONG_ANCHOR', message: `${def.id} is mounted at ${part.anchorId}, not ${def.anchorId}.`, repair: `Remove ${def.id} and reinstall it at ${def.anchorId}.` });
    const missing = def.requires.filter((r) => !installed.some((p) => p.partId === r));
    if (missing.length) faults.push({ partId: def.id, code: 'MISSING_PREREQUISITE', message: `${def.id} is installed without ${missing.join(', ')}.`, repair: `Remove ${def.id}, install ${missing.join(', ')}, then reinstall ${def.id}.` });
    if (part.orientation === 'reversed' && def.orientationFault) faults.push({ partId: def.id, code: 'REVERSED', ...def.orientationFault });
  }
  return { qualified: faults.length === 0, faults };
}
/** Faults the reducer can never create; finding one in a save means it was edited or corrupted. */
const UNREACHABLE_FAULTS: readonly Fault['code'][] = ['WRONG_ANCHOR', 'MISSING_PREREQUISITE'];

// ---------------- Claim Trial content ----------------
/** Authored teaching statements. Only `research` statements quote the catalog; the others are labelled tutorial content, never evidence. */
export const claimTrialStatements = [
  { id: 'trial-b20-burned-sample', origin: 'research', claimId: 'bass2-b20-burned-entire-sample', text: 'The B20 observation log reports that the flame burned the entire sample.', expected: { kind: 'observed', evidenceLevel: 'direct' }, hint: 'This sentence is recorded in the observation column of Table A.1 for B20.' },
  { id: 'trial-b20-thickness', origin: 'research', claimId: null, text: 'The B20 sample was 0.1 mm thick.', expected: { kind: 'derived', evidenceLevel: 'direct' }, hint: 'The table states 100 µm; 0.1 mm is a unit conversion, so the value is derived, not transcribed.' },
  { id: 'trial-flow-caused-burnout', origin: 'authored-tutorial', claimId: null, text: 'Reducing the airflow from 5 to 3 cm/s caused B20 to burn the whole sample.', expected: { kind: 'hypothesis', evidenceLevel: 'gap' }, hint: 'The row lists a flow sequence and an outcome, but one run cannot isolate airflow as the cause.' },
  { id: 'trial-ai-lunar-claim', origin: 'authored-tutorial', claimId: null, text: 'A confident AI summary says: "B20 proves PMMA cannot burn in a lunar habitat."', expected: { kind: 'unknown', evidenceLevel: 'gap' }, hint: 'No validated record tested lunar gravity or habitat atmospheres; this claim is unsupported.' }
] as const satisfies readonly { id: string; origin: 'research' | 'authored-tutorial'; claimId: string | null; text: string; expected: { kind: StatementType; evidenceLevel: EvidenceLevel }; hint: string }[];

// ---------------- state ----------------
export function createGameState(datasetVersion: string, mode: SessionMode, at: string): GameState {
  return GameStateSchema.parse({ schemaVersion: 2, datasetVersion, mode, guidance: 'guided', activeMission: null,
    completedMissions: [], inspectedExperimentIds: [], setup: { revision: 0, installedParts: [], qualifiedRevision: null },
    predictions: [], classifications: [], decision: null, proposals: [],
    passport: { schemaVersion: 1, purpose: 'educational-research-record', entries: [] }, updatedAt: at });
}

export type TransitionCode = 'INVALID_ACTION' | 'UNAVAILABLE' | 'PREREQUISITE_MISSING' | 'WRONG_MISSION' | 'UNKNOWN_EXPERIMENT' | 'UNKNOWN_CLAIM' |
  'NOT_INSPECTED' | 'NOT_AN_OBSERVATION' | 'WRONG_ANCHOR' | 'ALREADY_INSTALLED' | 'NOT_INSTALLED' | 'HAS_DEPENDENTS' | 'QUALIFICATION_FAILED' |
  'NOT_QUALIFIED' | 'PREDICTION_REQUIRED' | 'UNSUPPORTED_DECISION' | 'COMPLETION_CRITERIA_UNMET' | 'LIMIT_REACHED' | 'INVARIANT_VIOLATION';
export type TransitionResult =
  | { ok: true; state: GameState; feedback?: { correct: boolean; hint: string } }
  | { ok: false; state: GameState; code: TransitionCode; message: string; faults?: Fault[] };
export type TransitionOptions = { isMissionAvailable?: (missionId: MissionId) => boolean };
/** Production gate: a mission is playable only when its feature is verified Available/Locked in the shared registry. */
export const registryAvailability = (missionId: MissionId, completed: readonly string[] = []) => {
  const feature = features.find((f) => f.id === missionId);
  return !!feature && resolveFeature(feature, completed).state === 'available';
};

const SETUP_MISSIONS: readonly MissionId[] = ['bass-assembly', 'flame-detective'];
/** Any setup change bumps the revision, drops qualification and invalidates setup-dependent proof and later completions. */
function changeSetup(state: GameState, installedParts: InstalledPart[]): GameState {
  const revision = state.setup.revision + 1;
  const entries = state.passport.entries.map((e) => e.status === 'current' && e.setupRevision !== null ? { ...e, status: 'invalidated' as const } : e);
  return { ...state, setup: { revision, installedParts, qualifiedRevision: null }, passport: { ...state.passport, entries }, completedMissions: currentPrefix(state.completedMissions, entries) };
}
function currentPrefix(completed: readonly MissionId[], entries: readonly PassportEntry[]): MissionId[] {
  const out: MissionId[] = [];
  for (const id of completed) { if (!entries.some((e) => e.missionId === id && e.status === 'current')) break; out.push(id); }
  return out;
}
function observedClaims(dataset: Catalog, experimentId: string) {
  const e = dataset.experiments.find((x) => x.id === experimentId);
  return e ? e.claims.filter((c) => c.kind === 'observed' && c.origin === 'research') : [];
}
function entryFrom(missionId: MissionId, id: string, dataset: Catalog, experimentId: string, claims: ReturnType<typeof observedClaims>, at: string,
  extra: Partial<Pick<PassportEntry, 'conclusion' | 'evidenceLevel' | 'corrections' | 'setupRevision' | 'scenario' | 'limitations'>> = {}): PassportEntry {
  const experiment = dataset.experiments.find((e) => e.id === experimentId)!;
  const citations: Citation[] = [];
  for (const c of claims.flatMap((x) => x.citations)) if (!citations.some((y) => JSON.stringify(y) === JSON.stringify(c))) citations.push(c);
  return {
    id, missionId, experimentIds: [experimentId], claimIds: claims.map((c) => c.id), observationType: 'observed', evidenceLevel: 'direct',
    conclusion: claims.map((c) => c.text).join(' '), citations, limitations: experiment.limitations.slice(0, 20), corrections: [],
    setupRevision: null, status: 'current', scenario: 'research', createdAt: at, ...extra
  };
}
const addEntry = (state: GameState, entry: PassportEntry): GameState =>
  state.passport.entries.some((e) => e.id === entry.id) ? state : { ...state, passport: { ...state.passport, entries: [...state.passport.entries, entry] } };

export function transition(state: GameState, input: unknown, dataset: Catalog, at: string, options: TransitionOptions = {}): TransitionResult {
  GameStateSchema.parse(state);
  const parsed = GameActionSchema.safeParse(input);
  const fail = (code: TransitionCode, message: string, faults?: Fault[]): TransitionResult => ({ ok: false, state, code, message, ...(faults ? { faults } : {}) });
  if (!parsed.success) return fail('INVALID_ACTION', 'Action does not match the game contract.');
  const action = parsed.data;
  const done = (next: GameState, feedback?: { correct: boolean; hint: string }): TransitionResult => {
    // Safety net: a rule gap must surface as a recoverable failure with the old state, never as a thrown error.
    const checked = GameStateSchema.safeParse({ ...next, updatedAt: at });
    if (!checked.success) return fail('INVARIANT_VIOLATION', 'This action would produce an inconsistent game state and was not applied.');
    return { ok: true, state: checked.data, ...(feedback ? { feedback } : {}) };
  };
  const requireMission = (allowed: readonly MissionId[]) => state.activeMission && allowed.includes(state.activeMission) ? null
    : fail('WRONG_MISSION', `This action belongs to ${allowed.join(' or ')}.`);
  const experiment = (id: string) => dataset.experiments.find((e) => e.id === id);
  const installed = state.setup.installedParts;

  switch (action.type) {
    case 'START_MISSION': {
      const available = options.isMissionAvailable ?? ((id: MissionId) => registryAvailability(id, state.completedMissions));
      if (!available(action.missionId)) return fail('UNAVAILABLE', 'This mission is not available yet.');
      const prerequisite = missionDefinitions.find((m) => m.id === action.missionId)!.prerequisite;
      if (prerequisite && !state.completedMissions.includes(prerequisite)) return fail('PREREQUISITE_MISSING', `Complete ${prerequisite} first.`);
      return done({ ...state, activeMission: action.missionId });
    }
    case 'INSPECT_EVIDENCE':
      if (!experiment(action.experimentId)) return fail('UNKNOWN_EXPERIMENT', 'Only validated catalog records can be inspected.');
      return done({ ...state, inspectedExperimentIds: [...new Set([...state.inspectedExperimentIds, action.experimentId])] });
    case 'COLLECT_EVIDENCE': {
      const wrong = requireMission(['station-arrival']); if (wrong) return wrong;
      const e = experiment(action.experimentId);
      if (!e) return fail('UNKNOWN_EXPERIMENT', 'Only validated catalog records can be collected.');
      if (!state.inspectedExperimentIds.includes(e.id)) return fail('NOT_INSPECTED', 'Open the source record before collecting evidence from it.');
      const claim = e.claims.find((c) => c.id === action.claimId);
      if (!claim) return fail('UNKNOWN_CLAIM', 'That statement is not part of this record.');
      if (claim.kind !== 'observed' || claim.origin !== 'research') return fail('NOT_AN_OBSERVATION', `This statement is ${claim.kind}; Station Arrival asks for what was actually observed.`);
      return done(addEntry(state, entryFrom('station-arrival', `station-arrival-${claim.id}`, dataset, e.id, [claim], at)));
    }
    case 'INSTALL_PART': {
      const wrong = requireMission(SETUP_MISSIONS); if (wrong) return wrong;
      const def = partDef(action.partId);
      if (installed.some((p) => p.partId === action.partId)) return fail('ALREADY_INSTALLED', `${action.partId} is already installed; remove it first to change it.`);
      const missing = def.requires.filter((r) => !installed.some((p) => p.partId === r));
      if (missing.length) return fail('PREREQUISITE_MISSING', `Install ${missing.join(', ')} before ${action.partId}.`);
      if (action.anchorId !== def.anchorId) return fail('WRONG_ANCHOR', `${action.partId} does not mount at ${action.anchorId}. ${def.sourceNote}`);
      return done(changeSetup(state, [...installed, { partId: action.partId, anchorId: action.anchorId, orientation: action.orientation }]));
    }
    case 'REMOVE_PART': {
      const wrong = requireMission(SETUP_MISSIONS); if (wrong) return wrong;
      if (!installed.some((p) => p.partId === action.partId)) return fail('NOT_INSTALLED', `${action.partId} is not installed.`);
      const dependents = installed.filter((p) => partDef(p.partId).requires.includes(action.partId)).map((p) => p.partId);
      if (dependents.length) return fail('HAS_DEPENDENTS', `Remove ${dependents.join(', ')} before ${action.partId}.`);
      return done(changeSetup(state, installed.filter((p) => p.partId !== action.partId)));
    }
    case 'QUALIFY_INSTRUMENT': {
      const wrong = requireMission(SETUP_MISSIONS); if (wrong) return wrong;
      const result = diagnose(installed);
      if (!result.qualified) return fail('QUALIFICATION_FAILED', `${result.faults.length} fault(s) found. Educational check only; not a certified lab build.`, result.faults);
      return done({ ...state, setup: { ...state.setup, qualifiedRevision: state.setup.revision } });
    }
    case 'PREDICT_OUTCOME': {
      const wrong = requireMission(['flame-detective']); if (wrong) return wrong;
      if (!experiment(action.experimentId)) return fail('UNKNOWN_EXPERIMENT', 'Choose a validated record.');
      if (!state.inspectedExperimentIds.includes(action.experimentId)) return fail('NOT_INSPECTED', 'Inspect the record conditions before predicting.');
      const others = state.predictions.filter((p) => p.experimentId !== action.experimentId);
      if (others.length >= 20) return fail('LIMIT_REACHED', 'Prediction limit reached.');
      return done({ ...state, predictions: [...others, { experimentId: action.experimentId, prediction: action.prediction, setupRevision: state.setup.revision, at }] });
    }
    case 'OBSERVE_DOCUMENTED_RESULT': {
      const wrong = requireMission(SETUP_MISSIONS); if (wrong) return wrong;
      const e = experiment(action.experimentId);
      if (!e) return fail('UNKNOWN_EXPERIMENT', 'Only validated catalog records have documented results.');
      if (state.setup.qualifiedRevision !== state.setup.revision) return fail('NOT_QUALIFIED', 'Qualify the instrument at its current setup before viewing the documented result.', diagnose(installed).faults);
      const prediction = state.predictions.find((p) => p.experimentId === e.id && p.setupRevision === state.setup.revision);
      if (state.activeMission === 'flame-detective' && !prediction) return fail('PREDICTION_REQUIRED', 'Record a prediction for this setup before viewing the documented result.');
      const claims = observedClaims(dataset, e.id);
      if (!claims.length) return fail('NOT_AN_OBSERVATION', 'This record has no documented observation to show.');
      const conclusion = prediction ? `Prediction: ${prediction.prediction.slice(0, 1000)} | Documented result: ${claims.map((c) => c.text).join(' ')}` : undefined;
      const id = `${state.activeMission}-${e.id}-r${state.setup.revision}`;
      return done(addEntry(state, entryFrom(state.activeMission!, id, dataset, e.id, claims, at, { setupRevision: state.setup.revision, ...(conclusion ? { conclusion } : {}) })));
    }
    case 'CLASSIFY_CLAIM': {
      const wrong = requireMission(['claim-trial']); if (wrong) return wrong;
      const statement = claimTrialStatements.find((s) => s.id === action.claimId);
      if (!statement) return fail('UNKNOWN_CLAIM', 'That statement is not part of this trial.');
      if (state.classifications.length >= 200) return fail('LIMIT_REACHED', 'Classification attempt limit reached.');
      const correct = statement.expected.kind === action.kind && statement.expected.evidenceLevel === action.evidenceLevel;
      return done({ ...state, classifications: [...state.classifications, { statementId: statement.id, kind: action.kind, evidenceLevel: action.evidenceLevel, correct, at }] },
        { correct, hint: correct ? 'Classification matches the source record.' : statement.hint });
    }
    case 'RECORD_DECISION': {
      const wrong = requireMission(['lunar-habitat']); if (wrong) return wrong;
      if (action.verdict !== 'insufficient-evidence') return fail('UNSUPPORTED_DECISION', 'An ISS record cannot establish that a lunar habitat is safe or unsafe. The supported verdict is insufficient evidence.');
      return done({ ...state, decision: { verdict: 'insufficient-evidence', at } });
    }
    case 'PROPOSE_NEXT_TEST': {
      const wrong = requireMission(['lunar-habitat']); if (wrong) return wrong;
      if (state.proposals.length >= 20) return fail('LIMIT_REACHED', 'Proposal limit reached.');
      return done({ ...state, proposals: [...state.proposals, { question: action.question, limitations: action.limitations, at }] });
    }
    case 'COMPLETE_MISSION': {
      if (state.activeMission !== action.missionId) return fail('WRONG_MISSION', 'Start this mission before completing it.');
      if (state.completedMissions.includes(action.missionId)) return done({ ...state, activeMission: null });
      const prerequisite = missionDefinitions.find((m) => m.id === action.missionId)!.prerequisite;
      // A setup change can revoke an earlier completion while a later mission is active; recover, don't crash.
      if (prerequisite && !state.completedMissions.includes(prerequisite))
        return fail('PREREQUISITE_MISSING', `${prerequisite} proof was invalidated by a setup change. Start ${prerequisite} again, qualify the instrument and record its observation, then return to finish ${action.missionId}.`);
      const current = (m: MissionId, rev?: number) => state.passport.entries.some((e) => e.missionId === m && e.status === 'current' && (rev === undefined || e.setupRevision === rev));
      const unmet = (message: string) => fail('COMPLETION_CRITERIA_UNMET', message);
      let next = state;
      switch (action.missionId) {
        case 'station-arrival': if (!current('station-arrival')) return unmet('Collect one observed, cited statement from a validated record.'); break;
        case 'bass-assembly':
          if (state.setup.qualifiedRevision !== state.setup.revision) return unmet('Qualify the instrument.');
          if (!current('bass-assembly', state.setup.revision)) return unmet('View the documented result with the qualified instrument.'); break;
        case 'flame-detective': if (!current('flame-detective', state.setup.revision)) return unmet('Predict, then view the documented result with a qualified instrument.'); break;
        case 'claim-trial': {
          const latest = claimTrialStatements.map((s) => [...state.classifications].reverse().find((c) => c.statementId === s.id));
          if (latest.some((c) => !c?.correct)) return unmet('Classify every trial statement correctly.');
          const anchor = claimTrialStatements.find((s) => s.claimId)!;
          const e = dataset.experiments.find((x) => x.claims.some((c) => c.id === anchor.claimId));
          if (!e) return unmet('The trial evidence is not in this dataset.');
          const corrections = state.classifications.filter((c) => !c.correct).slice(0, 100).map((c) => {
            const s = claimTrialStatements.find((x) => x.id === c.statementId)!;
            return { previous: `${s.id}: ${c.kind}/${c.evidenceLevel}`, revised: `${s.id}: ${s.expected.kind}/${s.expected.evidenceLevel}`, reason: s.hint, at: c.at };
          });
          next = addEntry(state, entryFrom('claim-trial', 'claim-trial-argument', dataset, e.id, e.claims.filter((c) => c.id === anchor.claimId), at,
            { corrections, conclusion: 'Observed statements were separated from derived values, an untested causal hypothesis and an unsupported lunar claim.' }));
          break;
        }
        case 'lunar-habitat': {
          if (!state.decision) return unmet('Record the evidence verdict.');
          if (!state.proposals.length) return unmet('Propose a next measurement that would address the gap.');
          const e = dataset.experiments.find((x) => state.inspectedExperimentIds.includes(x.id) && observedClaims(dataset, x.id).length);
          if (!e) return unmet('Inspect a validated record to cite.');
          const limitations = [...new Set([...state.proposals.flatMap((p) => p.limitations), ...e.limitations])].slice(0, 20);
          next = addEntry(state, entryFrom('lunar-habitat', 'lunar-habitat-case-report', dataset, e.id, observedClaims(dataset, e.id), at, {
            scenario: 'fictional-scenario', evidenceLevel: 'gap', limitations,
            conclusion: `Fictional scenario. Verdict: insufficient evidence. Proposed next test: ${state.proposals.at(-1)!.question.slice(0, 1000)}`
          }));
          break;
        }
      }
      return done({ ...next, activeMission: null, completedMissions: [...state.completedMissions, action.missionId] });
    }
  }
}

export function exportPassport(state: GameState): Passport { return PassportSchema.parse(GameStateSchema.parse(state).passport); }

// ---------------- persistence ----------------
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const saveKey = (mode: SessionMode) => `microfire-v2:save:v1:${mode}`;
const MAX_SAVE = 500_000;
export type LoadResult = { status: 'loaded'; state: GameState; migratedFrom: 1 | null } | { status: 'empty' | 'corrupt' | 'unsupported-version' | 'dataset-mismatch' | 'storage-unavailable' };

/** v1 never supported installing parts, so any v1 parts cannot be trusted: drop them and invalidate setup-dependent proof. */
export function migrateV1(v1: GameStateV1): GameState {
  const { setup, ...rest } = v1;
  const base = { ...rest, schemaVersion: 2 as const, predictions: [], classifications: [], decision: null, proposals: [] };
  const state: GameState = { ...base, setup: { revision: setup.revision, installedParts: [], qualifiedRevision: null } };
  return GameStateSchema.parse(setup.installedParts.length || setup.qualifiedRevision !== null ? changeSetup(state, []) : state);
}
export function loadProgress(storage: SaveStorage, mode: SessionMode, datasetVersion: string): LoadResult {
  let raw: string | null;
  try { raw = storage.getItem(saveKey(mode)); } catch { return { status: 'storage-unavailable' }; }
  if (raw === null) return { status: 'empty' };
  if (raw.length > MAX_SAVE) return { status: 'corrupt' };
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return { status: 'corrupt' }; }
  const version = typeof input === 'object' && input !== null && 'schemaVersion' in input ? input.schemaVersion : undefined;
  let state: GameState, migratedFrom: 1 | null = null;
  if (version === 2) {
    const result = GameStateSchema.safeParse(input);
    if (!result.success) return { status: 'corrupt' };
    state = result.data;
  } else if (version === 1) {
    const result = GameStateV1Schema.safeParse(input);
    if (!result.success) return { status: 'corrupt' };
    try { state = migrateV1(result.data); migratedFrom = 1; } catch { return { status: 'corrupt' }; }
  } else return version === undefined ? { status: 'corrupt' } : { status: 'unsupported-version' };
  if (state.mode !== mode) return { status: 'corrupt' };
  if (!setupIsConsistent(state)) return { status: 'corrupt' };
  if (state.datasetVersion !== datasetVersion) return { status: 'dataset-mismatch' };
  return { status: 'loaded', state, migratedFrom };
}
/** Rejects setups the reducer cannot produce: misplaced or orphaned parts, or a qualification the rig does not pass. */
export function setupIsConsistent(state: GameState): boolean {
  const check = diagnose(state.setup.installedParts);
  return !check.faults.some((f) => UNREACHABLE_FAULTS.includes(f.code)) && (state.setup.qualifiedRevision === null || check.qualified);
}
export function saveProgress(storage: SaveStorage, state: GameState): { ok: boolean; reason?: 'invalid-state' | 'storage-unavailable' | 'existing-save-needs-review' } {
  const parsed = GameStateSchema.safeParse(state);
  if (!parsed.success || !setupIsConsistent(parsed.data)) return { ok: false, reason: 'invalid-state' };
  const existing = loadProgress(storage, state.mode, state.datasetVersion);
  if (existing.status === 'storage-unavailable') return { ok: false, reason: 'storage-unavailable' };
  if (!['loaded', 'empty'].includes(existing.status)) return { ok: false, reason: 'existing-save-needs-review' };
  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > MAX_SAVE) return { ok: false, reason: 'invalid-state' };
  try { storage.setItem(saveKey(state.mode), serialized); return { ok: true }; }
  catch { return { ok: false, reason: 'storage-unavailable' }; }
}
/** Recovery: hand the raw save to the player (e.g. as a download) before any discard. */
export function readRawSave(storage: SaveStorage, mode: SessionMode): { ok: true; raw: string | null } | { ok: false; reason: 'storage-unavailable' } {
  try { return { ok: true, raw: storage.getItem(saveKey(mode)) }; } catch { return { ok: false, reason: 'storage-unavailable' }; }
}
/** Deletion requires an explicit confirmation token so no code path discards a save implicitly. */
export function discardSave(storage: SaveStorage, mode: SessionMode, confirmation: 'discard-save-after-export'): { ok: boolean } {
  if (confirmation !== 'discard-save-after-export') return { ok: false };
  try { storage.removeItem(saveKey(mode)); return { ok: true }; } catch { return { ok: false }; }
}
