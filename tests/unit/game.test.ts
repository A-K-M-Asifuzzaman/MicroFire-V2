import { describe, expect, it } from 'vitest';
import {
  claimTrialStatements, createGameState, diagnose, discardSave, exportPassport, loadProgress, migrateV1, partDefinitions, readRawSave,
  saveKey, saveProgress, transition, type SaveStorage, type TransitionResult
} from '@microfire/game-core';
import { GameActionSchema, GameStateSchema, MissionIdSchema, type GameAction, type GameState, type PartId } from '@microfire/shared';
import { catalog, validatePassport } from '@microfire/science';

const at = '2026-10-11T09:00:00Z';
const open = { isMissionAvailable: () => true };
const initial = () => createGameState(catalog.datasetVersion, 'normal', at);
function memory(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
}
const step = (state: GameState, action: GameAction): TransitionResult => transition(state, action, catalog, at, open);
function play(state: GameState, actions: GameAction[]): GameState {
  for (const action of actions) {
    const result = step(state, action);
    if (!result.ok) throw new Error(`${action.type} failed: ${result.code} ${result.message}`);
    state = result.state;
  }
  return state;
}
const install = (partId: PartId, orientation: 'correct' | 'reversed' = 'correct'): GameAction =>
  ({ type: 'INSTALL_PART', partId, anchorId: partDefinitions.find((p) => p.id === partId)!.anchorId, orientation });
const allParts = partDefinitions.map((p) => install(p.id));
const station: GameAction[] = [
  { type: 'START_MISSION', missionId: 'station-arrival' }, { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' },
  { type: 'COLLECT_EVIDENCE', experimentId: 'bass2-b20', claimId: 'bass2-b20-burned-entire-sample' }, { type: 'COMPLETE_MISSION', missionId: 'station-arrival' }
];
const assembly: GameAction[] = [{ type: 'START_MISSION', missionId: 'bass-assembly' }, ...allParts, { type: 'QUALIFY_INSTRUMENT' },
  { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }, { type: 'COMPLETE_MISSION', missionId: 'bass-assembly' }];
const detective: GameAction[] = [{ type: 'START_MISSION', missionId: 'flame-detective' },
  { type: 'PREDICT_OUTCOME', experimentId: 'bass2-b20', prediction: 'The flame will go out early.' },
  { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }, { type: 'COMPLETE_MISSION', missionId: 'flame-detective' }];
const trial: GameAction[] = [{ type: 'START_MISSION', missionId: 'claim-trial' },
  ...claimTrialStatements.map((s): GameAction => ({ type: 'CLASSIFY_CLAIM', claimId: s.id, kind: s.expected.kind, evidenceLevel: s.expected.evidenceLevel })),
  { type: 'COMPLETE_MISSION', missionId: 'claim-trial' }];
const lunar: GameAction[] = [{ type: 'START_MISSION', missionId: 'lunar-habitat' }, { type: 'RECORD_DECISION', verdict: 'insufficient-evidence' },
  { type: 'PROPOSE_NEXT_TEST', question: 'Measure PMMA flame spread at lunar gravity and the habitat oxygen/pressure.', limitations: ['ISS data are not lunar gravity.'] },
  { type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' }];

describe('production gating', () => {
  it('keeps every mission unavailable under the real feature registry, so URLs cannot skip ahead', () => {
    for (const missionId of MissionIdSchema.options)
      expect(transition(initial(), { type: 'START_MISSION', missionId }, catalog, at)).toMatchObject({ ok: false, code: 'UNAVAILABLE' });
  });
  it('enforces mission order even when missions are open', () => {
    expect(step(initial(), { type: 'START_MISSION', missionId: 'lunar-habitat' })).toMatchObject({ ok: false, code: 'PREREQUISITE_MISSING' });
    expect(step(initial(), { type: 'COMPLETE_MISSION', missionId: 'station-arrival' })).toMatchObject({ ok: false, code: 'WRONG_MISSION' });
    expect(GameStateSchema.safeParse({ ...initial(), completedMissions: ['lunar-habitat'] }).success).toBe(false);
  });
});

describe('evidence inspection and collection', () => {
  it('inspects real records idempotently and rejects unknown or quarantined ones', () => {
    const s = play(initial(), [{ type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }, { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }]);
    expect(s.inspectedExperimentIds).toEqual(['bass2-b20']);
    expect(s.passport.entries).toEqual([]);
    expect(step(initial(), { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b16' })).toMatchObject({ ok: false, code: 'UNKNOWN_EXPERIMENT' });
  });
  it('requires inspection first, a real claim, and never duplicates proof', () => {
    const started = play(initial(), [station[0]!]);
    expect(step(started, station[2]!)).toMatchObject({ ok: false, code: 'NOT_INSPECTED' });
    const inspected = play(started, [station[1]!]);
    expect(step(inspected, { type: 'COLLECT_EVIDENCE', experimentId: 'bass2-b20', claimId: 'invented-claim' })).toMatchObject({ ok: false, code: 'UNKNOWN_CLAIM' });
    const twice = play(inspected, [station[2]!, station[2]!]);
    expect(twice.passport.entries).toHaveLength(1);
    expect(twice.passport.entries[0]).toMatchObject({ observationType: 'observed', evidenceLevel: 'direct', scenario: 'research', setupRevision: null });
  });
});

describe('BASS-II assembly, faults and repair', () => {
  const ready = () => play(initial(), [...station, assembly[0]!]);
  it('enforces dependencies, anchors and duplicate installs with diagnosable messages', () => {
    expect(step(ready(), install('igniter'))).toMatchObject({ ok: false, code: 'PREREQUISITE_MISSING' });
    const duct = play(ready(), [install('flow-duct')]);
    expect(step(duct, { type: 'INSTALL_PART', partId: 'fan', anchorId: 'duct-exit', orientation: 'correct' })).toMatchObject({ ok: false, code: 'WRONG_ANCHOR' });
    expect(step(duct, install('flow-duct'))).toMatchObject({ ok: false, code: 'ALREADY_INSTALLED' });
    const holder = play(duct, [install('sample-holder'), install('igniter')]);
    expect(step(holder, { type: 'REMOVE_PART', partId: 'sample-holder' })).toMatchObject({ ok: false, code: 'HAS_DEPENDENTS' });
    expect(step(holder, { type: 'REMOVE_PART', partId: 'radiometer' })).toMatchObject({ ok: false, code: 'NOT_INSTALLED' });
  });
  it('diagnoses a reversed fan and camera, blocks observation, then accepts the exact repair', () => {
    const faulty = play(ready(), allParts.map((a) => a.type === 'INSTALL_PART' && (a.partId === 'fan' || a.partId === 'still-camera') ? install(a.partId, 'reversed') : a));
    const qualify = step(faulty, { type: 'QUALIFY_INSTRUMENT' });
    expect(qualify).toMatchObject({ ok: false, code: 'QUALIFICATION_FAILED' });
    if (qualify.ok) throw new Error('unreachable');
    expect(qualify.faults?.map((f) => [f.partId, f.code])).toEqual([['fan', 'REVERSED'], ['still-camera', 'REVERSED']]);
    expect(qualify.faults?.[0]?.repair).toMatch(/reinstall it at the duct inlet/);
    expect(step(faulty, { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' })).toMatchObject({ ok: false, code: 'NOT_QUALIFIED' });
    const repaired = play(faulty, [{ type: 'REMOVE_PART', partId: 'fan' }, install('fan'), { type: 'REMOVE_PART', partId: 'still-camera' }, install('still-camera'), { type: 'QUALIFY_INSTRUMENT' }]);
    expect(repaired.setup.qualifiedRevision).toBe(repaired.setup.revision);
    expect(diagnose(repaired.setup.installedParts).qualified).toBe(true);
  });
  it('invalidates setup-dependent proof and later completions when the rig changes, but keeps source notes', () => {
    const done = play(initial(), [...station, ...assembly]);
    expect(done.completedMissions).toEqual(['station-arrival', 'bass-assembly']);
    const changed = play(done, [{ type: 'START_MISSION', missionId: 'flame-detective' }, { type: 'REMOVE_PART', partId: 'radiometer' }]);
    expect(changed.completedMissions).toEqual(['station-arrival']);
    expect(changed.setup.qualifiedRevision).toBeNull();
    expect(changed.passport.entries.find((e) => e.missionId === 'bass-assembly')?.status).toBe('invalidated');
    expect(changed.passport.entries.find((e) => e.missionId === 'station-arrival')?.status).toBe('current');
  });
});

describe('later missions', () => {
  it('requires a prediction for the current setup before revealing the documented result', () => {
    const s = play(initial(), [...station, ...assembly, detective[0]!]);
    expect(step(s, detective[2]!)).toMatchObject({ ok: false, code: 'PREDICTION_REQUIRED' });
    const done = play(s, detective.slice(1));
    expect(done.passport.entries.find((e) => e.missionId === 'flame-detective')?.conclusion).toMatch(/^Prediction: The flame will go out early\. \| Documented result:/);
  });
  it('records misclassifications with a hint and a correction history', () => {
    const s = play(initial(), [...station, ...assembly, ...detective, trial[0]!]);
    const wrong = step(s, { type: 'CLASSIFY_CLAIM', claimId: 'trial-ai-lunar-claim', kind: 'observed', evidenceLevel: 'direct' });
    expect(wrong).toMatchObject({ ok: true, feedback: { correct: false } });
    expect(step(wrong.state, trial.at(-1)!)).toMatchObject({ ok: false, code: 'COMPLETION_CRITERIA_UNMET' });
    const done = play(wrong.state, trial.slice(1));
    expect(done.passport.entries.find((e) => e.missionId === 'claim-trial')?.corrections).toHaveLength(1);
  });
  it('rejects a safety verdict and awards only fictional gap evidence on the lunar case', () => {
    const s = play(initial(), [...station, ...assembly, ...detective, ...trial, lunar[0]!]);
    expect(step(s, { type: 'RECORD_DECISION', verdict: 'safe' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_DECISION' });
    expect(step(play(s, [lunar[1]!]), lunar[3]!)).toMatchObject({ ok: false, code: 'COMPLETION_CRITERIA_UNMET' });
    const done = play(s, lunar.slice(1));
    expect(done.completedMissions).toEqual(MissionIdSchema.options);
    expect(done.passport.entries.find((e) => e.missionId === 'lunar-habitat')).toMatchObject({ scenario: 'fictional-scenario', evidenceLevel: 'gap' });
    expect(validatePassport(exportPassport(done)).entries).toHaveLength(5);
  });
  it('keeps claim-trial research statements tied to real catalog claims', () => {
    const claims = catalog.experiments.flatMap((e) => e.claims.map((c) => c.id));
    for (const s of claimTrialStatements) if (s.claimId) expect(claims).toContain(s.claimId);
  });
});

describe('property: random play never fabricates or duplicates evidence', () => {
  it('holds over 2,000 seeded random actions', () => {
    let seed = 42;
    const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return (seed >>> 16) % n; };
    const script = [...station, ...assembly, ...detective, ...trial, ...lunar];
    const disrupt: GameAction[] = [install('fan', 'reversed'), { type: 'REMOVE_PART', partId: 'fan' }, { type: 'REMOVE_PART', partId: 'video-camera' },
      install('video-camera'), install('fan'), { type: 'QUALIFY_INSTRUMENT' }, { type: 'CLASSIFY_CLAIM', claimId: 'trial-b20-thickness', kind: 'observed', evidenceLevel: 'direct' },
      ...script];
    let state = initial(), maxEntries = 0, qualified = 0, next = 0;
    for (let i = 0; i < 2000; i++) {
      const scripted = rand(4) > 0;
      const result = step(state, scripted ? script[next % script.length]! : disrupt[rand(disrupt.length)]!);
      if (scripted && result.ok) next++;
      else if (scripted) next = rand(script.length);
      state = result.state;
      maxEntries = Math.max(maxEntries, state.passport.entries.length);
      if (state.setup.qualifiedRevision !== null) qualified++;
      expect(GameStateSchema.safeParse(state).success).toBe(true);
      expect(() => validatePassport(state.passport)).not.toThrow();
      if (state.setup.qualifiedRevision !== null) expect(diagnose(state.setup.installedParts).qualified).toBe(true);
    }
    expect(disrupt.every((a) => GameActionSchema.safeParse(a).success)).toBe(true);
    expect(maxEntries).toBeGreaterThan(1);
    expect(qualified).toBeGreaterThan(0);
  });
});

describe('save, load and recovery', () => {
  it('round-trips a full v2 campaign and keeps demo saves separate', () => {
    const storage = memory(), full = play(initial(), [...station, ...assembly]);
    expect(saveProgress(storage, full).ok).toBe(true);
    expect(saveProgress(storage, createGameState(catalog.datasetVersion, 'demo', at)).ok).toBe(true);
    expect(loadProgress(storage, 'normal', catalog.datasetVersion)).toEqual({ status: 'loaded', state: full, migratedFrom: null });
    expect(storage.getItem(saveKey('demo'))).not.toBe(storage.getItem(saveKey('normal')));
  });
  it('migrates a Phase Zero v1 save and drops untrusted v1 parts', () => {
    const v1 = { schemaVersion: 1, datasetVersion: catalog.datasetVersion, mode: 'normal', guidance: 'guided', activeMission: null, completedMissions: [],
      inspectedExperimentIds: ['bass2-b20'], setup: { revision: 3, installedParts: ['flow-duct'], qualifiedRevision: null },
      passport: { schemaVersion: 1, purpose: 'educational-research-record', entries: [] }, updatedAt: at };
    const storage = memory(); storage.setItem(saveKey('normal'), JSON.stringify(v1));
    const loaded = loadProgress(storage, 'normal', catalog.datasetVersion);
    expect(loaded).toMatchObject({ status: 'loaded', migratedFrom: 1, state: { schemaVersion: 2, inspectedExperimentIds: ['bass2-b20'], setup: { revision: 4, installedParts: [] } } });
    expect(migrateV1({ ...v1, setup: { revision: 0, installedParts: [], qualifiedRevision: null } } as never).setup.revision).toBe(0);
    expect(saveProgress(storage, initial()).ok).toBe(true);
  });
  it('rejects a tampered save that claims qualification with a faulty rig', () => {
    const s = play(initial(), [...station, ...assembly]);
    const tampered = { ...s, setup: { ...s.setup, installedParts: s.setup.installedParts.map((p) => p.partId === 'fan' ? { ...p, orientation: 'reversed' } : p) } };
    const storage = memory(); storage.setItem(saveKey('normal'), JSON.stringify(tampered));
    expect(loadProgress(storage, 'normal', catalog.datasetVersion).status).toBe('corrupt');
  });
  it.each(['{broken', '{"schemaVersion":3}', 'null', '[]'])('preserves unrecognized save %s, exposes it for export and discards only with confirmation', (raw) => {
    const storage = memory(); storage.setItem(saveKey('normal'), raw);
    expect(saveProgress(storage, initial()).ok).toBe(false);
    expect(readRawSave(storage, 'normal')).toEqual({ ok: true, raw });
    expect(discardSave(storage, 'normal', 'yes' as never).ok).toBe(false);
    expect(storage.getItem(saveKey('normal'))).toBe(raw);
    expect(discardSave(storage, 'normal', 'discard-save-after-export').ok).toBe(true);
    expect(loadProgress(storage, 'normal', catalog.datasetVersion).status).toBe('empty');
  });
  it('fails safely on unavailable storage and stale datasets', () => {
    const storage = memory(); saveProgress(storage, initial());
    expect(loadProgress(storage, 'normal', 'next-catalog').status).toBe('dataset-mismatch');
    const broken = { getItem() { throw Error('disabled'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('disabled'); } };
    expect(loadProgress(broken, 'normal', catalog.datasetVersion).status).toBe('storage-unavailable');
    expect(saveProgress(broken, initial())).toEqual({ ok: false, reason: 'storage-unavailable' });
    expect(readRawSave(broken, 'normal')).toEqual({ ok: false, reason: 'storage-unavailable' });
    const quota = { getItem: () => null, setItem() { throw Error('quota'); }, removeItem() {} };
    expect(saveProgress(quota, initial())).toEqual({ ok: false, reason: 'storage-unavailable' });
  });
});
