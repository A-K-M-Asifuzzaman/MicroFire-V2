'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Beat, FilmApi } from './film';
import { IGNITION_KEY, ignition } from './state';
import './ignition.css';

const CAPTIONS: Partial<Record<Beat, { who?: string; text: string; alert?: boolean }>> = {
  earth: { text: 'Somewhere between Earth and the Moon…' },
  alert: { text: 'Fire anomaly detected.', alert: true },
  pix: { who: 'PIX', text: 'Fire anomaly detected.' },
  explain: { who: 'PIX', text: 'Let’s understand what happens in microgravity.' },
  holo: { text: 'In space, fire behaves differently. Understanding it changes everything.' }
};

/**
 * Operation Ignition: the homepage's opening film. The dialog is server-rendered and hidden; the inline gate script
 * opens it before first paint only on an eligible first visit (or ?intro=1), so Skip works before React or WebGL.
 * The film itself (three.js) is code-split and loads only when it plays. The real homepage renders, hydrates and
 * becomes interactive underneath; the film never blocks it and is closed with a crossfade, never a reload.
 */
export function Ignition() {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const film = useRef<FilmApi | null>(null);
  const [beat, setBeat] = useState<Beat | 'loading' | null>(null);
  const [progress, setProgress] = useState(0);
  const [sound, setSound] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ended = useRef(false);

  // 'fail': the film could not load here (slow or broken download). Not marked seen, so the next visit tries again.
  const close = useCallback((how: 'end' | 'skip' | 'fail') => {
    if (ended.current) return; ended.current = true;
    const h = document.documentElement, d = dialog.current;
    ignition.set('handoff');
    try { if (how === 'fail') localStorage.removeItem(IGNITION_KEY); else localStorage.setItem(IGNITION_KEY, 'seen'); } catch { /* best effort */ }
    const finish = () => {
      film.current?.stop(); film.current = null;
      if (d?.open) d.close();
      h.dataset.ignition = 'off'; ignition.set('off'); setBeat(null); setLeaving(false); performance.mark('ignition:closed');
      host.current?.replaceChildren();
      // Focus lands on the page's main content, predictably, after the film.
      document.getElementById('main')?.focus({ preventScroll: true });
    };
    // A skip crossfades quickly; the natural ending flies the wordmark to the header's brand, then fades.
    setLeaving(true);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (how === 'end' && !reduce) flyWordmark();
    setTimeout(finish, reduce ? 0 : how === 'skip' ? 280 : 650);
  }, []);

  const play = useCallback(async () => {
    const d = dialog.current, el = host.current;
    if (!d || !el) return;
    ended.current = false; setLeaving(false); setBeat('loading'); setProgress(0); ignition.set('play'); delete document.documentElement.dataset.ignitionBeats;
    try { sessionStorage.setItem('microfire.home.intro', '1'); } catch { /* the observatory's own fly-in is replaced by the film */ }
    if (!d.open) try { d.showModal(); } catch { d.setAttribute('open', ''); }
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); el.replaceChildren(canvas);
    const params = new URLSearchParams(location.search), freeze = params.get('t');
    // Before downloading any 3D code: no WebGL or a software rasteriser means the site, straight away.
    if (!capableGpu()) { close('skip'); return; }
    try {
      const { startFilm } = await import('./film');
      if (ended.current) return;
      const api = await startFilm({
        canvas, host: el, mobile: matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 1024px)').matches,
        onBeat: (b) => {
          setBeat(b); if (b === 'holo') ignition.set('handoff'); if (b === 'earth') performance.mark('ignition:first-frame');
          const h = document.documentElement; h.dataset.ignitionBeats = h.dataset.ignitionBeats ? `${h.dataset.ignitionBeats},${b}` : b; // every beat, even if two land in one frame
        },
        onEnd: () => close('end'),
        onProgress: setProgress,
        ...(freeze !== null && !Number.isNaN(Number(freeze)) ? { freezeAt: Number(freeze) } : {})
      });
      if (ended.current) { api?.stop(); return; }
      if (!api) { close('fail'); return; } // no WebGL, software graphics, or the download failed or stalled: straight to the site
      film.current = api;
    } catch { close('fail'); }
  }, [close]);

  useEffect(() => {
    const h = document.documentElement;
    h.dataset.ignitionLive = '1';
    const onSkip = () => close('skip');
    document.addEventListener('ignition:skip', onSkip);
    const onResize = () => film.current?.resize();
    window.addEventListener('resize', onResize);
    // The gate script already decided on this load; it may also have been skipped before hydration.
    if (h.dataset.ignition === 'play') void play();
    const onReplay = () => { h.dataset.ignition = 'play'; void play(); };
    document.addEventListener('ignition:replay', onReplay);
    return () => {
      document.removeEventListener('ignition:skip', onSkip); document.removeEventListener('ignition:replay', onReplay); window.removeEventListener('resize', onResize);
      film.current?.stop(); film.current = null; delete h.dataset.ignitionLive;
    };
  }, [close, play]);

  const toggleSound = () => { const next = !sound; setSound(next); film.current?.setSound(next); };
  const cap = beat && beat !== 'loading' ? CAPTIONS[beat] ?? (beat === 'title' || beat === 'exit' ? CAPTIONS.holo : undefined) : undefined;
  const title = beat === 'title' || beat === 'exit';

  return <>
    <dialog ref={dialog} id="ignition" className="ign" data-beat={beat ?? ''} data-leaving={leaving || undefined}
      aria-labelledby="ign-title" aria-describedby="ign-desc" suppressHydrationWarning
      onCancel={(e) => { e.preventDefault(); close('skip'); }}>
      <div className="ign-film" ref={host} />
      <div className="ign-veil" aria-hidden="true" />
      <h2 id="ign-title" className="sr-only">MicroFire opening film</h2>
      <p id="ign-desc" className="sr-only">A fictional 8-second story, not a real NASA incident. A crew spacecraft travels from Earth toward the Moon. A small fire starts inside its cabin, where there is oxygen. PIX, MicroFire’s guide, wakes up and opens a hologram showing that in microgravity a flame grows round and dim instead of tall. The hologram opens into the MicroFire observatory. Skip at any time.</p>
      {/* Also before hydration (beat null): the gate opens the dialog while the page's scripts are still downloading. */}
      {(beat === null || beat === 'loading') && <div className="ign-loading">
        <p aria-hidden="true">MicroFire</p>
        <progress max={1} value={progress} aria-label="Loading the opening film" />
        <p aria-hidden="true">Loading the film · {Math.round(progress * 100)}%</p>
      </div>}
      {cap?.alert && <p className="ign-alert" role="status"><span aria-hidden="true">▲</span> FIRE ANOMALY DETECTED</p>}
      {cap && !cap.alert && !title && <p className="ign-caption" key={beat} aria-live="polite">{cap.who && <b>{cap.who}: </b>}{cap.text}</p>}
      {title && <div className="ign-title" aria-hidden="true">
        <p className="ign-word" id="ign-word">MICROFIRE</p>
        <p className="ign-sub">The Living Science Observatory</p>
        <p className="ign-line">Explore the science of fire beyond Earth.</p>
      </div>}
      <p className="ign-note">A fictional story · not a real NASA incident</p>
      <div className="ign-controls">
        <button type="button" className="ign-btn" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>
        {(beat === 'holo' || title) && <button type="button" className="ign-btn ign-enter" onClick={() => close('skip')}>Enter observatory</button>}
        <button type="button" id="ignition-skip" className="ign-btn ign-skip" onClick={() => close('skip')}>Skip intro</button>
      </div>
    </dialog>
    {/* Runs while the HTML parses: decides first-visit play and wires Skip before hydration (public/ignition-gate.js). */}
    <script src="/ignition-gate.js" />
  </>;
}

/** One throwaway context: WebGL present and not a software rasteriser. The context is released immediately. */
function capableGpu() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const ok = !/swiftshader|llvmpipe|softpipe|software/i.test(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch { return false; }
}

/** The hologram's wordmark flies to the header brand (a shared-element hand-off), so the film ends in the site. */
function flyWordmark() {
  const word = document.getElementById('ign-word'), brand = document.querySelector('.site-header .brand-text b');
  if (!word || !brand) return;
  const a = word.getBoundingClientRect(), b = brand.getBoundingClientRect();
  if (!a.width || !b.width) return;
  word.style.transformOrigin = 'top left';
  word.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.height / a.height})`, opacity: 0.2 }],
    { duration: 620, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
}

/** Small "Replay intro" control for the homepage (hidden under reduced motion, where the film never plays). */
export function ReplayIntro() {
  return <button type="button" className="ign-replay" onClick={() => document.dispatchEvent(new Event('ignition:replay'))}>Replay intro</button>;
}
