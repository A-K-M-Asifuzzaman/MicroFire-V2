'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import type { DomainResult, HttpFailure, LocalSaveResult, Snapshot, TrainingAction } from '../contract';
import { createController, type GameEvent, type Link as LinkState } from '../controller';
import type { PreviewTransport, TransportResult } from '../transport';
import { GameProvider, type GameData } from './context';
import { MissionShell } from './shell';

/** One approved example per scenario. A scripted reply (if any) is replayed for the first request; everything else is logged, never sent. */
export type Scenario = {
  id: string; title: string; group: 'Stages' | 'Recovery' | 'Access' | 'Saving';
  snapshot: Snapshot | null;
  event?: { kind: 'accepted'; action: TrainingAction | null; before: Snapshot | null; feedback?: { correct: boolean; hint: string } | null }
    | { kind: 'refused'; action: TrainingAction | null; result: Extract<DomainResult, { ok: false }> };
  link?: LinkState;
  reply?: { status: number; failure: HttpFailure | null; retryAfterMs?: number } | { unknown: 'timeout' };
  save?: LocalSaveResult;
  sources: string[];
};

function fixtureTransport(sc: Scenario): PreviewTransport {
  let reply = sc.reply;
  const next = async (): Promise<TransportResult<never>> => {
    const r = reply; reply = undefined;
    if (!r) return { kind: 'not-sent' };
    return 'unknown' in r ? { kind: 'unknown', reason: r.unknown } : { kind: 'failure', status: r.status, failure: r.failure, retryAfterMs: r.retryAfterMs ?? null };
  };
  const notSent = async () => ({ kind: 'not-sent' as const });
  return { capability: notSent, authorize: notSent, revoke: notSent, start: next, action: next, resume: next,
    session: async () => (sc.snapshot ? { kind: 'ok' as const, data: sc.snapshot } : { kind: 'not-sent' as const }) };
}

function seedEvent(sc: Scenario): GameEvent | undefined {
  const e = sc.event;
  if (!e || !sc.snapshot) return undefined;
  return e.kind === 'accepted'
    ? { id: 1, kind: 'accepted', label: 'Fixture', action: e.action, before: e.before, after: sc.snapshot, feedback: e.feedback ?? null }
    : { id: 1, kind: 'refused', label: 'Fixture', action: e.action, code: e.result.code, message: e.result.message, faults: e.result.faults ?? [] };
}

export function FixtureGallery({ scenarios, current, data }: { scenarios: Scenario[]; current: string; data: GameData }) {
  const sc = scenarios.find((s) => s.id === current) ?? scenarios[0]!;
  const controller = useMemo(() => {
    const event = seedEvent(sc);
    return createController({
      transport: fixtureTransport(sc), mode: 'fixture', minPostGapMs: 0,
      identify: async () => '0'.repeat(64), // fixture-only placeholder identity; the real one is Sol's shared requestIdentity
      ...(sc.save ? { save: { capability: 'writable' as const, save: async () => sc.save! } } : {}),
      seed: { ...(sc.snapshot ? { snapshot: sc.snapshot } : {}), ...(event ? { event } : {}), ...(sc.link ? { link: sc.link } : {}),
        ...(!sc.snapshot ? { runtimeId: '33333333-3333-4333-8333-333333333333' } : {}) }
    });
  }, [sc]);
  const groups = ['Stages', 'Recovery', 'Access', 'Saving'] as const;
  return <div className="m2-gallery">
    <nav className="m2-gallery-nav wrap" aria-label="Fixture scenarios">
      {groups.map((g) => <div key={g}><p className="eyebrow">{g}</p><ul>{scenarios.filter((s) => s.group === g).map((s) => <li key={s.id}>
        <Link href={`/m2-fixtures?scenario=${s.id}`} aria-current={s.id === sc.id ? 'page' : undefined}>{s.title}</Link></li>)}</ul></div>)}
    </nav>
    <GameProvider key={sc.id} controller={controller} data={data}>
      <MissionShell banner={<p className="m2-fixture-banner" role="note"><b>Fixture gallery — not a playable mission.</b> This view replays approved M2 contract examples ({sc.sources.join(', ')}) through the real gameplay controller. Requests are recorded in the intent log and never sent; no server, no saved progress, no scientific validation.</p>} />
    </GameProvider>
  </div>;
}
