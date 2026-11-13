// Maps the public visitor DTO onto the props the mission scenes already render. Only server-returned data is used:
// the projected view, plus outcomes the server accepted in this tab (Accepted), which the public DTO does not carry.
import type { MissionIdSchema } from '@microfire/shared';
import type { z } from 'zod';
import type { Accepted } from './public-controller';
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

export function sceneSnapshot(view: PublicView, accepted: Accepted) {
  return {
    sourceReviewed: view.sourceReviewed, selectedExperimentId: view.selectedExperimentId,
    explanation: accepted.explanation, appraisals: accepted.appraisals, habitat: accepted.habitat,
    state: {
      activeMission: view.activeMission, completedMissions: view.completedMissions as string[], passport: view.passport,
      inspectedExperimentIds: accepted.inspected,
      predictions: view.predictionLocked ? [{ experimentId: 'bass2-b20', prediction: accepted.prediction ?? 'locked on the server (text not shown after a reload)' }] : [],
      decision: accepted.decision ? { verdict: accepted.decision } : null,
      proposals: Array.from({ length: accepted.proposals }, (_, i) => i)
    }
  };
}
