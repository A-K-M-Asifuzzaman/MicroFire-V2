'use client';
import { useEffect, useRef, useState } from 'react';
import type { PartSpec } from '../contract';
import type { BenchApi, BenchState, BenchView } from './bench-scene';
import type { EnvOptions } from './bench-environment';
import { LAB_ENVIRONMENT } from './lab-assets';
import type { Reaction } from './pix';
import { soundscape } from './soundscape';

/**
 * The illustrative Training Bay as a reusable view: the 3D bench showing the apparatus in its reference configuration
 * from the frozen equipment specification. No session, no server state, no fixtures: nothing is fitted, flagged,
 * qualified or recorded. Presentation layers (the public tour, design prototypes) supply their own layout.
 */
const reference = (parts: PartSpec[], selectedPart: string | null): BenchState => ({
  installed: Object.fromEntries(parts.map((p) => [p.id, { anchorId: p.anchorId, orientation: 'correct' as const }])),
  flagged: [], pendingRepair: null, qualified: false, selectedPart, selectedAnchor: null, orientation: 'correct', choosing: false, pendingTarget: null, focus: 'overview'
});

/** `opening`: the composition to settle on once the scenery has loaded (the public tour keeps the work view). */
export function useBay(parts: PartSpec[], { environment = LAB_ENVIRONMENT, greet = true, opening }: { environment?: Omit<EnvOptions, 'lite'> | null; greet?: boolean; opening?: BenchView } = {}) {
  const host = useRef<HTMLDivElement>(null), api = useRef<BenchApi | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false), [frame, setFrame] = useState(false), [off, setOff] = useState(false);
  const [env, setEnv] = useState<{ loaded: number; total: number; lite: boolean } | null>(null), [envOff, setEnvOff] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false, visible = true;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D training bay. Drag to orbit, arrow keys to rotate, plus and minus to zoom. Select parts with the list.');
    el.prepend(canvas);
    const motion = () => visible && !reduce.matches && !document.hidden;
    const none = () => undefined;
    import('./bench-scene').then(async ({ startBench }) => {
      if (cancelled) return;
      const a = await startBench(canvas, el, parts, {
        onSelectPart: (id) => setSel(id), onSelectAnchor: none, onDrop: none, onHover: setTip,
        onLost: () => { if (!cancelled) setOff(true); },
        onFirstFrame: () => { if (!cancelled) setFrame(true); },
        onEnvProgress: (p, lite) => { if (!cancelled) setEnv({ ...p, lite }); },
        onEnvOff: () => { if (!cancelled) setEnvOff(true); }
      }, motion(), environment && { ...environment, lite: matchMedia('(max-width: 760px), (pointer: coarse)').matches });
      if (cancelled) { a?.stop(); return; }
      if (!a) { setOff(true); return; }
      api.current = a; setReady(true);
    }).catch(() => setOff(true));
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; api.current?.setMotion(motion()); });
    io.observe(el);
    const sync = () => api.current?.setMotion(motion());
    const onResize = () => api.current?.resize();
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('resize', onResize);
    return () => {
      cancelled = true; io.disconnect();
      reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      api.current?.stop(); api.current = null; canvas.remove();
    };
  }, [parts, environment]);

  useEffect(() => { if (ready) api.current?.update(reference(parts, sel)); }, [ready, sel, parts]);
  // The astronaut greets the visitor once the scenery has loaded (presentation only).
  const waved = useRef(false);
  const sceneryReady = !!env && env.loaded >= env.total;
  useEffect(() => { if (ready && sceneryReady && greet && !waved.current) { waved.current = true; api.current?.react('wave'); } }, [ready, sceneryReady, greet]);
  const opened = useRef(false);
  useEffect(() => { if (ready && sceneryReady && opening && !opened.current) { opened.current = true; api.current?.view(opening); } }, [ready, sceneryReady, opening]);

  // Guided tour: PIX walks through every part in mounting order while the camera inspects each one. Any choice of
  // the visitor's own (a part, a camera view) ends it. The words are the frozen equipment copy, nothing new.
  const [guide, setGuide] = useState<number | null>(null);
  useEffect(() => {
    if (guide === null) return;
    const p = parts[guide];
    if (!p) { setGuide(null); api.current?.view('work'); return; } // eslint-disable-line react-hooks/set-state-in-effect -- the tour ends after its last part
    setSel(p.id);
    const look = setTimeout(() => api.current?.view('inspect'), 120);
    const next = setTimeout(() => setGuide(guide + 1), 6000);
    return () => { clearTimeout(look); clearTimeout(next); };
  }, [guide, parts]);
  const part = parts.find((p) => p.id === sel) ?? null;
  const reaction: Reaction = part && guide !== null
    ? { pose: guide === 0 ? 'welcome' : 'look', pix: 'cited', line: `${guide + 1} of ${parts.length}: the ${part.label.toLowerCase()}, at the ${part.anchorLabel.toLowerCase()}. NASA’s description: ${part.sourceNote}` }
    : part ? { pose: 'look', pix: 'searching', line: `That’s the ${part.label.toLowerCase()}. It mounts at the ${part.anchorLabel.toLowerCase()}.` }
      : { pose: 'welcome', pix: 'idle', line: 'Welcome to the training bay. Pick any part, or press Guided tour and I’ll walk you through the apparatus. This tour records nothing.' };
  useEffect(() => { soundscape.say(reaction.line); }, [reaction.line]);
  const pick = (id: string) => { setGuide(null); setSel((cur) => (cur === id ? null : id)); };
  const lab = !!environment && !envOff;
  const views: [BenchView, string][] = [...(lab && opening === 'hero' ? [['hero', 'Overview'] as [BenchView, string]] : []), ...(lab ? [['establish', 'Bay'] as [BenchView, string]] : []), ['work', 'Work view'], ['inspect', part ? `Inspect ${part.label.toLowerCase()}` : 'Inspect']];
  const view = (v: BenchView) => { setGuide(null); api.current?.view(v); };
  return { host, api, ready, frame, off, env, envOff, sceneryReady, lab, tip, sel, part, pick, guide, setGuide, reaction, views, view };
}
