import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe as group, expect, test } from 'vitest';
import { toPartSpecs } from '../contract/specs';
import { budgetLevel, describe, faultIntroduced, install, journeyStage, rig, stationStep } from '../view-model';
import { fixtureDir, snap } from './fixtures';

const specs = toPartSpecs();

test('the equipment-language mirror is byte-identical to the approved docs fixture', () => {
  const mirror = readFileSync(fileURLToPath(new URL('../contract/equipment-copy.ts', import.meta.url)));
  expect(mirror.equals(readFileSync(`${fixtureDir}equipment-copy.ts`))).toBe(true);
});

test('ten parts with frozen labels and anchors', () => {
  expect(specs).toHaveLength(10);
  expect(specs.find((p) => p.id === 'fan')).toMatchObject({ label: 'Fan', anchorId: 'duct-inlet', anchorLabel: 'Duct inlet', reversedRepair: 'Remove the fan and reinstall it at the duct inlet, facing into the duct.' });
  expect(specs.find((p) => p.id === 'exit-plate')).toMatchObject({ label: 'Exit plate and screen', reversedRepair: null });
});

group('journey stage follows the server step and diagnostic status', () => {
  const cases: [string, string][] = [
    ['START_RESPONSE', 'arrival'], ['WRONG_ANCHOR_RESPONSE', 'assembly'], ['FAULT_INJECTED_RESPONSE', 'fault'],
    ['DIAGNOSTIC_SUCCESS', 'diagnosis'], ['WRONG_DIAGNOSIS_RESPONSE', 'diagnosis'], ['PENDING_REPAIR_A', 'repair'],
    ['QUALIFICATION_REPAIR_REQUIRED_RESPONSE', 'fault'], ['PASSPORT_REVIEW_RESPONSE', 'passport'], ['COMPLETE_RESPONSE', 'complete']
  ];
  for (const [name, stage] of cases) test(name, () => expect(journeyStage(snap(name))).toBe(stage));
});

test('rig badges come only from server state: authored fault before a check, findings only when current', () => {
  const injected = rig(snap('FAULT_INJECTED_RESPONSE'), specs);
  const fan = injected.find((p) => p.spec.id === 'fan')!;
  expect(fan.installed).toEqual({ anchorId: 'duct-inlet', orientation: 'reversed' });
  expect(fan.authoredFault).toBe(true);
  expect(injected.every((p) => p.findings.length === 0)).toBe(true); // check not run: no findings shown
  const checked = rig(snap('DIAGNOSTIC_SUCCESS'), specs).find((p) => p.spec.id === 'fan')!;
  expect(checked.findings.map((f) => f.id)).toEqual(['fan:REVERSED']);
  const stale = rig(snap('STALE_DIAGNOSTIC_RESPONSE'), specs);
  expect(stale.every((p) => p.findings.length === 0)).toBe(true); // stale findings never shown as current
});

test('pending repair: both approved histories render the server receipt, not a guess', () => {
  for (const [name, removed] of [['PENDING_REPAIR_A', 13], ['PENDING_REPAIR_B', 15]] as const) {
    const s = snap(name);
    const fan = rig(s, specs).find((p) => p.spec.id === 'fan')!;
    expect(fan.installed).toBeNull();
    expect(fan.pendingRepair).toBe(true);
    expect(s.training.pendingRepair?.removedAtRevision).toBe(removed);
  }
});

test('fault introduction is detected only on the confirmed transition', () => {
  expect(faultIntroduced(snap('WRONG_ANCHOR_RESPONSE'), snap('FAULT_INJECTED_RESPONSE'))).toBe(true);
  expect(faultIntroduced(null, snap('FAULT_INJECTED_RESPONSE'))).toBe(false);
  expect(faultIntroduced(snap('FAULT_INJECTED_RESPONSE'), snap('DIAGNOSTIC_SUCCESS'))).toBe(false);
});

test('station arrival guided source reading starts with opening the record', () => {
  expect(stationStep(snap('START_RESPONSE'))).toBe('inspect');
  expect(stationStep(snap('FAULT_INJECTED_RESPONSE'))).toBe('done');
});

test('placement intents use the frozen action shape and readable labels', () => {
  const a = install('fan', 'duct-inlet', 'reversed');
  expect(a).toEqual({ type: 'GAME', action: { type: 'INSTALL_PART', partId: 'fan', anchorId: 'duct-inlet', orientation: 'reversed' } });
  expect(describe(a, specs)).toBe('Install Fan at Duct inlet (rotated 180°)');
  expect(describe({ type: 'SUBMIT_DIAGNOSIS', partId: 'fan', faultCode: 'REVERSED' }, specs)).toBe('Diagnose: Fan · Reversed orientation');
});

test('passport projection keeps training history out of research corrections', () => {
  const s = snap('PASSPORT_REVIEW_RESPONSE');
  expect(s.state.passport.entries.every((e) => e.corrections.length === 0)).toBe(true);
  expect(s.passportPresentation.trainingHistory).toMatchObject({ evidenceLevel: 'not-applicable', historicalNASAEvent: false });
  expect(budgetLevel(s)).toBe('ok');
});
