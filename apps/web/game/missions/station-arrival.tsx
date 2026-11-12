'use client';
// Mission 01 · Station Arrival. Renders a CampaignSnapshot and emits CampaignAction intents (evidence-campaign-v1).
// The 3D module is optional decoration over real buttons: no WebGL, reduced motion or a slow load still leaves every
// control usable. Objective ticks are read straight from snapshot facts; the engine alone decides what counts.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CampaignAction, Citation } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from './mission-kit';
import type { HotspotId, StationScene } from './station-scene';

export type Snapshot = { sourceReviewed: boolean; state: { activeMission: string | null; completedMissions: string[]; inspectedExperimentIds: string[];
  passport: { entries: { id: string; missionId: string; claimIds: string[]; conclusion: string; observationType: string; evidenceLevel: string; citations: Citation[]; limitations: string[]; scenario: string }[] } } };
export type Claim = { id: string; text: string; citations: Citation[] };

const SPOTS: Record<HotspotId, { label: string; what: string }> = {
  terminal: { label: 'Research terminal', what: 'Open the B20 source record' },
  scanner: { label: 'Evidence scanner', what: 'Verify what is research and what is fiction' },
  lockers: { label: 'Evidence lockers', what: 'Collect the documented observation' },
  hatch: { label: 'Training-bay hatch', what: 'Finish arrival and head to the training bay' },
};
const ORDER: HotspotId[] = ['terminal', 'scanner', 'lockers', 'hatch'];
const PIX: Record<HotspotId | 'done', string> = {
  terminal: 'Welcome aboard! Everything here starts from a real NASA record. The research terminal holds BASS-II test B20. Open it first.',
  scanner: 'The station alarm in our story is fiction. The B20 observation is research. Use the evidence scanner to file each one correctly.',
  lockers: 'Verified. Now store the documented observation, with its page reference, in your Evidence Passport.',
  hatch: 'Your first cited entry is in the Passport. The hatch leads to the BASS-II training bay.',
  done: 'Station Arrival complete. The engine recorded it; nothing here was decided by the browser.',
};

const noWebgl = () => { try { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); } catch { return true; } };
const never = () => () => undefined;

export function StationArrival({ snapshot, claim, sourceTitle, feedback, refusal, onIntent }: {
  snapshot: Snapshot; claim: Claim; sourceTitle: string; feedback: Feedback; refusal: Refusal; onIntent: (a: CampaignAction) => void;
}) {
  const s = snapshot.state, emit = emitter(onIntent);
  const objectives: Objective[] = [
    { id: 'terminal', label: 'Open the source record at the research terminal', done: s.inspectedExperimentIds.includes('bass2-b20') },
    { id: 'scanner', label: 'Verify the source: research observation vs. fictional incident', done: snapshot.sourceReviewed },
    { id: 'lockers', label: 'Collect the documented observation into your Passport', done: s.passport.entries.some((e) => e.missionId === 'station-arrival' && e.claimIds.includes(claim.id)) },
    { id: 'hatch', label: 'Complete Station Arrival', done: s.completedMissions.includes('station-arrival') },
  ];
  const next = objectives.find((o) => !o.done)?.id as HotspotId | undefined;
  const [open, setOpen] = useState<HotspotId | null>(null);
  const [origin, setOrigin] = useState<{ observation: 'research' | 'fiction' | null; incident: 'research' | 'fiction' | null }>({ observation: null, incident: null });
  const flat = useSyncExternalStore(never, noWebgl, () => false);
  const canvas = useRef<HTMLCanvasElement>(null), sceneRef = useRef<StationScene | null>(null);
  const [pos, setPos] = useState<Partial<Record<HotspotId, { x: number; y: number; visible: boolean }>>>({});
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);

  useEffect(() => {
    if (flat || !canvas.current) return;
    let live = true, scene: StationScene | null = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('./station-scene').then(({ mountStationScene }) => {
      if (!live || !canvas.current) return;
      scene = mountStationScene(canvas.current, { reducedMotion, onReady: () => live && setReady(true),
        onPositions: (p) => { if (live) setPos((old) => ORDER.every((k) => Math.abs((old[k]?.x ?? -1) - (p[k]?.x ?? -1)) < 0.5 && Math.abs((old[k]?.y ?? -1) - (p[k]?.y ?? -1)) < 0.5) ? old : p); } });
      if (!scene) setFailed(true); sceneRef.current = scene;
    }, () => live && setFailed(true));
    return () => { live = false; scene?.dispose(); sceneRef.current = null; };
  }, [flat]);
  useEffect(() => { sceneRef.current?.setActive(next ?? null); }, [next, ready]);

  const twoD = flat || failed;
  const spot = (id: HotspotId) => <button key={id} type="button" className="mf-spot" data-next={id === next} aria-expanded={open === id} aria-controls="mf-panel"
    style={!twoD && pos[id] ? { left: pos[id]!.x, top: pos[id]!.y, visibility: pos[id]!.visible ? undefined : 'hidden' } : undefined}
    onClick={() => setOpen(open === id ? null : id)}>
    <span className="mf-spot-dot" aria-hidden="true" /><b>{SPOTS[id].label}</b><span>{SPOTS[id].what}</span>
  </button>;

  return <div className="mf-mission" data-mission="station-arrival">
    <div className="mf-main">
      <div className="mf-viewport" data-mode={twoD ? '2d' : '3d'} data-ready={ready}>
        {!twoD && <canvas ref={canvas} aria-hidden="true" />}
        {twoD && <p className="mf-fallback-note">{flat ? 'The 3D module is not available on this device. Every station still works below.' : 'The 3D module could not start. Every station still works below.'}</p>}
        {!twoD && !ready && <p className="mf-loading" role="status">Loading the station module…</p>}
        <div className={twoD ? 'mf-plan' : 'mf-spots'} role="group" aria-label="Station hotspots">{ORDER.map(spot)}</div>
        <span className="mf-tag">Illustration · fixture states</span>
      </div>
      <PixLine text={PIX[next ?? 'done']} mood={next === 'scanner' ? 'cite' : next ? 'look' : 'greet'} />
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <div id="mf-panel" className="mf-panel" hidden={!open} aria-live="polite">
        {open === 'terminal' && <>
          <h3>Research terminal · BASS-II test B20</h3>
          <blockquote>{claim.text}</blockquote>
          <p className="mf-cite">{claim.citations.map((c) => cite(c, sourceTitle)).join('; ')}</p>
          <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'TRAINING', action: { type: 'GAME', action: { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' } } })}>Open the source record</button>
        </>}
        {open === 'scanner' && <form onSubmit={(e) => { e.preventDefault(); if (origin.observation && origin.incident) emit({ type: 'REVIEW_SOURCE', claimId: claim.id, citations: claim.citations, observationOrigin: origin.observation, incidentOrigin: origin.incident }); }}>
          <h3>Evidence scanner</h3>
          <p>Item under review: “{claim.text}” with its locator {cite(claim.citations[0]!, sourceTitle)}.</p>
          {(['observation', 'incident'] as const).map((k) => <fieldset key={k}><legend>{k === 'observation' ? 'The B20 observation is…' : 'The station fire alarm in this story is…'}</legend>
            {(['research', 'fiction'] as const).map((v) => <label key={v}><input type="radio" name={`mf-${k}`} value={v} checked={origin[k] === v} onChange={() => setOrigin({ ...origin, [k]: v })} /> {v === 'research' ? 'Documented research' : 'Authored fiction'}</label>)}
          </fieldset>)}
          <button type="submit" className="btn btn-primary" disabled={!origin.observation || !origin.incident}>Submit the source review</button>
        </form>}
        {open === 'lockers' && <>
          <h3>Evidence lockers</h3>
          <p>Stores the observation exactly as documented, with its page reference and limits.</p>
          <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'TRAINING', action: { type: 'GAME', action: { type: 'COLLECT_EVIDENCE', experimentId: 'bass2-b20', claimId: claim.id } } })}>Collect the documented observation</button>
        </>}
        {open === 'hatch' && <>
          <h3>Training-bay hatch</h3>
          <p>Arrival ends when the engine confirms your source review and your cited entry.</p>
          <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'TRAINING', action: { type: 'GAME', action: { type: 'COMPLETE_MISSION', missionId: 'station-arrival' } } })}>Complete Station Arrival</button>
        </>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Station Arrival objectives" items={objectives} />
      <PassportList entries={s.passport.entries} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
