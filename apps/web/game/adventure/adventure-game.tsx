'use client';
// ISS Adventure: a first-person microgravity quest built on the B20 record. The world is an illustration; the NASA
// values, the citation and Mission Control's refusal come from the admitted catalog and the deterministic engine.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AdventureApi, Frame, TargetId } from './adventure-scene';
import { useLite } from '../lite-mode';
import './adventure.css';

export type AdventureFacts = { observation: string; citation: string; href: string; oxygen: string; flow: string; refusal: string; conditions: { label: string; value: string; known: boolean }[] };
type Step = 'terminal' | 'collect' | 'install' | 'run' | 'comms' | 'won';
const PARTS: { id: TargetId; name: string; what: string }[] = [
  { id: 'part-duct', name: 'Flow duct', what: 'The clear tunnel the air flows through.' },
  { id: 'part-fan', name: 'Variable-speed fan', what: 'Pushes the opposed airflow across the sample.' },
  { id: 'part-igniter', name: 'Hot-wire igniter', what: 'Heats the edge of the PMMA sample until it lights.' },
  { id: 'part-camera', name: 'Video camera', what: 'Records the flame through the window.' },
];
const OBJECTIVE: Record<Step, string> = {
  terminal: 'Float to the research terminal and read the NASA record.',
  collect: 'Find the four BASS-II parts drifting in the module.',
  install: 'Bring the parts to the glovebox and install them.',
  run: 'Run test B20 inside the glovebox.',
  comms: 'Mission Control is calling: answer at the comms panel.',
  won: 'Mission complete.',
};
const TARGET_OF = (step: Step, have: Set<TargetId>): TargetId | null => step === 'terminal' ? 'terminal' : step === 'collect' ? PARTS.find((p) => !have.has(p.id))?.id ?? null
  : step === 'install' || step === 'run' ? 'glovebox' : step === 'comms' ? 'comms' : null;
const ANSWERS = [
  { id: 'safe', text: 'Yes. B20 burned in microgravity, so the Moon base is safe.' },
  { id: 'unsafe', text: 'No. B20 burned the whole sample, so the Moon base is unsafe.' },
  { id: 'insufficient', text: 'We cannot say. One orbital test does not cover lunar gravity or the habitat pressure.' },
] as const;
const never = () => () => {};
// Probed ONCE: a WebGL probe per render would exhaust the browser's context limit and kill the game's own context.
let glCache: boolean | null = null;
const glOk = () => { if (glCache === null) { try { const c = document.createElement('canvas'); glCache = !!(c.getContext('webgl2') || c.getContext('webgl')); c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { glCache = false; } } return glCache; };

export function AdventureGame({ facts }: { facts: AdventureFacts }) {
  const lite = useLite(), gl = useSyncExternalStore(never, glOk, () => true);
  const canvas = useRef<HTMLCanvasElement>(null), api = useRef<AdventureApi | null>(null);
  const [ready, setReady] = useState(false), [started, setStarted] = useState(false), [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>('terminal'), [have, setHave] = useState<Set<TargetId>>(new Set());
  const [frame, setFrame] = useState<Frame | null>(null), [panel, setPanel] = useState<TargetId | null>(null);
  const [toast, setToast] = useState<string | null>(null), [runPhase, setRunPhase] = useState<0 | 1 | 2 | 3 | 4>(0), [answer, setAnswer] = useState<string | null>(null);
  const keys = useRef(new Set<string>());
  const say = (t: string) => { setToast(t); window.setTimeout(() => setToast((o) => (o === t ? null : o)), 3200); };

  // boot the world
  useEffect(() => {
    if (!gl || !canvas.current) return;
    let live = true;
    import('./adventure-scene').then(({ startAdventure }) => {
      if (!live || !canvas.current) return;
      const a = startAdventure(canvas.current, { lite, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onFrame: (f) => { if (live) setFrame(f); }, onReady: () => { if (live) setReady(true); } });
      if (!a) { setFailed(true); return; }
      api.current = a; a.setActive('terminal');
    }).catch(() => setFailed(true));
    return () => { live = false; api.current?.dispose(); api.current = null; };
  }, [gl, lite]);

  const interact = useCallback(() => {
    const near = frame?.near; if (!near) { say('Nothing in reach. Follow the glowing beacon.'); return; }
    if (near.startsWith('part-')) {
      if (step !== 'collect' || have.has(near)) return;
      const next = new Set(have); next.add(near); setHave(next); api.current?.setVisible(near, false);
      const p = PARTS.find((x) => x.id === near)!; say(`Collected: ${p.name}. ${p.what}`);
      if (next.size === PARTS.length) { setStep('install'); say('All four parts collected. Take them to the glovebox.'); }
      return;
    }
    if (near === 'terminal') { setPanel('terminal'); return; }
    if (near === 'glovebox') {
      if (step === 'collect' || step === 'terminal') { say(step === 'terminal' ? 'Read the NASA record at the terminal first.' : `Find the parts first: ${have.size} of 4 collected.`); return; }
      if (step === 'install') { api.current?.installParts(4); setStep('run'); say('BASS-II installed in the glovebox. Ready to run test B20.'); }
      setPanel('glovebox'); return;
    }
    if (near === 'comms') { if (step !== 'comms' && step !== 'won') { say('Mission Control will call after the test run.'); return; } setPanel('comms'); }
  }, [frame?.near, step, have]);

  // keyboard: WASD/arrows move, R/F or Space/Shift up and down, E interacts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!started || (e.target as HTMLElement).closest('input, textarea, select, button, a, [role=dialog]')) return;
      const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'r', 'f', ' ', 'shift', 'q', 'z'].includes(k)) { keys.current.add(k); e.preventDefault(); }
      if (k === 'e' || k === 'enter') { interact(); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const tick = window.setInterval(() => {
      const a = api.current; if (!a) return; const k = keys.current;
      a.input.move.z = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
      a.input.move.x = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
      a.input.move.y = (k.has('r') || k.has(' ') ? 1 : 0) - (k.has('f') || k.has('shift') ? 1 : 0);
      if (k.has('arrowleft') || k.has('q')) a.input.look.yaw += 0.035; if (k.has('arrowright') || k.has('z')) a.input.look.yaw -= 0.035;
    }, 16);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); clearInterval(tick); };
  });

  // pointer drag to look (mouse and touch on the right half); left-half touch is the joystick below
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { const d = drag.current, a = api.current; if (!d || !a) return; a.input.look.yaw -= (e.clientX - d.x) * 0.004; a.input.look.pitch -= (e.clientY - d.y) * 0.004; drag.current = { x: e.clientX, y: e.clientY }; };
  const onUp = () => { drag.current = null; };
  const joy = useRef<{ x: number; y: number } | null>(null), [stick, setStick] = useState<{ x: number; y: number } | null>(null);
  const joyDown = (e: React.PointerEvent) => { joy.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); };
  const joyMove = (e: React.PointerEvent) => { const j = joy.current, a = api.current; if (!j || !a) return; const dx = Math.max(-1, Math.min(1, (e.clientX - j.x) / 50)), dy = Math.max(-1, Math.min(1, (e.clientY - j.y) / 50)); a.input.move.x = dx; a.input.move.z = -dy; setStick({ x: dx, y: dy }); };
  const joyUp = () => { joy.current = null; setStick(null); if (api.current) { api.current.input.move.x = 0; api.current.input.move.z = 0; } };

  const target = TARGET_OF(step, have);
  useEffect(() => { api.current?.setActive(target); }, [target, ready]);

  const runTest = () => {
    if (runPhase) return; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seq: [0 | 1 | 2 | 3 | 4, number][] = [[1, 0], [2, 1300], [3, 2500], [4, 3600]];
    seq.forEach(([p, at]) => window.setTimeout(() => {
      setRunPhase(p); if (p === 3) api.current?.ignite(true);
      if (p === 4) { setStep('comms'); say('Test complete. Mission Control is calling from the comms panel.'); }
    }, reduce ? 0 : at));
  };
  const guide = () => { if (target) { api.current?.teleportTo(target); say('Floating you to the next objective.'); } };
  const done = { terminal: step !== 'terminal', collect: have.size === 4, install: ['run', 'comms', 'won'].includes(step), run: ['comms', 'won'].includes(step), comms: step === 'won' };

  if (!gl || failed) return <div className="adv-fallback"><p><b>The 3D adventure needs WebGL</b>, which this device or browser does not offer.</p><p>Every science step is still available: <Link href="/missions/play">play the five missions</Link> or <Link href="/proof">see the 60-second proof</Link>.</p></div>;
  return <div className="adv" data-started={started}>
    <div className="adv-stage">
      <canvas ref={canvas} className="adv-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="img"
        aria-label="First-person view inside an illustrated International Space Station laboratory module. Use the objective panel and buttons; every action is also available as a button." />
      {/* HUD */}
      <div className="adv-hud" aria-live="polite">
        <p className="adv-obj"><b>Objective</b> {OBJECTIVE[step]}</p>
        {step === 'collect' && <p className="adv-count">Parts {have.size} / 4</p>}
        {frame && target && frame.heading !== null && step !== 'won' && <div className="adv-compass" aria-hidden="true" style={{ transform: `rotate(${frame.heading}rad)` }}>▲</div>}
        {frame && target && <p className="adv-dist">{(frame.dist[target] ?? 0).toFixed(1)} m to target</p>}
      </div>
      {frame?.near && !panel && <button type="button" className="adv-prompt" onClick={interact}>{frame.near.startsWith('part') ? 'Collect part' : frame.near === 'terminal' ? 'Read the NASA record' : frame.near === 'glovebox' ? (step === 'install' ? 'Install BASS-II' : 'Open the glovebox') : 'Answer Mission Control'} <kbd>E</kbd></button>}
      {toast && <p className="adv-toast" role="status">{toast}</p>}
      <div className="adv-joy" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp} aria-hidden="true"><span style={stick ? { transform: `translate(${stick.x * 30}px, ${stick.y * 30}px)` } : undefined} /></div>
      <div className="adv-updown" role="group" aria-label="Float up or down">
        <button type="button" onPointerDown={() => { if (api.current) api.current.input.move.y = 1; }} onPointerUp={() => { if (api.current) api.current.input.move.y = 0; }} onPointerLeave={() => { if (api.current) api.current.input.move.y = 0; }}>Up</button>
        <button type="button" onPointerDown={() => { if (api.current) api.current.input.move.y = -1; }} onPointerUp={() => { if (api.current) api.current.input.move.y = 0; }} onPointerLeave={() => { if (api.current) api.current.input.move.y = 0; }}>Down</button>
      </div>
      {!started && <div className="adv-start">
        <div className="adv-start-card">
          <p className="eyebrow">Flame in Freefall · ISS Adventure</p>
          <h2>Can one space-station fire test keep a Moon base safe?</h2>
          <p>Float through a laboratory module, read a real NASA record, rebuild the BASS-II experiment, run test B20, then answer Mission Control.</p>
          <ul className="adv-keys"><li><kbd>W A S D</kbd> or the left stick: float</li><li>Drag: look around</li><li><kbd>Space</kbd>/<kbd>Shift</kbd> or Up/Down: rise and sink</li><li><kbd>E</kbd> or the on-screen button: interact</li></ul>
          <button type="button" className="btn btn-primary" onClick={() => setStarted(true)} disabled={!ready}>{ready ? 'Start the adventure' : 'Loading the module…'}</button>
          <p className="mf-fine">An illustrated station and toy flame; NASA values come only from the cited record.</p>
        </div>
      </div>}
    </div>

    <aside className="adv-side" aria-label="Mission log">
      <h2>Mission log</h2>
      <ol className="adv-steps">
        <li data-done={done.terminal}>Read the NASA record</li>
        <li data-done={done.collect}>Collect the BASS-II parts ({have.size}/4)</li>
        <li data-done={done.install}>Install them in the glovebox</li>
        <li data-done={done.run}>Run test B20</li>
        <li data-done={done.comms}>Answer Mission Control</li>
      </ol>
      <div className="adv-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={guide} disabled={!started || !target}>Guide me to the objective</button>
        <button type="button" className="btn btn-sm" onClick={interact} disabled={!started}>Interact</button>
      </div>
      <p className="mf-fine">Prefer no 3D? The same science is in the <Link href="/missions/play">five missions</Link> and the <Link href="/lab">Flame Lab</Link>.</p>
    </aside>

    {panel && <div className="adv-panel" role="dialog" aria-modal="true" aria-labelledby="adv-panel-h">
      <div className="adv-panel-card">
        {panel === 'terminal' && <>
          <p className="eyebrow">Research terminal · NASA record</p>
          <h3 id="adv-panel-h">BASS-II test B20</h3>
          <blockquote className="adv-quote">{facts.observation}</blockquote>
          <p className="mf-fine">Source: <a href={facts.href} target="_blank" rel="noreferrer">{facts.citation}</a></p>
          <ul className="adv-conds">{facts.conditions.map((c) => <li key={c.label} data-known={c.known}><b>{c.label}</b> {c.known ? c.value : 'unknown'}</li>)}</ul>
          <button type="button" className="btn btn-primary" onClick={() => { setPanel(null); if (step === 'terminal') { setStep('collect'); say('Record logged. Now find the four BASS-II parts.'); } }}>Log the record</button>
        </>}
        {panel === 'glovebox' && <>
          <p className="eyebrow">Microgravity glovebox · BASS-II</p>
          <h3 id="adv-panel-h">Run test B20</h3>
          <p>Recorded settings: <b>{facts.oxygen}</b> calibrated oxygen, <b>{facts.flow}</b> opposed airflow, PMMA film. Pressure was not reported.</p>
          <ol className="adv-run">{['Fill the chamber to the recorded oxygen', 'Start the fan at the recorded airflow', 'Fire the hot-wire igniter', 'Observe the flame'].map((t, i) => <li key={t} data-state={runPhase > i + 1 ? 'done' : runPhase === i + 1 ? 'now' : 'next'}>{t}</li>)}</ol>
          {runPhase === 4 && <p className="adv-quote">NASA&apos;s log for B20: {facts.observation}</p>}
          <div className="adv-actions"><button type="button" className="btn btn-primary" onClick={runTest} disabled={!!runPhase}>{runPhase ? (runPhase === 4 ? 'Test complete' : 'Running…') : 'Start test B20'}</button><button type="button" className="btn" onClick={() => setPanel(null)}>Watch the chamber</button></div>
          <p className="mf-fine">The flame you see is an illustration at B20&apos;s recorded settings, not B20 footage.</p>
        </>}
        {panel === 'comms' && <>
          <p className="eyebrow">Mission Control</p>
          <h3 id="adv-panel-h">“Based on B20, is our Moon base fire-safe?”</h3>
          <div className="adv-answers" role="group" aria-label="Your answer">{ANSWERS.map((a) => <button key={a.id} type="button" className="btn" aria-pressed={answer === a.id} onClick={() => { setAnswer(a.id); if (a.id === 'insufficient') setStep('won'); }}>{a.text}</button>)}</div>
          {answer && answer !== 'insufficient' && <p className="adv-wrong"><b>Mission Control:</b> {facts.refusal} B20 ran once, in orbit; lunar gravity and the habitat pressure were never part of that test.</p>}
          {answer === 'insufficient' && <div className="adv-win"><p><b>Correct, and honest.</b> {facts.refusal}</p><p>That is the MicroFire principle: every conclusion starts with a NASA source and ends with its limitations.</p>
            <div className="adv-actions"><Link className="btn btn-primary" href="/missions/play">Earn your Evidence Passport in the missions</Link><Link className="btn" href="/proof">See the 60-second proof</Link></div></div>}
          <button type="button" className="btn btn-quiet" onClick={() => setPanel(null)}>Close</button>
        </>}
      </div>
    </div>}
  </div>;
}
