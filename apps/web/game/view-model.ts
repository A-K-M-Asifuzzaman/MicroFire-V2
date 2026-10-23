import type { CorePreviewAction, DiagnosticFinding, FaultCode, PartId, PartSpec, Snapshot, TrainingAction } from './contract';

// Pure presentation over server-confirmed state. Nothing here decides a fault, a repair, qualification or evidence:
// fault badges come only from the server's current Training check or its authored-fault record.

export const JOURNEY = [
  { id: 'arrival', label: 'Station arrival' }, { id: 'assembly', label: 'Equipment assembly' }, { id: 'fault', label: 'Training fault' },
  { id: 'investigation', label: 'Diagnostic investigation' }, { id: 'diagnosis', label: 'Diagnosis' }, { id: 'repair', label: 'Repair' },
  { id: 'qualification', label: 'Qualification' }, { id: 'observation', label: 'B20 observation' }, { id: 'passport', label: 'Evidence Passport' },
  { id: 'complete', label: 'Mission complete' }
] as const;
export type JourneyId = (typeof JOURNEY)[number]['id'];

/** Where the server's step puts the learner on the ten-stage journey rail. */
export function journeyStage(s: Snapshot): JourneyId {
  switch (s.progress.step) {
    case 'source-orientation': return 'arrival';
    case 'assembly': return 'assembly';
    case 'diagnostic-required': return s.diagnostic.status === 'not-run' ? 'fault' : 'investigation';
    case 'diagnosis-required': return s.diagnostic.status === 'current' ? 'diagnosis' : 'investigation';
    case 'repair-required': return 'repair';
    case 'qualification-required': return 'qualification';
    case 'b20-inspection-required': return 'observation';
    case 'passport-review': return 'passport';
    case 'complete': return 'complete';
  }
}
export const journeyIndex = (s: Snapshot) => JOURNEY.findIndex((j) => j.id === journeyStage(s));

/** Presentation labels for the four frozen fault codes (UI chrome; the codes and their meaning are the contract's). */
export const faultCategoryLabels: Record<FaultCode, string> = {
  MISSING: 'Missing', WRONG_ANCHOR: 'Wrong mount', MISSING_PREREQUISITE: 'Missing supporting part', REVERSED: 'Reversed orientation'
};
export const orientationLabels = { correct: 'Standard orientation', reversed: 'Rotated 180°' } as const;

export type RigPart = {
  spec: PartSpec;
  installed: { anchorId: string; orientation: 'correct' | 'reversed' } | null;
  /** Findings from a CURRENT server Training check only. */
  findings: DiagnosticFinding[];
  /** The server recorded this part as the authored training fault and no completed repair receipt exists yet. */
  authoredFault: boolean;
  /** The server holds a pending-repair receipt for this part. */
  pendingRepair: boolean;
};

export function rig(s: Snapshot, specs: readonly PartSpec[]): RigPart[] {
  const findings = s.diagnostic.status === 'current' ? s.diagnostic.findings : [];
  return specs.map((spec) => {
    const p = s.state.setup.installedParts.find((i) => i.partId === spec.id);
    return {
      spec, installed: p ? { anchorId: p.anchorId, orientation: p.orientation } : null,
      findings: findings.filter((f) => f.partId === spec.id),
      authoredFault: s.training.fault !== null && s.training.repair === null && spec.id === 'fan',
      pendingRepair: s.training.pendingRepair?.partId === spec.id
    };
  });
}

/** True when this confirmed change is the moment the server introduced the authored training fault. */
export const faultIntroduced = (before: Snapshot | null, after: Snapshot) => !!before && before.training.fault === null && after.training.fault !== null;

/** The setup's current revision is the one the server qualified. */
export const qualifiedNow = (s: Snapshot) => s.state.setup.qualifiedRevision !== null && s.state.setup.qualifiedRevision === s.state.setup.revision;

/**
 * Astronaut acknowledgement for a confirmed change, read only from the before/after snapshots the server returned,
 * so no celebration can run ahead of the rules. Strongest outcome wins. The fault reaction is driven separately.
 */
export function astronautCue(ev: { kind: 'accepted' | 'refused'; before?: Snapshot | null; after?: Snapshot } | null): 'nod' | 'wave' | 'cheer' | null {
  if (ev?.kind !== 'accepted' || !ev.before || !ev.after) return null;
  const { before, after } = ev;
  if (qualifiedNow(after) && !qualifiedNow(before)) return 'cheer';
  if (after.training.repair && !before.training.repair) return 'wave';
  if (after.training.diagnosis && !before.training.diagnosis) return 'nod';
  return null;
}

export const allows = (s: Snapshot, type: TrainingAction['type']) => s.progress.allowedActionTypes.includes(type);
export const allowsCore = (s: Snapshot, type: CorePreviewAction['type']) => allows(s, 'GAME') && s.progress.allowedCoreActionTypes.includes(type);

/** Station Arrival: the next guided source-reading action the server currently permits. */
export function stationStep(s: Snapshot): 'inspect' | 'collect' | 'complete' | 'enter' | 'done' {
  const st = s.state;
  if (st.completedMissions.includes('station-arrival')) return st.activeMission === 'bass-assembly' ? 'done' : 'enter';
  if (!st.inspectedExperimentIds.includes('bass2-b20')) return 'inspect';
  if (!st.passport.entries.some((e) => e.missionId === 'station-arrival' && e.status === 'current')) return 'collect';
  return 'complete';
}

export const install = (partId: PartId, anchorId: string, orientation: 'correct' | 'reversed'): TrainingAction =>
  ({ type: 'GAME', action: { type: 'INSTALL_PART', partId, anchorId, orientation } });
export const remove = (partId: PartId): TrainingAction => ({ type: 'GAME', action: { type: 'REMOVE_PART', partId } });
export const core = (action: CorePreviewAction): TrainingAction => ({ type: 'GAME', action });

/** Human label for an intent, used by PIX, the intent log and live announcements. */
export function describe(action: TrainingAction, specs: readonly PartSpec[]): string {
  const label = (id: PartId) => specs.find((p) => p.id === id)?.label ?? id;
  const anchor = (id: string) => specs.find((p) => p.anchorId === id)?.anchorLabel ?? id;
  switch (action.type) {
    case 'RUN_DIAGNOSTIC': return 'Run the Training check';
    case 'SUBMIT_DIAGNOSIS': return `Diagnose: ${label(action.partId)} · ${faultCategoryLabels[action.faultCode]}`;
    case 'ADD_LEARNER_NOTE': return 'Add a learner note';
    case 'GAME': {
      const a = action.action;
      switch (a.type) {
        case 'INSTALL_PART': return `Install ${label(a.partId)} at ${anchor(a.anchorId)} (${orientationLabels[a.orientation].toLowerCase()})`;
        case 'REMOVE_PART': return `Remove ${label(a.partId)}`;
        case 'QUALIFY_INSTRUMENT': return 'Request training qualification';
        case 'OBSERVE_DOCUMENTED_RESULT': return 'Open the documented B20 result';
        case 'INSPECT_EVIDENCE': return 'Open the B20 source record';
        case 'COLLECT_EVIDENCE': return 'Collect the documented observation';
        case 'COMPLETE_MISSION': return a.missionId === 'station-arrival' ? 'Complete Station Arrival' : 'Complete the training episode';
        case 'START_MISSION': return 'Enter the training bay';
      }
    }
  }
}

/** Budget display only; note admission is always the server's decision (optionalUpdatesRequireFinalizationCheck). */
export const budgetLevel = (s: Snapshot) => (s.checkpointBudget.payloadBytes >= s.checkpointBudget.warningAtBytes ? 'warn' : 'ok');
