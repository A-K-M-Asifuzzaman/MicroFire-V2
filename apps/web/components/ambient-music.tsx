'use client';
// Peaceful background music, generated in the browser (Web Audio): slow, soft chords through a gentle reverb.
// No audio file, so nothing to license. Off by default (WCAG 1.4.2); the visitor's choice is remembered, and because
// browsers block sound until the visitor interacts, a remembered "on" resumes at the first click or key press.
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'microfire-music';
// Cmaj9 → Am9 → Fmaj9 → G6/9, voiced low and wide (Hz)
const CHORDS = [[130.81, 196.0, 246.94, 293.66, 329.63], [110.0, 164.81, 196.0, 246.94, 261.63], [87.31, 130.81, 174.61, 220.0, 261.63], [98.0, 146.83, 196.0, 220.0, 293.66]];
const BAR = 9; // seconds per chord

type Engine = { ctx: AudioContext; master: GainNode; timer: number };
let engine: Engine | null = null, on = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function impulse(ctx: AudioContext, seconds = 3.2) {
  const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  return buf;
}
function start() {
  if (engine) { void engine.ctx.resume(); engine.master.gain.setTargetAtTime(0.055, engine.ctx.currentTime, 1.2); return; }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!Ctx) return;
  const ctx = new Ctx(), master = ctx.createGain(); master.gain.value = 0;
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
  const wet = ctx.createGain(); wet.gain.value = 0.55; const dry = ctx.createGain(); dry.gain.value = 0.6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); lfo.frequency.value = 0.05; lfoGain.gain.value = 350; lfo.connect(lfoGain).connect(lp.frequency); lfo.start();
  lp.connect(dry).connect(master); lp.connect(verb).connect(wet).connect(master); master.connect(ctx.destination);
  let bar = 0;
  const play = () => {
    const t = ctx.currentTime + 0.05, chord = CHORDS[bar++ % CHORDS.length]!;
    chord.forEach((f, i) => {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = det;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(i === 0 ? 0.12 : 0.05, t + 3); g.gain.setTargetAtTime(0, t + BAR - 1.5, 1.2);
        o.connect(g).connect(lp); o.start(t); o.stop(t + BAR + 4);
      }
    });
  };
  play(); const timer = window.setInterval(play, BAR * 1000);
  master.gain.setTargetAtTime(0.055, ctx.currentTime, 1.5);
  engine = { ctx, master, timer };
}
function stop() { if (!engine) return; engine.master.gain.setTargetAtTime(0, engine.ctx.currentTime, 0.4); const e = engine; window.setTimeout(() => { if (!on) void e.ctx.suspend(); }, 1500); }
export function setMusic(next: boolean) { on = next; try { localStorage.setItem(KEY, next ? 'on' : 'off'); } catch { /* storage blocked */ } if (next) start(); else stop(); emit(); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function MusicToggle() {
  const playing = useSyncExternalStore(subscribe, () => on, () => false);
  // A remembered "on" resumes at the visitor's first interaction (browsers do not allow sound before one).
  useEffect(() => {
    let want = false; try { want = localStorage.getItem(KEY) === 'on'; } catch { /* storage blocked */ }
    if (!want || on) return;
    const go = () => { setMusic(true); window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
    window.addEventListener('pointerdown', go, { once: true }); window.addEventListener('keydown', go, { once: true });
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);
  return <button type="button" className="music-toggle" aria-pressed={playing} onClick={() => setMusic(!playing)} title={playing ? 'Turn background music off' : 'Play calm background music'}>
    <span aria-hidden="true">{playing ? '♪' : '♫'}</span><span className="music-label">{playing ? 'Music on' : 'Music off'}</span><span className="sr-only"> (background music)</span>
  </button>;
}
