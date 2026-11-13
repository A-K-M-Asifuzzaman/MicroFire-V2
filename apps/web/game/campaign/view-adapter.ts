// Maps the durable public visitor DTO onto the props the mission scenes already render.
// Completed outcomes are read from the server on every response, reload and reconciliation.
import type { MissionIdSchema } from '@microfire/shared';
import type { z } from 'zod';
import type { PublicView } from './public-transport';

export type MissionId = z.infer<typeof MissionIdSchema>;
export const MISSIONS: { id: MissionId; n: string; title: string }[] = [
  { id: 'station-arrival', n: '01', title: 'Station Arrival' }, { id: 'bass-assembly', n: '02', title: 'BASS-II Training Bay' },
  { id: 'flame-detective', n: '03', title: 'Flame Detective' }, { id: 'claim-trial', n: '04', title: 'Claim Trial' },
  { id: 'lunar-habitat', n: '05', title: 'Lunar Habitat' }
];

/** Which scene to show: the server's active mission while unfinished, else the first unfinished one (display order only). */
export function currentMission(view: PublicView): MissionId | null {
  if (view.activeMission && !view.completedMissions.includes(view.activeMission)) return view.activeMission;
  if (view.activeMission === null && view.completedMissions.length === 0) return 'station-arrival';
  return MISSIONS.find((m) => !view.completedMissions.includes(m.id))?.id ?? null;
}
/** The server must start this mission before its actions apply (Station Arrival is active from case creation). */
export const needsStart = (view: PublicView, id: MissionId) => id !== 'station-arrival' && view.activeMission !== id;

export function sceneSnapshot(view: PublicView) {
  return {
    sourceReviewed: view.sourceReviewed, selectedExperimentId: view.selectedExperimentId,
    explanation: view.explanation, appraisals: view.appraisals, habitat: view.habitat,
    state: {
      activeMission: view.activeMission, completedMissions: view.completedMissions as string[], passport: view.passport,
      inspectedExperimentIds: view.inspectedExperimentIds,
      predictions: view.prediction !== null ? [{ experimentId: 'bass2-b20', prediction: view.prediction }] : [],
      decision: view.decision ? { verdict: view.decision } : null,
      proposals: Array.from({ length: view.proposalCount }, (_, i) => i)
    }
  };
}

/** What the learner did in each mission, built ONLY from server-confirmed fields of the public view (never tab memory). */
export function recordedActions(view: PublicView): Partial<Record<string, string>> {
  const done = (m: string) => view.completedMissions.includes(m as never);
  const ok = Object.values(view.appraisals).filter((a) => a.correct).length, total = view.trialStatements.length || Object.keys(view.appraisals).length;
  const out: Partial<Record<string, string>> = {};
  if (view.sourceReviewed) out['station-arrival'] = 'Classified the B20 observation as documented research and the station alarm as authored fiction; the server accepted the source review.';
  if (done('bass-assembly')) out['bass-assembly'] = `Fitted all ${view.installedPartIds.length} apparatus parts, diagnosed the authored training fault, repaired it and qualified the training rig; the server checked every step.`;
  if (view.prediction) out['flame-detective'] = `Locked the prediction “${view.prediction}” before the reveal${view.explanation?.correct ? ', then explained the documented result with its source and limits; the server accepted the explanation' : ''}.`;
  if (total) out['claim-trial'] = `Ruled correctly on ${ok} of ${total} exhibits: what kind of claim each is, how strong its evidence is, which source applies and what could confound it.`;
  if (view.habitat?.correct) out['lunar-habitat'] = `Assessed the fictional habitat against B20${view.decision ? ', recorded “insufficient evidence to decide”' : ''}${view.proposalCount ? ` and proposed ${view.proposalCount} next test${view.proposalCount === 1 ? '' : 's'}` : ''}. The server refuses any fire-safety certification.`;
  return out;
}
