// Optional sound for the training bay: a quiet synthesized lab ambience, short cues on confirmed outcomes, and PIX's
// lines read aloud by the browser's own speech voice. Everything is generated in the browser (no audio files), off by
// default, and only starts from the learner's own click (browsers block audio before a gesture anyway).
// Cues follow confirmed server events only; nothing here is a measurement or a sound of combustion.

export type Cue = 'confirm' | 'refuse' | 'fault' | 'qualified' | 'reveal';
type Prefs = { sound: boolean; voice: boolean };

const KEY = 'microfire.m2.sound';
let prefs: Prefs = { sound: false, voice: false };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs> }; } catch { /* storage unavailable: defaults */ }
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null, master: GainNode | null = null, bed: { stop(): void } | null = null;

function engine() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  }
  void ctx.resume();
  return { ctx, out: master! };
}

/** Low air-handling hush plus a faint 55 Hz hum, slowly breathing. */
function startBed() {
  const { ctx: a, out } = engine();
  const noise = a.createBufferSource(), buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noise.buffer = buf; noise.loop = true;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const hum = a.createOscillator(); hum.frequency.value = 55;
  const humGain = a.createGain(); humGain.gain.value = 0.018;
  const gain = a.createGain(); gain.gain.setValueAtTime(0, a.currentTime); gain.gain.linearRampToValueAtTime(0.05, a.currentTime + 2);
  const lfo = a.createOscillator(), lfoGain = a.createGain(); lfo.frequency.value = 0.07; lfoGain.gain.value = 0.015; lfo.connect(lfoGain).connect(gain.gain);
  noise.connect(lp).connect(gain).connect(out); hum.connect(humGain).connect(out);
  noise.start(); hum.start(); lfo.start();
  return { stop() { const t = a.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.linearRampToValueAtTime(0, t + 0.6); humGain.gain.linearRampToValueAtTime(0, t + 0.6); for (const n of [noise, hum, lfo]) n.stop(t + 0.7); } };
}

/** Short tones: rising for confirmations, a soft low note for refusals, a two-note amber alert for the authored fault. */
const CUES: Record<Cue, [freq: number, at: number, dur: number][]> = {
  confirm: [[660, 0, 0.12], [880, 0.09, 0.16]],
  refuse: [[220, 0, 0.22]],
  fault: [[523, 0, 0.18], [415, 0.2, 0.26]],
  qualified: [[523, 0, 0.18], [659, 0.12, 0.18], [784, 0.24, 0.3]],
  reveal: [[988, 0, 0.5], [1319, 0.15, 0.6]]
};
function tone(cue: Cue) {
  const { ctx: a, out } = engine();
  for (const [f, at, dur] of CUES[cue]) {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = cue === 'refuse' ? 'triangle' : 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
}

export const soundscape = {
  get: () => prefs,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  /** Called from the learner's click, so the AudioContext may start. */
  set(next: Partial<Prefs>) {
    prefs = { ...prefs, ...next };
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* per-viewer convenience only */ }
    if (prefs.sound && !bed) bed = startBed();
    if (!prefs.sound && bed) { bed.stop(); bed = null; }
    if (!prefs.voice && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    listeners.forEach((l) => l());
  },
  cue(c: Cue) { if (prefs.sound && ctx) tone(c); },
  /** Read a PIX line with the browser's voice; a newer line replaces an unfinished one. */
  say(text: string) {
    if (!prefs.voice || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; u.pitch = 1.05;
    speechSynthesis.speak(u);
  },
  /** A saved "on" preference resumes only after a click on the page (autoplay rules). */
  resume() { if (prefs.sound && !bed) bed = startBed(); },
  available: () => typeof window !== 'undefined' && 'AudioContext' in window,
  voiceAvailable: () => typeof window !== 'undefined' && 'speechSynthesis' in window
};
