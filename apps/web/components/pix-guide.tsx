'use client';
// PIX, on every page: where you are, what to do now (naming the real controls), and the next stop on the judge path.
// On the mission page it follows the live mission through state published by the mission kit and
// the campaign page (`guide()`). Guidance only: PIX here never evaluates an answer, reveals a solution or states a NASA fact.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { PixAvatar, type PixMood } from './pix-avatar';
import './pix-guide.css';

type Stop = { href: string; label: string };
type Guide = { where: string; now: string[]; next?: Stop | undefined; mood?: PixMood };
export type GuideEvent = { mission?: string; step?: string | null; hint?: string; result?: string | null; phase?: string; done?: number; complete?: boolean };

/** The judge path (same order as /judge-guide). */
const PATH: (Stop & { match: (p: string) => boolean })[] = [
  { href: '/judge-guide', label: 'the judge guide', match: (p) => p === '/judge-guide' },
  { href: '/lab', label: 'the Flame Lab', match: (p) => p === '/lab' },
  { href: '/experiments/bass2-b20', label: 'the B20 record', match: (p) => p.startsWith('/experiments/') },
  { href: '/dashboard', label: 'the Evidence Workstation', match: (p) => p === '/dashboard' },
  { href: '/missions/play', label: 'the five missions', match: (p) => p === '/missions/play' },
];
const after = (p: string): Stop | undefined => { const i = PATH.findIndex((s) => s.match(p)); return i >= 0 ? PATH[i + 1] : undefined; };

export function guideFor(path: string): Guide {
  if (path === '/') return { mood: 'greet', where: 'Welcome. MicroFire shows how fire behaves without gravity, using one real NASA test as its evidence.',
    now: ['Drag the gravity slider in the illustration to see why a flame changes shape without buoyancy.', 'Short on time? Press “See the 60-second proof” for the whole argument in six steps.'], next: PATH[0] };
  if (path === '/judge-guide') return { mood: 'greet', where: 'This is the route through MicroFire. Each step takes a minute or two.',
    now: ['Follow steps 01 to 06 in order. Each card opens its tool.', 'Short on time? “Watch the 60-second proof” shows the whole argument first.', 'I will be in the corner of every page with what to do there.'], next: after(path) };
  if (path === '/proof') return { mood: 'cite', where: 'The proof: one NASA observation, its verified conditions, a fictional Moon scenario and why I refuse to call it safe.',
    now: ['Press “Play the proof”: the six steps advance on their own. Back and Next step by hand.', 'Every step links to the evidence behind it.'], next: { href: '/missions/play', label: 'the five missions' } };
  if (path === '/lab') return { where: 'The Flame Lab. The drawing is a toy model that shows directions of effect, never measurements.',
    now: ['Press a gravity preset (Microgravity, Moon, Mars, Earth) and watch the flame change shape.', 'Move the airflow or oxygen slider, one at a time.', 'Press “Compare with the real B20 test” to see what NASA actually recorded.'], next: after(path) };
  if (path.startsWith('/experiments/')) return { mood: 'cite', where: 'The full record of BASS-II test B20, the one admitted NASA experiment.',
    now: ['Select a numbered apparatus part to see what it does and the page it comes from.', 'Read “Conditions and missing values”: unknown means the source did not report it.', 'Use the PDF link to check the observation on its NASA page yourself.'], next: after(path) };
  if (path === '/dashboard') return { mood: 'cite', where: 'The Evidence Workstation: trace any question to a cited observation, its conditions and its limits.',
    now: ['Type a question or press an example, then press “Trace the evidence”.', 'Add target conditions (for example Moon) to see what matches, differs or was never recorded.', 'Try “Is a lunar habitat fire-safe?”: I withhold answers the evidence cannot support.'], next: after(path) };
  if (path === '/missions/play') return { where: 'The five missions. Your case is saved on the MicroFire server for this browser; no account.',
    now: ['Read the mission briefing, then follow the highlighted objective.'], next: { href: '/judge-guide', label: 'the judge guide' } };
  if (path === '/missions') return { where: 'The mission map: five short missions built on the same real NASA test.',
    now: ['Press “Enter or resume the campaign” to start. Progress is saved on the server.', 'Want to look around first? “Tour the training bay” shows the apparatus in 3D.'], next: { href: '/missions/play', label: 'the five missions' } };
  if (path.startsWith('/missions/') && path.endsWith('/tour')) return { where: 'A guided 3D tour of the BASS-II training bay (a schematic model, not NASA CAD).',
    now: ['Press “Guided tour”, or select a numbered part to inspect it.', 'Drag to orbit; arrow keys rotate, plus and minus zoom.'], next: { href: '/missions/play', label: 'the five missions' } };
  if (path.startsWith('/missions/')) return { where: 'A mission briefing.', now: ['Read what the mission asks, then start the campaign to play it.'], next: { href: '/missions/play', label: 'the five missions' } };
  if (path === '/ask') return { mood: 'cite', where: 'Ask me. Every answer shows the NASA page it comes from, or says why I cannot answer.',
    now: ['Type a question or press an example, then press “Ask PIX”.', 'Try “Can this certify a lunar habitat?” to see me refuse an unsupported claim.'], next: { href: '/dashboard', label: 'the Evidence Workstation' } };
  if (path === '/atlas') return { where: 'The experiment atlas. Only B20 is admitted; other rows wait for source review.',
    now: ['Search or filter the catalog.', 'Press “Inspect B20” to open the full record.'], next: { href: '/experiments/bass2-b20', label: 'the B20 record' } };
  if (path === '/gaps') return { mood: 'gap', where: 'Coverage: which of your conditions the evidence actually covers.',
    now: ['Describe your case and fill in the conditions you know.', 'Press “Analyse transfer” to see matches, differences and gaps, condition by condition.'], next: { href: '/dashboard', label: 'the Evidence Workstation' } };
  if (path.startsWith('/investigations')) return { where: 'The investigation library: descriptions of NASA fire studies, labelled by review status.',
    now: ['Search by topic (for example “droplet” or “flame spread”).', 'Only reviewed records count as evidence; the rest are leads.'], next: { href: '/dashboard', label: 'the Evidence Workstation' } };
  if (path === '/compare') return { mood: 'gap', where: 'Comparison needs two admitted records. There is one today, so I will not invent a second.',
    now: ['Request a comparison to see the evidence service refuse it and explain why.'], next: { href: '/dashboard', label: 'the Evidence Workstation' } };
  if (path === '/passport') return { where: 'This page is a local notebook. Your earned Passport lives with your mission case.',
    now: ['Play the missions: each accepted mission adds a cited Passport entry.', 'At the end, press “Download Passport (JSON)” on the mission page.'], next: { href: '/missions/play', label: 'the five missions' } };
  if (path === '/sources') return { mood: 'cite', where: 'Sources and rights: every claim starts on a page you can open.', now: ['Open the NASA report and check any page cited on this site.'], next: { href: '/methodology', label: 'the methodology' } };
  if (path === '/methodology') return { where: 'How a page becomes evidence, how answers are ranked, and where the limits are.', now: ['Read “Five kinds of statement” first: it explains every label on the site.'], next: { href: '/judge-guide', label: 'the judge guide' } };
  if (path === '/roadmap') return { where: 'Progress: what works today and what does not, straight from the feature registry.', now: ['Labels here are deliberately conservative; the judge guide shows what you can use now.'], next: { href: '/judge-guide', label: 'the judge guide' } };
  return { where: 'You are off the main path.', now: ['The judge guide takes you through everything in six steps.'], next: { href: '/judge-guide', label: 'the judge guide' } };
}

/** Recovery advice for the campaign connection state (wording mirrors the campaign page). */
function recovery(phase?: string) {
  if (phase === 'unavailable') return 'The server did not answer. Press Retry: it resends the same step, and the server never applies it twice.';
  if (phase === 'rate-limited') return 'Too many steps at once. Wait for the countdown, then continue.';
  if (phase === 'expired' || phase === 'missing') return 'This case has ended. Start a new case to play again.';
  return 'Stuck? Reloading is safe: your case is saved on the server.';
}

/** Live guide state: a tiny external store, so events published before the guide mounts are not lost. */
let current: { path: string; ev: GuideEvent } = { path: '', ev: {} };
const subs = new Set<() => void>();
const EMPTY: { path: string; ev: GuideEvent } = { path: '', ev: {} };
/** Tells the site-wide PIX guide what the visitor is doing now (display only; nothing is evaluated here). */
export function guide(detail: GuideEvent) {
  const here = location.pathname;
  current = { path: here, ev: current.path === here ? { ...current.ev, ...detail } : detail };
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

const KEY = 'microfire-pix-guide';
const noop = () => () => {};
type Mode = 'mini' | 'full' | 'hidden';
const readMode = (): Mode | null => { try { const v = sessionStorage.getItem(KEY); return v === 'mini' || v === 'full' || v === 'hidden' ? v : null; } catch { return null; } };
const media = (q: string) => (cb: () => void) => { const m = matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const touchSub = media('(pointer: coarse)');
export function PixGuide() {
  const path = usePathname() ?? '/';
  const id = useId();
  const touch = useSyncExternalStore(touchSub, () => matchMedia('(pointer: coarse)').matches, () => false);
  const stored = useSyncExternalStore(noop, readMode, () => null);
  const [choice, setChoice] = useState<Mode | null>(null);
  const shared = useSyncExternalStore(subscribe, () => current, () => EMPTY);
  const live = shared.path === path ? shared.ev : {};
  // Default: a one-line bubble with the next action, so PIX never hides the page; the visitor's choice is remembered.
  const mode: Mode = choice ?? stored ?? 'mini';
  const set = (m: Mode) => { setChoice(m); try { sessionStorage.setItem(KEY, m); } catch { /* storage blocked */ } };
  useEffect(() => {
    if (mode !== 'full') return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setChoice('mini'); try { sessionStorage.setItem(KEY, 'mini'); } catch { /* storage blocked */ } } };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [mode]);
  // Rendered on the server too (server snapshots: mini mode, no live state), so the phone strip never shifts the page.
  if (path === '/design' || path.startsWith('/design/')) return null;

  const play = path === '/missions/play' || !!live.mission, g = play ? guideFor('/missions/play') : guideFor(path);
  const now = play && live.complete ? ['All five missions are done. Scroll to your Evidence Passport and press “Download Passport (JSON)”.']
    : play && live.step ? [live.step] : g.now;
  // While a mission is running, the only next step is the mission itself.
  const next = play ? (live.complete ? { href: '/dashboard', label: 'the Evidence Workstation' } : undefined) : g.next;
  const mood: PixMood = play && live.phase === 'unavailable' ? 'gap' : play && live.result?.startsWith('Not') ? 'gap' : g.mood ?? 'look';
  // Judge-guide step numbers: 01 home, 02 lab, 03 B20, 04 workstation, 05 missions (06, the Passport, is on the mission page).
  const step = path === '/' ? 1 : PATH.findIndex((s) => s.match(path)) + 1;

  const stepTag = step >= 1 && path !== '/judge-guide' ? <span> · step {step} of 6</span> : null;
  return <aside className="pixg" data-mode={mode} aria-label="PIX guide">
    {mode === 'full' ? <div className="pixg-card" id={id}>
      <div className="pixg-head">
        <PixAvatar mood={mood} className="pixg-face" />
        <div><p className="pixg-name">PIX · your guide{stepTag}</p>
          <p className="pixg-where">{play && live.mission ? `You are in ${live.mission}${live.done !== undefined && !live.complete ? `, mission ${live.done + 1} of 5` : ''}. Your case is saved on the MicroFire server; no account needed.` : g.where}</p></div>
        <button type="button" className="pixg-x" onClick={() => set('mini')} aria-controls={id} aria-expanded="true">Less<span className="sr-only"> guidance</span></button>
      </div>
      <p className="pixg-label">{play && live.step ? 'Your objective now' : 'Do this now'}</p>
      <ul className="pixg-now">{now.map((n) => <li key={n}>{n}</li>)}</ul>
      {play && live.hint && !live.complete ? <p className="pixg-hint"><b>Hint:</b> {live.hint}</p> : null}
      {play && live.result ? <p className="pixg-result" data-ok={live.result.startsWith('Accepted')}><b>Last step:</b> {live.result}</p> : null}
      {play ? <p className="pixg-fine">{touch ? 'Tap a station label in the 3D room, or use the same controls below it.' : 'Click a glowing station label in the 3D room, or use the same controls below it (keyboard works too).'} {recovery(live.phase)}</p> : null}
      {next ? <Link className="pixg-next" href={next.href}>Next: {next.label} <span aria-hidden="true">→</span></Link> : null}
    </div>
    : mode === 'mini' ? <div className="pixg-mini" id={id}>
      <PixAvatar mood={mood} className="pixg-face" />
      <p className="pixg-say" aria-live="polite"><b>PIX{stepTag}:</b> {play && live.phase === 'unavailable' ? recovery(live.phase) : now[0]}</p>
      <div className="pixg-acts">
        <button type="button" className="pixg-x" onClick={() => set('full')} aria-controls={id} aria-expanded="false">More<span className="sr-only"> guidance from PIX</span></button>
        <button type="button" className="pixg-x" onClick={() => set('hidden')} aria-label="Hide PIX">×</button>
      </div>
    </div>
    : <button type="button" className="pixg-fab" onClick={() => set('mini')} aria-label="Show PIX guide">
      <PixAvatar mood={mood} className="pixg-face" /><span aria-hidden="true">PIX</span>
    </button>}
  </aside>;
}
