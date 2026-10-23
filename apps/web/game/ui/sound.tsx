'use client';
import { useEffect, useSyncExternalStore } from 'react';
import type { GameEvent } from '../controller';
import { astronautCue, faultIntroduced } from '../view-model';
import { soundscape } from './soundscape';

const OFF = { sound: false, voice: false };
const never = () => () => {};

/** Opt-in toggles. Turning the voice on reads the current PIX line straight away. */
export function SoundControls({ line }: { line: string }) {
  const p = useSyncExternalStore(soundscape.subscribe, soundscape.get, () => OFF);
  const audio = useSyncExternalStore(never, soundscape.available, () => false);
  const voice = useSyncExternalStore(never, soundscape.voiceAvailable, () => false);
  // A saved "on" preference resumes at the learner's first click (browsers block audio until then).
  useEffect(() => {
    const on = () => soundscape.resume();
    document.addEventListener('pointerdown', on, { once: true });
    return () => document.removeEventListener('pointerdown', on);
  }, []);
  return <div className="m2-sound" role="group" aria-label="Sound">
    <button type="button" aria-pressed={p.sound} disabled={!audio} onClick={() => soundscape.set({ sound: !p.sound })}>Lab sound</button>
    <button type="button" aria-pressed={p.voice} disabled={!voice} onClick={() => { soundscape.set({ voice: !p.voice }); if (!p.voice) soundscape.say(line); }}>Read PIX aloud</button>
  </div>;
}

/** Cues follow confirmed outcomes only; a refusal gets its own soft tone. PIX's new lines are read when the voice is on. */
export function useSoundCues(ev: GameEvent | null, line: string) {
  useEffect(() => {
    if (!ev) return;
    if (ev.kind === 'refused') return soundscape.cue('refuse');
    if (faultIntroduced(ev.before, ev.after)) return soundscape.cue('fault');
    if (astronautCue(ev) === 'cheer') return soundscape.cue('qualified');
    if (ev.action?.type === 'GAME' && ev.action.action.type === 'OBSERVE_DOCUMENTED_RESULT') return soundscape.cue('reveal');
    soundscape.cue('confirm');
  }, [ev]);
  useEffect(() => { soundscape.say(line); }, [line]);
}
