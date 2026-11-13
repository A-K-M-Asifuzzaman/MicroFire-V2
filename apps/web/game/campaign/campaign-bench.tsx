'use client';
// Mission 02 · the 3D BASS-II training bay inside the public campaign. It renders ONLY server-confirmed facts from the
// public view (installed part ids, Training check findings, training step); a drop or mount click becomes the same
// INSTALL_PART intent as the accessible table below, and the server still decides. Nothing here grades anything.
import { useEffect, useRef, useState } from 'react';
import type { PartSpec } from '../contract';
import type { BenchApi, BenchState } from '../ui/bench-scene';
import { LAB_ENVIRONMENT } from '../ui/lab-assets';
import type { PublicView } from './public-transport';
import '../ui/game.css';

const QUALIFIED = new Set(['b20-inspection-required', 'passport-review', 'complete']);

export function CampaignBench({ view, parts, selected, chosenMount, orientation, onSelectPart, onSelectAnchor, onDrop }: {
  view: PublicView; parts: PartSpec[]; selected: string | null; chosenMount: Record<string, string>; orientation: 'correct' | 'reversed';
  onSelectPart: (id: string) => void; onSelectAnchor: (anchorId: string) => void; onDrop: (partId: string, anchorId: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null), api = useRef<BenchApi | null>(null);
  const [ready, setReady] = useState(false), [frame, setFrame] = useState(false), [off, setOff] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const cbs = useRef({ onSelectPart, onSelectAnchor, onDrop });
  useEffect(() => { cbs.current = { onSelectPart, onSelectAnchor, onDrop }; });

  const state = (): BenchState => {
    const byId = new Map<string, PartSpec>(parts.map((p) => [p.id, p]));
    const findings = view.diagnostic?.status === 'current' ? view.diagnostic.findings : [];
    const flagged = parts.filter((p) => findings.some((f) => f.partLabel === p.label)).map((p) => p.id);
    const step = view.trainingStep, sel = selected && byId.get(selected);
    return {
      // Shown at the mount chosen in this tab, else the part's reference mount; the Training check reports the truth.
      installed: Object.fromEntries((view.installedPartIds as readonly string[]).filter((id) => byId.has(id)).map((id) => [id, { anchorId: chosenMount[id] ?? byId.get(id)!.anchorId, orientation: 'correct' as const }])),
      flagged, pendingRepair: null, qualified: QUALIFIED.has(step) || view.completedMissions.includes('bass-assembly'),
      selectedPart: selected, selectedAnchor: selected ? chosenMount[selected] ?? null : null, orientation,
      choosing: !!sel && !(view.installedPartIds as readonly string[]).includes(sel.id), pendingTarget: null, refused: null,
      focus: ['diagnosis-required', 'repair-required'].includes(step) ? 'fan' : QUALIFIED.has(step) ? 'wide' : 'overview',
    };
  };

  useEffect(() => {
    const el = host.current; if (!el) return;
    let cancelled = false;
    const canvas = document.createElement('canvas'); canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D training bay. Drag to orbit, arrow keys to rotate, plus and minus to zoom. Every action is also available in the parts table below.');
    el.prepend(canvas);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('../ui/bench-scene').then(async ({ startBench }) => {
      if (cancelled) return;
      const a = await startBench(canvas, el, parts, {
        onSelectPart: (id) => cbs.current.onSelectPart(id), onSelectAnchor: (id) => cbs.current.onSelectAnchor(id),
        onDrop: (id, anchorId) => cbs.current.onDrop(id, anchorId), onHover: setTip,
        onLost: () => { if (!cancelled) setOff(true); }, onFirstFrame: () => { if (!cancelled) setFrame(true); },
      }, !reduce, LAB_ENVIRONMENT && { ...LAB_ENVIRONMENT, lite: matchMedia('(max-width: 760px), (pointer: coarse)').matches });
      if (cancelled) { a?.stop(); return; }
      if (!a) { setOff(true); return; }
      api.current = a; setReady(true);
    }).catch(() => setOff(true));
    const ro = new ResizeObserver(() => api.current?.resize()); ro.observe(el);
    return () => { cancelled = true; ro.disconnect(); api.current?.stop(); api.current = null; canvas.remove(); };
    // The scene is created once; confirmed state flows in through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready) api.current?.update(state()); });

  if (off) return <p className="mf-fallback-note">The 3D training bay is not available on this device. Every action works in the parts table below.</p>;
  return <figure className="mf-bay" data-ready={ready} data-frame={frame}>
    <div className="m2-bench" ref={host} data-ready={ready} data-frame={frame}>
      {!frame && <p className="mf-loading" role="status">Loading the 3D training bay…</p>}
      {tip && <span className="m2-bench-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</span>}
    </div>
    <figcaption className="mf-bay-cap">
      <span><b>How to use:</b> pick a part in the table (or click it here), then click or drag onto a glowing mount. The server decides whether it fits; faults appear only after the server&apos;s Training check.</span>
      <span className="mf-fine">Schematic training model of the BASS-II flow duct, not NASA CAD. Bay, astronaut and Earth view are illustrations.</span>
    </figcaption>
  </figure>;
}
