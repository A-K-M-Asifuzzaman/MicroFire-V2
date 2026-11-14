'use client';
// Lightweight mission mode: the visitor's opt-in to skip the 3D rooms (three.js and the mission models: about 3.4 MB for Mission 01 alone) and use the
// existing 2D station plans and parts table. Gameplay, progress and the Passport are unchanged: only rendering differs.
import { useSyncExternalStore } from 'react';

const KEY = 'microfire-lite', EVENT = 'microfire:lite';
let memory = false; // used when storage is blocked, so the choice still applies for this visit
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return memory; } };
const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); window.addEventListener('storage', cb); return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); }; };
export function setLite(on: boolean) { memory = on; try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* storage blocked: `memory` keeps it for this visit */ } window.dispatchEvent(new Event(EVENT)); }
export const useLite = () => useSyncExternalStore(subscribe, read, () => false);

type Connection = { saveData?: boolean; effectiveType?: string };
/** True when the browser reports Data Saver or a slow connection (Network Information API; absent in some browsers). */
export function slowConnection(): boolean {
  const c = (navigator as Navigator & { connection?: Connection }).connection;
  return !!c && (c.saveData === true || ['slow-2g', '2g', '3g'].includes(c.effectiveType ?? ''));
}
const never = () => () => {};
export const useSlowConnection = () => useSyncExternalStore(never, slowConnection, () => false);
