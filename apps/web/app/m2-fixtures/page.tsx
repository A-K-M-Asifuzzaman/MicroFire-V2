import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ActionRequest, DomainResult, HttpFailure, LocalSaveResult, Snapshot } from '../../game/contract';
import { b20Data } from '../../game/contract/b20';
import { partSpecs } from '../../game/contract/parts';
import { FixtureGallery, type Scenario } from '../../game/ui/fixture-gallery';

// Developer fixture gallery for the M2 gameplay frontend. Off unless MICROFIRE_M2_FIXTURE_GALLERY=1 at runtime;
// it reads the approved docs/m2 examples from disk (never bundled) and is not linked from any public page.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'M2 fixture gallery', robots: { index: false, follow: false } };

function dir() {
  for (const d of [path.join(process.cwd(), '..', '..', 'docs', 'm2', 'fixtures'), path.join(process.cwd(), 'docs', 'm2', 'fixtures')]) {
    try { readFileSync(path.join(d, 'START_RESPONSE.example.json')); return d; } catch { /* try next */ }
  }
  return null;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const d = process.env.MICROFIRE_M2_FIXTURE_GALLERY === '1' ? dir() : null;
  if (!d) notFound();
  const read = <T,>(name: string): T => JSON.parse(readFileSync(path.join(d, `${name}.example.json`), 'utf8')) as T;
  const snap = (name: string): Snapshot => { const x = read<{ data: Snapshot | DomainResult }>(name).data; return 'snapshot' in x ? x.snapshot : x; };
  const dom = (name: string) => read<{ data: DomainResult }>(name).data;
  const refused = (name: string) => { const r = dom(name); if (r.ok) throw new Error(`${name} is not a refusal`); return r; };
  const fail = (name: string) => read<HttpFailure>(name);
  const wrongDx = snap('WRONG_DIAGNOSIS_RESPONSE').training.lastWrongDiagnosis!;
  const scenarios: Scenario[] = [
    { id: 'arrival', group: 'Stages', title: 'Station arrival', snapshot: snap('START_RESPONSE'), sources: ['START_RESPONSE'] },
    { id: 'assembly-refused', group: 'Stages', title: 'Assembly · wrong mount', snapshot: snap('WRONG_ANCHOR_RESPONSE'),
      event: { kind: 'refused', action: read<ActionRequest>('WRONG_ANCHOR_REQUEST').action, result: refused('WRONG_ANCHOR_RESPONSE') }, sources: ['WRONG_ANCHOR_REQUEST', 'WRONG_ANCHOR_RESPONSE'] },
    { id: 'fault', group: 'Stages', title: 'Training fault introduced', snapshot: snap('FAULT_INJECTED_RESPONSE'),
      event: { kind: 'accepted', action: null, before: snap('WRONG_ANCHOR_RESPONSE') }, sources: ['FAULT_INJECTED_RESPONSE', 'WRONG_ANCHOR_RESPONSE (earlier state)'] },
    { id: 'qualify-early', group: 'Stages', title: 'Qualification refused · repair required', snapshot: snap('QUALIFICATION_REPAIR_REQUIRED_RESPONSE'),
      event: { kind: 'refused', action: { type: 'GAME', action: { type: 'QUALIFY_INSTRUMENT' } }, result: refused('QUALIFICATION_REPAIR_REQUIRED_RESPONSE') }, sources: ['QUALIFICATION_REPAIR_REQUIRED_RESPONSE'] },
    { id: 'diagnostic-refused', group: 'Stages', title: 'Diagnosis refused · check not run', snapshot: snap('DIAGNOSTIC_ERROR'),
      event: { kind: 'refused', action: { type: 'SUBMIT_DIAGNOSIS', partId: 'fan', faultCode: 'REVERSED' }, result: refused('DIAGNOSTIC_ERROR') }, sources: ['DIAGNOSTIC_ERROR'] },
    { id: 'diagnostic', group: 'Stages', title: 'Diagnostic investigation · current check', snapshot: snap('DIAGNOSTIC_SUCCESS'),
      event: { kind: 'accepted', action: read<ActionRequest>('DIAGNOSTIC_REQUEST').action, before: snap('FAULT_INJECTED_RESPONSE') }, sources: ['DIAGNOSTIC_REQUEST', 'DIAGNOSTIC_SUCCESS'] },
    { id: 'diagnosis-wrong', group: 'Stages', title: 'Diagnosis · wrong answer coaching', snapshot: snap('WRONG_DIAGNOSIS_RESPONSE'),
      event: { kind: 'accepted', action: { type: 'SUBMIT_DIAGNOSIS', partId: wrongDx.partId, faultCode: wrongDx.faultCode }, before: snap('DIAGNOSTIC_SUCCESS'), feedback: dom('WRONG_DIAGNOSIS_RESPONSE').ok ? (dom('WRONG_DIAGNOSIS_RESPONSE') as Extract<DomainResult, { ok: true }>).feedback ?? null : null },
      sources: ['WRONG_DIAGNOSIS_RESPONSE'] },
    { id: 'repair-a', group: 'Stages', title: 'Repair pending · history A (removed r13)', snapshot: snap('PENDING_REPAIR_A'), sources: ['PENDING_REPAIR_A'] },
    { id: 'repair-b', group: 'Stages', title: 'Repair pending · history B (removed r15)', snapshot: snap('PENDING_REPAIR_B'), sources: ['PENDING_REPAIR_B'] },
    { id: 'passport-review', group: 'Stages', title: 'B20 observation → Passport review', snapshot: snap('PASSPORT_REVIEW_RESPONSE'),
      event: { kind: 'accepted', action: read<ActionRequest>('OBSERVATION_REQUEST').action, before: null }, sources: ['OBSERVATION_REQUEST', 'PASSPORT_REVIEW_RESPONSE'] },
    { id: 'complete', group: 'Stages', title: 'Mission complete', snapshot: snap('COMPLETE_RESPONSE'), sources: ['COMPLETE_RESPONSE'] },
    { id: 'resumed', group: 'Stages', title: 'Resumed after server restart', snapshot: snap('RESUME_AFTER_RESTART_RESPONSE'), sources: ['RESUME_AFTER_RESTART_RESPONSE'] },
    { id: 'rate-limited', group: 'Recovery', title: '429 · request budget (run the check)', snapshot: snap('FAULT_INJECTED_RESPONSE'), reply: { status: 429, failure: fail('RATE_LIMITED_RESPONSE'), retryAfterMs: 45_000 }, sources: ['FAULT_INJECTED_RESPONSE', 'RATE_LIMITED_RESPONSE'] },
    { id: 'unknown', group: 'Recovery', title: 'Timeout · outcome unknown (run the check)', snapshot: snap('FAULT_INJECTED_RESPONSE'), reply: { unknown: 'timeout' }, sources: ['FAULT_INJECTED_RESPONSE'] },
    { id: 'conflict', group: 'Recovery', title: '409 · revision conflict (run the check)', snapshot: snap('FAULT_INJECTED_RESPONSE'), reply: { status: 409, failure: fail('REVISION_CONFLICT_RESPONSE') }, sources: ['FAULT_INJECTED_RESPONSE', 'REVISION_CONFLICT_RESPONSE'] },
    { id: 'runtime-changed', group: 'Recovery', title: '409 · server restarted (run the check)', snapshot: snap('PENDING_REPAIR_A'), reply: { status: 409, failure: fail('RUNTIME_CHANGED_RESPONSE') }, sources: ['PENDING_REPAIR_A', 'RUNTIME_CHANGED_RESPONSE'] },
    { id: 'key-failure', group: 'Recovery', title: 'Checkpoint key unavailable (run the check)', snapshot: snap('PENDING_REPAIR_A'), reply: { status: 400, failure: fail('CHECKPOINT_KEY_FAILURE_RESPONSE') }, sources: ['PENDING_REPAIR_A', 'CHECKPOINT_KEY_FAILURE_RESPONSE'] },
    { id: 'command-reused', group: 'Recovery', title: 'Request identity defect (run the check)', snapshot: snap('PENDING_REPAIR_A'), reply: { status: 409, failure: fail('COMMAND_REUSED_RESPONSE') }, sources: ['PENDING_REPAIR_A', 'COMMAND_REUSED_RESPONSE'] },
    { id: 'note-invalid', group: 'Recovery', title: 'Learner note rejected (add a note)', snapshot: snap('PASSPORT_REVIEW_RESPONSE'), reply: { status: 400, failure: fail('NOTE_INVALID_RESPONSE') }, sources: ['PASSPORT_REVIEW_RESPONSE', 'NOTE_INVALID_RESPONSE'] },
    { id: 'unauthorized', group: 'Access', title: 'Access expired mid-case (run the check)', snapshot: snap('PENDING_REPAIR_A'), reply: { status: 403, failure: fail('UNAUTHORIZED_RESPONSE') }, sources: ['PENDING_REPAIR_A', 'UNAUTHORIZED_RESPONSE'] },
    { id: 'authorize', group: 'Access', title: 'Operator authorization', snapshot: null, link: { status: 'authorization-required', reason: 'initial' }, sources: ['CAPABILITY_RESPONSE'] },
    { id: 'start', group: 'Access', title: 'Start or resume a case', snapshot: null, link: { status: 'ready' }, sources: ['AUTHORIZE_RESPONSE'] },
    { id: 'not-integrated', group: 'Access', title: 'Backend not integrated', snapshot: null, link: { status: 'unavailable', reason: 'runtime-missing' }, sources: ['(no backend on this branch)'] },
    { id: 'save-busy', group: 'Saving', title: 'Save · another tab holds the lock', snapshot: snap('PENDING_REPAIR_A'), save: read<LocalSaveResult>('LOCAL_LOCK_BUSY_RESULT'), sources: ['LOCAL_LOCK_BUSY_RESULT'] },
    { id: 'save-failed', group: 'Saving', title: 'Save · read-back mismatch', snapshot: snap('PENDING_REPAIR_A'), save: read<LocalSaveResult>('LOCAL_WRITE_FAILED_RESULT'), sources: ['LOCAL_WRITE_FAILED_RESULT'] }
  ];
  const current = (await searchParams).scenario ?? 'arrival';
  return <FixtureGallery scenarios={scenarios} current={current} data={{ parts: partSpecs(), b20: b20Data() }} />;
}
