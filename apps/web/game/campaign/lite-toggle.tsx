'use client';
// Opt-in lightweight mode for slow or metered connections. Suggested (never forced) when the browser reports Data Saver
// or a slow connection; the visitor's choice is remembered on this device.
import { setLite, useLite, useSlowConnection } from '../lite-mode';

export function LiteToggle() {
  const lite = useLite(), slow = useSlowConnection();
  return <div className="mf-lite" data-on={lite}>
    <button type="button" className="btn btn-sm" aria-pressed={lite} onClick={() => setLite(!lite)}>
      Lightweight mode (no 3D): {lite ? 'on' : 'off'}
    </button>
    <p className="mf-fine">{lite ? 'The 3D rooms are off, so the 3D engine and models are not downloaded (about 3.4 MB for Mission 01 alone). Every mission, control and Passport entry works the same.'
      : slow ? 'Your connection looks slow or Data Saver is on. Lightweight mode skips the 3D engine and models (about 3.4 MB for Mission 01 alone); gameplay and progress are unchanged.'
      : 'On a slow or metered connection, switch off the 3D rooms. Gameplay and progress are unchanged.'}</p>
  </div>;
}
