'use client';
import { PixStage } from '../../components/pix-stage';
import type { PixState } from '../../components/pix-avatar';
import type { Snapshot } from '../contract';
import type { ControllerState } from '../controller';
import { faultIntroduced, journeyStage } from '../view-model';

export type Reaction = { pose: 'welcome' | 'look' | 'nod' | 'concern' | 'alarm' | 'think' | 'cheer' | 'reveal'; pix: PixState; line: string };

/**
 * PIX reacts to confirmed server events and the current step. Presentation only: no scientific claims, never an
 * outcome of its own. When the server sent words (refusal message, hint), PIX points to them instead of rephrasing.
 */
export function reaction(st: ControllerState, s: Snapshot, selectedLabel: string | null): Reaction {
  const fresh = st.event;
  if (st.link.status === 'outcome-unknown' || st.link.status === 'conflict') return { pose: 'think', pix: 'searching', line: 'Let’s check with the server before doing anything else.' };
  if (fresh?.kind === 'refused') return { pose: 'concern', pix: 'abstained', line: 'Not accepted — read why, then try a different choice.' };
  if (fresh?.kind === 'accepted') {
    if (faultIntroduced(fresh.before, fresh.after)) return { pose: 'alarm', pix: 'error', line: 'Something changed on the bench. That’s the authored training fault — run a Training check.' };
    const a = fresh.action;
    if (a?.type === 'SUBMIT_DIAGNOSIS') return fresh.feedback?.correct === false
      ? { pose: 'think', pix: 'abstained', line: 'Not that one. Compare the check with the direction markers.' }
      : { pose: 'nod', pix: 'cited', line: 'Diagnosis recorded. Now repair it by hand.' };
    if (a?.type === 'RUN_DIAGNOSTIC') return { pose: 'look', pix: 'searching', line: 'Training check done. Read each finding: what you see, why, and what NASA documented.' };
    if (a?.type === 'GAME') switch (a.action.type) {
      case 'INSTALL_PART': return s.training.repair && fresh.before?.training.repair === null
        ? { pose: 'cheer', pix: 'cited', line: 'Reinstalled. Ask for training qualification next.' }
        : { pose: 'nod', pix: 'cited', line: 'Fitted — confirmed by the server.' };
      case 'REMOVE_PART': return { pose: 'look', pix: 'idle', line: s.training.pendingRepair ? 'Removed. The repair is pending — reinstall it facing the right way.' : 'Removed.' };
      case 'QUALIFY_INSTRUMENT': return { pose: 'cheer', pix: 'cited', line: 'Training check passed. That’s a training result, not NASA certification.' };
      case 'OBSERVE_DOCUMENTED_RESULT': return { pose: 'reveal', pix: 'cited', line: 'This part is real: NASA’s documented B20 observation.' };
      case 'COLLECT_EVIDENCE': return { pose: 'nod', pix: 'cited', line: 'Your first Passport entry is a real, cited observation.' };
      case 'COMPLETE_MISSION': return { pose: 'cheer', pix: 'cited', line: s.progress.step === 'complete' ? 'Episode complete. Download your case to keep it.' : 'Station Arrival complete.' };
      default: break;
    }
  }
  if (selectedLabel) return { pose: 'look', pix: 'searching', line: `${selectedLabel} selected. Choose its mount and orientation.` };
  switch (journeyStage(s)) {
    case 'arrival': return { pose: 'welcome', pix: 'idle', line: 'Welcome to the training bay. Start with the real NASA record.' };
    case 'assembly': return { pose: 'look', pix: 'idle', line: 'Pick a part from the tray. The server decides what fits.' };
    case 'fault': return { pose: 'alarm', pix: 'error', line: 'An authored training fault is on the bench. Run a Training check.' };
    case 'investigation': return { pose: 'think', pix: 'searching', line: 'The last check is out of date. Run it again.' };
    case 'diagnosis': return { pose: 'think', pix: 'searching', line: 'Which component, and what kind of fault?' };
    case 'repair': return { pose: 'look', pix: 'idle', line: 'Repair it by hand: remove, then reinstall.' };
    case 'qualification': return { pose: 'look', pix: 'idle', line: 'Ready for the training qualification check.' };
    case 'observation': return { pose: 'reveal', pix: 'idle', line: 'Next is NASA’s record — not something the bench produced.' };
    case 'passport': return { pose: 'nod', pix: 'cited', line: 'Three kinds of record: NASA’s, the training’s, and yours.' };
    case 'complete': return { pose: 'cheer', pix: 'cited', line: 'Episode complete. Download your case to keep it.' };
  }
}

export function PixGuide({ r }: { r: Reaction }) {
  return <aside className="m2-pix" data-pose={r.pose} aria-label="PIX, your training guide">
    <PixStage state={r.pix} className="m2-pix-stage" />
    <p className="m2-pix-line" aria-live="polite">{r.line}</p>
  </aside>;
}
