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
  const [beat, setBeat] = useState<Beat | 'loading' | null>(null);
  const [progress, setProgress] = useState(0);
  const [sound, setSound] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Playback ownership. Each play() is a new Run with a monotonic id. Only `live` (the playing run) may change the UI,
  // the dialog or the page phase; Skip, a replay and unmount take ownership away at once, so any later async completion
  // of that run (module import, model load, a frame callback) sees it is stale and only releases its own resources.
  // `fading` is the one run still crossfading out after a close; play() and unmount end it immediately.
  const gen = useRef(0);
  const live = useRef<Run | null>(null);
  const fading = useRef<{ run: Run; timer: number } | null>(null);

  /** Stops the run that is fading out (its renderer, loop and audio) and cancels its pending UI reset. */
  const endFade = useCallback(() => {
    const f = fading.current; if (!f) return;
    fading.current = null; clearTimeout(f.timer); f.run.api?.stop();
  }, []);

  // 'fail': the film could not load here (slow or broken download). Not marked seen, so the next visit tries again.
  const close = useCallback((how: 'end' | 'skip' | 'fail') => {
    const run = live.current; if (!run) return; // nothing playing, or already closing: a second Skip is a no-op
    live.current = null; run.abort.abort();      // ownership ends now; a start still loading disposes itself
    const h = document.documentElement, d = dialog.current;
    ignition.set('handoff');
    try { if (how === 'fail') localStorage.removeItem(IGNITION_KEY); else localStorage.setItem(IGNITION_KEY, 'seen'); } catch { /* best effort */ }
    endFade();
    const finish = () => {
      if (fading.current?.run !== run) return; // superseded by a replay, which already ended this fade
      endFade();
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
    fading.current = { run, timer: window.setTimeout(finish, reduce ? 0 : how === 'skip' ? 280 : 650) };
  }, [endFade]);

  const play = useCallback(async () => {
    const d = dialog.current, el = host.current;
    if (!d || !el) return;
    // A new, distinct lifecycle: the previous run (playing or fading) is released before this one exists.
    const prev = live.current; live.current = null; prev?.abort.abort(); prev?.api?.stop(); endFade();
    const run: Run = { id: ++gen.current, abort: new AbortController(), api: null };
    live.current = run;
    const mine = () => live.current === run;
    document.documentElement.dataset.ignitionRun = String(run.id);
    setLeaving(false); setBeat('loading'); setProgress(0); setSound(false); ignition.set('play'); delete document.documentElement.dataset.ignitionBeats;
    try { sessionStorage.setItem('microfire.home.intro', '1'); } catch { /* the observatory's own fly-in is replaced by the film */ }
    if (!d.open) try { d.showModal(); } catch { d.setAttribute('open', ''); }
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); el.replaceChildren(canvas);
    const params = new URLSearchParams(location.search), freeze = params.get('t');
    // Before downloading any 3D code: no WebGL or a software rasteriser means the site, straight away.
    if (!capableGpu()) { close('skip'); return; }
    try {
      const { startFilm } = await import('./film');
      if (!mine()) return;
      const api = await startFilm({
        canvas, host: el, signal: run.abort.signal, mobile: matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 1024px)').matches,
        onBeat: (b) => {
          if (!mine()) return;
          setBeat(b); if (b === 'holo') ignition.set('handoff'); if (b === 'earth') performance.mark('ignition:first-frame');
          const h = document.documentElement; h.dataset.ignitionBeats = h.dataset.ignitionBeats ? `${h.dataset.ignitionBeats},${b}` : b; // every beat, even if two land in one frame
        },
        onEnd: () => { if (mine()) close('end'); },
        onProgress: (f) => { if (mine()) setProgress(f); },
        ...(freeze !== null && !Number.isNaN(Number(freeze)) ? { freezeAt: Number(freeze) } : {})
      });
      if (!mine()) { api?.stop(); return; } // stale: release, never adopt
      if (!api) { close('fail'); return; } // no WebGL, software graphics, or the download failed or stalled: straight to the site
      run.api = api;
    } catch { if (mine()) close('fail'); }
  }, [close, endFade]);

  useEffect(() => {
    const h = document.documentElement;
    h.dataset.ignitionLive = '1';
    const onSkip = () => close('skip');
    document.addEventListener('ignition:skip', onSkip);
    const onResize = () => live.current?.api?.resize();
    window.addEventListener('resize', onResize);
    // The gate script already decided on this load; it may also have been skipped before hydration.
    if (h.dataset.ignition === 'play') void play();
    const onReplay = () => { h.dataset.ignition = 'play'; void play(); };
    document.addEventListener('ignition:replay', onReplay);
    return () => {
      document.removeEventListener('ignition:skip', onSkip); document.removeEventListener('ignition:replay', onReplay); window.removeEventListener('resize', onResize);
      // Unmount (navigation, Strict Mode's double mount): invalidate everything this instance started.
      const run = live.current; live.current = null; run?.abort.abort(); run?.api?.stop(); endFade();
      delete h.dataset.ignitionLive;
      // A real unmount mid-film (Back) must not leave the page phase at 'play'. Strict Mode remounts synchronously and
      // must keep the gate's decision, so the reset waits a task and applies only if no instance came back.
      if (run) setTimeout(() => { if (!h.dataset.ignitionLive && h.dataset.ignition === 'play') { h.dataset.ignition = 'off'; ignition.set('off'); } });
    };
  }, [close, play, endFade]);

  const toggleSound = () => { const next = !sound; setSound(next); live.current?.api?.setSound(next); };
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
        <BootSky />
        <div className="ign-boot">
          <svg className="ign-boot-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2c7 7 10 12 10 17a10 10 0 0 1-20 0c0-5 3-10 10-17z" fill="#ffb020" stroke="#15153d" strokeWidth="2.2" /><path d="M16 14c3 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1-4 4-7z" fill="#ff5a5f" /></svg>
          <p className="ign-boot-word" aria-hidden="true">MicroFire</p>
          <p className="ign-boot-sub" aria-hidden="true">The Living Science Observatory</p>
          <progress max={1} value={progress} aria-label="Loading the opening film" />
          <p className="ign-boot-pct" aria-hidden="true">Loading the film · {Math.round(progress * 100)}%</p>
        </div>
      </div>}
      {cap?.alert && <p className="ign-alert" role="status"><span aria-hidden="true">▲</span> FIRE ANOMALY DETECTED</p>}
      {cap && !cap.alert && !title && <p className="ign-caption" key={beat} aria-live="polite">{cap.who && <b>{cap.who}: </b>}{cap.text}</p>}
      {title && <div className="ign-title" aria-hidden="true">
        <p className="ign-word" id="ign-word">MicroFire</p>
        <p className="ign-sub">The Living Science Observatory</p>
        <p className="ign-line">Explore the science of fire beyond Earth.</p>
      </div>}
      <p className="ign-note">A fictional story · not a real NASA incident · 3D characters generated with Meshy AI</p>
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

/** One playback: its id, the signal that cancels its start, and its film once (and only if) it still owns the page. */
type Run = { id: number; abort: AbortController; api: FilmApi | null };

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

/** The boot screen's sky: the homepage hero's sparkle stars and Earth's curve, so loading already looks like the site. */
const BOOT_STARS = [[8, 14, 1], [18, 70, .7], [27, 28, 1.1], [41, 84, .8], [56, 12, .9], [64, 64, .6], [73, 24, 1.2], [86, 46, .9], [93, 16, .7], [34, 52, .6]] as const;
function BootSky() {
  return <div className="ign-boot-sky" aria-hidden="true">
    {BOOT_STARS.map(([x, y, k], i) => <svg key={i} className="ign-boot-star" style={{ left: `${x}%`, top: `${y}%`, ['--s' as string]: k, ['--d' as string]: `${(i % 5) * .6}s` }} viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" /></svg>)}
    <span className="ign-boot-earth" />
  </div>;
}
