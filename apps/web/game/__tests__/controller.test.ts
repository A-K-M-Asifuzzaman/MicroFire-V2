import { expect, test, vi } from 'vitest';
import type { DomainResult, Snapshot } from '../contract';
import { checkpointReceipt, createController, type SaveAdapter } from '../controller';
import type { PreviewTransport, TransportResult } from '../transport';
import { domain, failure, fx, local, snap } from './fixtures';

// Contract-fixture tests of the controller's recovery semantics. The transport is a scripted test double; the
// identity function is a stub (the real one is Sol's shared requestIdentity, never reimplemented in the frontend).
const ok = <T>(data: T): TransportResult<T> => ({ kind: 'ok', data });
const fail = (status: number, name: string, retryAfterMs: number | null = null) => ({ kind: 'failure' as const, status, failure: failure(name), retryAfterMs });

function rigged(seed?: Snapshot) {
  const script: Record<keyof PreviewTransport, TransportResult<unknown>[]> = { capability: [], authorize: [], revoke: [], start: [], action: [], resume: [], session: [] };
  const calls: { endpoint: keyof PreviewTransport; body: unknown }[] = [];
  const next = (k: keyof PreviewTransport) => async (body?: unknown) => {
    calls.push({ endpoint: k, body });
    const r = script[k].shift();
    if (!r) throw new Error(`unscripted ${k}`);
    return r as never;
  };
  const transport: PreviewTransport = { capability: next('capability'), authorize: next('authorize'), revoke: next('revoke'),
    start: next('start'), action: next('action'), resume: next('resume'), session: next('session') };
  let t = 1_000_000;
  const waits: number[] = [];
  const identify = vi.fn(async (_e: string, req: object) => (JSON.stringify(req).length.toString(16).padStart(64, '0')));
  const c = createController({ transport, identify, now: () => t, wait: async (ms) => { waits.push(ms); t += ms; },
    uuid: () => '11111111-1111-4111-8111-111111111111', ...(seed ? { seed: { snapshot: seed } } : {}) });
  return { c, script, calls, waits, identify, advance: (ms: number) => { t += ms; } };
}

test('boot: preview disabled is reported as unavailable, a required grant asks for authorization', async () => {
  const a = rigged();
  a.script.capability.push({ kind: 'failure', status: 404, failure: null, retryAfterMs: null });
  await a.c.boot();
  expect(a.c.getState().link).toEqual({ status: 'unavailable', reason: 'disabled' });
  const b = rigged();
  b.script.capability.push(ok(fx<{ data: unknown }>('CAPABILITY_RESPONSE').data));
  await b.c.boot();
  expect(b.c.getState().link).toEqual({ status: 'authorization-required', reason: 'initial' });
});

test('authorize then start: one exact start request with its command identity; snapshot confirmed', async () => {
  const { c, script, calls } = rigged();
  script.capability.push(ok(fx<{ data: unknown }>('CAPABILITY_RESPONSE').data));
  script.authorize.push(ok(fx<{ data: unknown }>('AUTHORIZE_RESPONSE').data));
  script.start.push(ok(snap('START_RESPONSE')));
  await c.boot(); await c.authorize('operator-token'); await c.start();
  const start = calls.find((x) => x.endpoint === 'start')!.body as Record<string, unknown>;
  expect(start).toMatchObject({ runtimeId: '33333333-3333-4333-8333-333333333333', sessionId: '11111111-1111-4111-8111-111111111111', previewId: 'bass-b20-training-v1', mode: 'demo' });
  expect(start.commandId).toMatch(/^[0-9a-f]{64}$/);
  expect(c.getState().snapshot?.revision).toBe(0);
  expect(c.getState().link.status).toBe('confirmed');
});

test('domain refusal keeps the confirmed rig and shows the readable server message', async () => {
  const { c, script } = rigged(snap('WRONG_ANCHOR_RESPONSE'));
  script.action.push(ok(domain('WRONG_ANCHOR_RESPONSE')));
  await c.send({ type: 'GAME', action: { type: 'INSTALL_PART', partId: 'fan', anchorId: 'duct-exit', orientation: 'correct' } }, 'Install Fan at Duct outlet');
  const s = c.getState();
  expect(s.event).toMatchObject({ kind: 'refused', code: 'WRONG_ANCHOR', message: 'The fan fits at the duct inlet. Choose that mount before installing it.' });
  expect(s.snapshot?.revision).toBe(5);
  expect(s.link.status).toBe('confirmed');
});

test('preview POSTs are paced at least 2.1 s apart (N7)', async () => {
  const { c, script, waits } = rigged(snap('FAULT_INJECTED_RESPONSE'));
  script.action.push(ok(domain('DIAGNOSTIC_SUCCESS')));
  script.action.push(ok({ ...domain('WRONG_DIAGNOSIS_RESPONSE') }));
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  await c.send({ type: 'SUBMIT_DIAGNOSIS', partId: 'radiometer', faultCode: 'MISSING' }, 'Diagnose');
  expect(waits).toEqual([2100]);
  expect(c.getState().event).toMatchObject({ kind: 'accepted', feedback: { correct: false } });
});

test('429: waits Retry-After, re-reads, then resends the identical request', async () => {
  const { c, script, calls, waits } = rigged(snap('FAULT_INJECTED_RESPONSE'));
  script.action.push(fail(429, 'RATE_LIMITED_RESPONSE', 4000));
  script.session.push(ok(snap('FAULT_INJECTED_RESPONSE')));
  script.action.push(ok(domain('DIAGNOSTIC_SUCCESS')));
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  await vi.waitFor(() => expect(c.getState().snapshot?.revision).toBe(15));
  const sent = calls.filter((x) => x.endpoint === 'action').map((x) => x.body);
  expect(sent).toHaveLength(2);
  expect(sent[0]).toEqual(sent[1]); // same command identity, never regenerated
  expect(waits).toContain(4000);
});

test('unknown outcome, not applied: reconcile holds the same request; retry resends it verbatim', async () => {
  const { c, script, calls } = rigged(snap('FAULT_INJECTED_RESPONSE'));
  script.action.push({ kind: 'unknown', reason: 'timeout' });
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  expect(c.getState().link.status).toBe('outcome-unknown');
  script.session.push(ok(snap('FAULT_INJECTED_RESPONSE')));
  await c.reconcile();
  expect(c.getState().held?.label).toBe('Run the Training check');
  script.action.push(ok(domain('DIAGNOSTIC_SUCCESS')));
  await c.retryHeld();
  const sent = calls.filter((x) => x.endpoint === 'action').map((x) => x.body);
  expect(sent[0]).toEqual(sent[1]);
  expect(c.getState().snapshot?.revision).toBe(15);
});

test('unknown outcome, applied: the server receipt identifies our command', async () => {
  const request = fx<{ commandId: string }>('DIAGNOSTIC_REQUEST');
  const after = snap('DIAGNOSTIC_SUCCESS');
  expect(checkpointReceipt(after.checkpoint)).toBe(request.commandId);
  const { c, script, identify } = rigged(snap('FAULT_INJECTED_RESPONSE'));
  identify.mockResolvedValueOnce(request.commandId);
  script.action.push({ kind: 'unknown', reason: 'network' });
  script.session.push(ok(after));
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  await c.reconcile();
  expect(c.getState().notice?.text).toMatch(/applied/);
  expect(c.getState().event).toMatchObject({ kind: 'accepted' });
  expect(c.getState().held).toBeNull();
});

test('409 stale: conflict with the server revision, no automatic recast; refresh adopts the server head', async () => {
  const { c, script, calls } = rigged(snap('FAULT_INJECTED_RESPONSE'));
  script.action.push(fail(409, 'REVISION_CONFLICT_RESPONSE'));
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  expect(c.getState().link).toEqual({ status: 'conflict', code: 'STALE_SESSION', currentRevision: 19 });
  expect(c.getState().held).toBeNull();
  script.session.push(ok(snap('PENDING_REPAIR_A')));
  await c.refresh();
  expect(c.getState().snapshot?.revision).toBe(19);
  expect(calls.filter((x) => x.endpoint === 'action')).toHaveLength(1);
});

test('runtime change, unauthorized, invalid note and untrusted checkpoint each get their own recovery state', async () => {
  const a = rigged(snap('PENDING_REPAIR_A'));
  a.script.action.push(fail(409, 'RUNTIME_CHANGED_RESPONSE'));
  await a.c.send({ type: 'RUN_DIAGNOSTIC' }, 'x');
  expect(a.c.getState().link).toEqual({ status: 'runtime-changed', runtimeId: '66666666-6666-4666-8666-666666666666' });

  const b = rigged(snap('PENDING_REPAIR_A'));
  b.script.action.push(fail(403, 'UNAUTHORIZED_RESPONSE'));
  await b.c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  expect(b.c.getState().link.status).toBe('authorization-required');
  expect(b.c.getState().held?.label).toBe('Run the Training check'); // preserved, not lost

  const n = rigged(snap('PASSPORT_REVIEW_RESPONSE'));
  n.script.action.push(fail(400, 'NOTE_INVALID_RESPONSE'));
  await n.c.send({ type: 'ADD_LEARNER_NOTE', text: ' padded ' }, 'Add a learner note');
  expect(n.c.getState().link).toMatchObject({ status: 'request-rejected', noteIssue: 'outer-whitespace' });

  const k = rigged(snap('PENDING_REPAIR_A'));
  k.script.resume.push(fail(400, 'CHECKPOINT_KEY_FAILURE_RESPONSE'));
  await k.c.resume(snap('PENDING_REPAIR_A').checkpoint);
  expect(k.c.getState().link).toMatchObject({ status: 'recovery-required', code: 'CHECKPOINT_KEY_UNAVAILABLE' });

  const r = rigged(snap('PENDING_REPAIR_A'));
  r.script.action.push(fail(409, 'COMMAND_REUSED_RESPONSE'));
  await r.c.send({ type: 'RUN_DIAGNOSTIC' }, 'x');
  expect(r.c.getState().link).toMatchObject({ status: 'recovery-required', code: 'COMMAND_ID_REUSED' });
});

test('an older or forked snapshot never replaces a newer confirmed one', async () => {
  const { c, script } = rigged(snap('PENDING_REPAIR_A'));
  script.action.push(ok({ ok: true, snapshot: snap('DIAGNOSTIC_SUCCESS') } satisfies DomainResult));
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'x');
  expect(c.getState().link).toMatchObject({ status: 'conflict', code: 'OUT_OF_ORDER' });
  expect(c.getState().snapshot?.revision).toBe(19);
});

test('saves: read-only by default; busy and write-failed results are reported, never as Saved', async () => {
  const { c } = rigged(snap('PENDING_REPAIR_A'));
  await c.save();
  expect(c.getState().save).toMatchObject({ capability: 'read-only', result: { code: 'LOCAL_READ_ONLY' }, saved: null });
  for (const name of ['LOCAL_LOCK_BUSY_RESULT', 'LOCAL_WRITE_FAILED_RESULT']) {
    const adapter: SaveAdapter = { capability: 'writable', save: async () => local(name) };
    const x = createController({ transport: {} as PreviewTransport, identify: async () => '', save: adapter, seed: { snapshot: snap('PENDING_REPAIR_A') } });
    await x.save();
    expect(x.getState().save.saved).toBeNull();
    expect(x.getState().save.result).toEqual(local(name));
  }
});

test('fixture gallery transport: intents are logged and nothing changes', async () => {
  const before = snap('FAULT_INJECTED_RESPONSE');
  const transport = { action: async () => ({ kind: 'not-sent' as const }) } as unknown as PreviewTransport;
  const c = createController({ transport, identify: async () => '0'.repeat(64), mode: 'fixture', minPostGapMs: 0, seed: { snapshot: before } });
  await c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check');
  expect(c.getState().snapshot).toBe(before);
  expect(c.getState().intents.map((i) => i.label)).toEqual(['Run the Training check']);
  expect(c.getState().notice?.text).toMatch(/not sent/);
});
