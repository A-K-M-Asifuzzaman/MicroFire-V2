// Operation Ignition: the opening film's lifecycle, shared with the homepage observatory so the two never render at
// once. 'play': the film owns the GPU (the observatory waits or pauses); 'handoff': the film is in its final shot and
// the observatory may start underneath; 'off': no film.
export type IgnitionPhase = 'off' | 'play' | 'handoff';

export const IGNITION_KEY = 'microfire.ignition.v1';
/** Total running time in seconds (the film ends itself here; Skip ends it at any moment). */
export const FILM_SECONDS = 7.6;

let phase: IgnitionPhase = 'off';
const listeners = new Set<() => void>();

export const ignition = {
  get: () => phase,
  set(next: IgnitionPhase) { if (next === phase) return; phase = next; listeners.forEach((l) => l()); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** True when the server-rendered gate script decided to play the film on this page load. */
  gated: () => typeof document !== 'undefined' && document.documentElement.dataset.ignition === 'play'
};
