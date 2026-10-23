import type {
  ActionRequest, ContractRuntime, DisplayFault, DomainResult, HttpCode, LocalSaveResult, NoteIssue, ResumeRequest, Snapshot, StartRequest, TrainingAction
} from './contract';
import type { PreviewTransport, TransportResult } from './transport';

// One gameplay controller for the 2D schematic and the 3D bench. It holds only server-confirmed state; the views
// render it and send intents. It never decides placement, repair, qualification or evidence.

export type Pending =
  | { endpoint: 'start'; request: StartRequest; label: string }
  | { endpoint: 'action'; request: ActionRequest; label: string }
  | { endpoint: 'resume'; request: ResumeRequest; label: string };

export type Link =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'unavailable'; reason: 'disabled' | 'unreachable' | 'runtime-missing' }
  | { status: 'authorization-required'; reason: 'initial' | 'expired' | 'denied' | 'token-rejected' | 'capacity' | 'unreachable' }
  | { status: 'authorizing' }
  /** Authorized, no case loaded yet. */
  | { status: 'ready' }
  | { status: 'confirmed' }
  | { status: 'submitting'; pending: Pending }
  | { status: 'awaiting'; pending: Pending }
  | { status: 'paced'; pending: Pending; until: number; cause: 'local-pacing' | 'rate-limited' | 'capacity' }
  | { status: 'outcome-unknown'; pending: Pending; reason: 'timeout' | 'network' | 'server-error' | 'malformed' }
  | { status: 'reconciling'; pending: Pending }
  | { status: 'conflict'; code: 'STALE_SESSION' | 'CASE_ID_REUSED' | 'OUT_OF_ORDER'; currentRevision: number | null }
  | { status: 'runtime-changed'; runtimeId: string | null }
  | { status: 'session-lost' }
  | { status: 'recovery-required'; code: HttpCode | 'UNEXPECTED'; message: string }
  | { status: 'request-rejected'; code: HttpCode | 'UNEXPECTED'; message: string; noteIssue: NoteIssue | null; label: string };

export type GameEvent =
  | { id: number; kind: 'accepted'; label: string; action: TrainingAction | null; before: Snapshot | null; after: Snapshot; feedback: { correct: boolean; hint: string } | null }
  | { id: number; kind: 'refused'; label: string; action: TrainingAction | null; code: string; message: string; faults: DisplayFault[] };

export interface SaveAdapter {
  /** 'writable' only after this engine passed the approved cross-process storage consistency gate. */
  readonly capability: 'writable' | 'read-only';
  save(head: { sessionId: string; revision: number; checkpoint: string }): Promise<LocalSaveResult>;
}
/** The approved default until an engine passes the consistency gate: no browser write, raw download instead. */
export const readOnlySaveAdapter: SaveAdapter = {
  capability: 'read-only',
  save: async () => ({ ok: false, code: 'LOCAL_READ_ONLY', savedOnDevice: false })
};
export type SaveState = { capability: 'writable' | 'read-only'; busy: boolean; result: LocalSaveResult | null; saved: { sessionId: string; revision: number } | null };
export type Notice = { tone: 'info' | 'warn'; text: string };
export type IntentRecord = { n: number; endpoint: Pending['endpoint']; label: string; body: unknown };

export type ControllerState = {
  mode: 'live' | 'fixture';
  link: Link;
  snapshot: Snapshot | null;
  runtimeId: string | null;
  grantExpiresAt: string | null;
  event: GameEvent | null;
  /** A request the server did not apply; it may be sent again verbatim (same command identity). */
  held: Pending | null;
  notice: Notice | null;
  save: SaveState;
  intents: IntentRecord[];
};

export type ControllerDeps = {
  transport: PreviewTransport;
  identify: ContractRuntime['identify'];
  save?: SaveAdapter;
  mode?: 'live' | 'fixture';
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  uuid?: () => string;
  /** N7: preview POST starts are at least 2.1 s apart, so the shared 30/min budget is not exhausted by play. */
  minPostGapMs?: number;
  seed?: Partial<Pick<ControllerState, 'snapshot' | 'runtimeId' | 'event' | 'link' | 'grantExpiresAt'>>;
};

export type GameController = ReturnType<typeof createController>;
const ACTIVE: ReadonlySet<Link['status']> = new Set(['checking', 'authorizing', 'submitting', 'awaiting', 'paced', 'reconciling']);
export const isBusy = (link: Link) => ACTIVE.has(link.status);

/** Display/reconcile only: reads the receipt the server embedded in its signed token. Trust stays on the server. */
export function checkpointReceipt(token: string): string | null {
  try {
    const body = token.split('.')[0] ?? '';
    const bin = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as { lastCommand?: { commandId?: unknown } };
    return typeof json.lastCommand?.commandId === 'string' ? json.lastCommand.commandId : null;
  } catch { return null; }
}

export function createController(deps: ControllerDeps) {
  const now = deps.now ?? (() => Date.now());
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const uuid = deps.uuid ?? (() => crypto.randomUUID());
  const gap = deps.minPostGapMs ?? 2100;
  const saver = deps.save ?? readOnlySaveAdapter;
  let state: ControllerState = {
    mode: deps.mode ?? 'live', link: deps.seed?.link ?? (deps.seed?.snapshot ? { status: 'confirmed' } : { status: 'idle' }),
    snapshot: deps.seed?.snapshot ?? null, runtimeId: deps.seed?.runtimeId ?? deps.seed?.snapshot?.runtimeId ?? null,
    grantExpiresAt: deps.seed?.grantExpiresAt ?? deps.seed?.snapshot?.access.expiresAt ?? null,
    event: deps.seed?.event ?? null, held: null, notice: null,
    save: { capability: saver.capability, busy: false, result: null, saved: null }, intents: []
  };
  const listeners = new Set<() => void>();
  let lastPostAt = -Infinity, eventId = state.event?.id ?? 0, intentNo = 0;
  const set = (patch: Partial<ControllerState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
  const settled = (): Link => (state.snapshot ? { status: 'confirmed' } : state.runtimeId ? { status: 'ready' } : { status: 'idle' });
  /** After (re)authorization: a case from an older server runtime must be explicitly resumed, never replayed. */
  const authorized = (runtimeId: string): Link =>
    state.snapshot && state.snapshot.runtimeId !== runtimeId ? { status: 'runtime-changed', runtimeId } : settled();

  async function paced<T>(pending: Pending | null, run: () => Promise<T>): Promise<T> {
    const delay = lastPostAt + gap - now();
    if (delay > 0) {
      if (pending) set({ link: { status: 'paced', pending, until: now() + delay, cause: 'local-pacing' } });
      await wait(delay);
    }
    lastPostAt = now();
    return run();
  }

  /** Accept a server snapshot unless it would move the case backwards or fork it at the same revision. */
  function accept(next: Snapshot): boolean {
    const cur = state.snapshot;
    if (cur && cur.sessionId === next.sessionId && cur.runtimeId === next.runtimeId &&
      (next.revision < cur.revision || (next.revision === cur.revision && next.checkpoint !== cur.checkpoint))) {
      set({ link: { status: 'conflict', code: 'OUT_OF_ORDER', currentRevision: cur.revision } });
      return false;
    }
    set({ snapshot: next, runtimeId: next.runtimeId, grantExpiresAt: next.access.expiresAt });
    return true;
  }
  function emit(e: Omit<Extract<GameEvent, { kind: 'accepted' }>, 'id'> | Omit<Extract<GameEvent, { kind: 'refused' }>, 'id'>) {
    set({ event: { ...e, id: ++eventId } as GameEvent });
  }
  const actionOf = (p: Pending) => (p.endpoint === 'action' ? p.request.action : null);

  async function autosave() {
    if (saver.capability === 'writable') await save();
  }

  function handleFailure(p: Pending | null, r: Extract<TransportResult<unknown>, { kind: 'failure' }>) {
    const code = r.failure?.error.code ?? null, message = r.failure?.error.message ?? `The local preview server answered ${r.status}.`;
    if (r.status === 403) {
      const expired = state.grantExpiresAt !== null && Date.parse(state.grantExpiresAt) <= now();
      set({ held: p, link: { status: 'authorization-required', reason: expired ? 'expired' : 'denied' } });
    } else if ((r.status === 429 || r.status === 503) && p) {
      const ms = r.retryAfterMs ?? 10_000;
      set({ link: { status: 'paced', pending: p, until: now() + ms, cause: r.status === 429 ? 'rate-limited' : 'capacity' } });
      void wait(ms).then(() => retryAfterWait(p));
    } else if (code === 'STALE_SESSION' || code === 'CASE_ID_REUSED') {
      set({ held: null, link: { status: 'conflict', code, currentRevision: r.failure?.error.context?.currentRevision ?? null } });
    } else if (code === 'RUNTIME_CHANGED') {
      set({ held: null, link: { status: 'runtime-changed', runtimeId: r.failure?.error.context?.runtimeId ?? null } });
    } else if (code === 'SESSION_NOT_FOUND') {
      set({ held: null, link: { status: 'session-lost' } });
    } else if (r.status === 400 && (code === 'INVALID_REQUEST' || code === null) || r.status === 413 || r.status === 415) {
      set({ held: null, link: { status: 'request-rejected', code: code ?? 'UNEXPECTED', message, noteIssue: r.failure?.error.noteIssue ?? null, label: p?.label ?? '' } });
    } else {
      // Untrusted/unsupported checkpoint, unavailable key, dataset mismatch, identity defect: preserve everything, no retry.
      set({ held: null, link: { status: 'recovery-required', code: code ?? 'UNEXPECTED', message } });
    }
  }

  let locked = false;
  /** One write at a time, including the identity hash before it; extra clicks are ignored, never queued. */
  async function once(run: () => Promise<void>) {
    if (locked) return;
    locked = true;
    try { await run(); } finally { locked = false; }
  }

  async function dispatch(p: Pending) {
    const body = p.request;
    set({ intents: [...state.intents, { n: ++intentNo, endpoint: p.endpoint, label: p.label, body }].slice(-20), notice: null, held: null });
    const r = await paced<TransportResult<Snapshot | DomainResult>>(p, () => {
      set({ link: { status: 'awaiting', pending: p } });
      return p.endpoint === 'start' ? deps.transport.start(p.request)
        : p.endpoint === 'resume' ? deps.transport.resume(p.request)
          : deps.transport.action(p.request);
    });
    if (r.kind === 'not-sent') { set({ link: settled(), notice: { tone: 'info', text: 'Fixture gallery: this intent was recorded, not sent. Nothing changed.' } }); return; }
    if (r.kind === 'unknown') { set({ link: { status: 'outcome-unknown', pending: p, reason: r.reason } }); return; }
    if (r.kind === 'failure') { handleFailure(p, r); return; }
    const before = state.snapshot;
    if (p.endpoint !== 'action') {
      if (accept(r.data as Snapshot)) { set({ link: { status: 'confirmed' } }); emit({ kind: 'accepted', label: p.label, action: null, before, after: r.data as Snapshot, feedback: null }); void autosave(); }
      return;
    }
    const d = r.data as DomainResult;
    if (!accept(d.snapshot)) return;
    set({ link: { status: 'confirmed' } });
    if (d.ok) { emit({ kind: 'accepted', label: p.label, action: actionOf(p), before, after: d.snapshot, feedback: d.feedback ?? null }); void autosave(); }
    else emit({ kind: 'refused', label: p.label, action: actionOf(p), code: d.code, message: d.message, faults: d.faults ?? [] });
  }

  /** After Retry-After: re-read first; resend the identical request only if the case has not moved on. */
  async function retryAfterWait(p: Pending) {
    if (state.link.status !== 'paced' || state.link.pending !== p) return;
    if (p.endpoint !== 'action') return dispatch(p);
    const r = await deps.transport.session(p.request.sessionId);
    if (r.kind === 'ok' && r.data.revision === p.request.expectedRevision) return dispatch(p);
    if (r.kind === 'ok') { accept(r.data); set({ link: settled(), notice: { tone: 'warn', text: 'The case changed while you waited, so your last action was not sent. Review the current state.' } }); return; }
    set({ link: settled(), held: p, notice: { tone: 'warn', text: 'Could not re-read the case. Your action is held; send it again when ready.' } });
  }

  async function save() {
    const s = state.snapshot;
    if (!s || state.save.busy) return;
    set({ save: { ...state.save, busy: true } });
    let result: LocalSaveResult;
    try { result = await saver.save({ sessionId: s.sessionId, revision: s.revision, checkpoint: s.checkpoint }); }
    catch { result = { ok: false, code: 'LOCAL_WRITE_FAILED', cause: 'permission', writeOutcome: 'unknown', savedOnDevice: false }; }
    set({ save: { ...state.save, busy: false, result, saved: result.ok ? { sessionId: s.sessionId, revision: s.revision } : state.save.saved } });
  }

  return {
    getState: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },

    async boot() {
      set({ link: { status: 'checking' } });
      const r = await deps.transport.capability();
      if (r.kind === 'ok') {
        set({ runtimeId: r.data.runtimeId, grantExpiresAt: r.data.grant.status === 'valid' ? r.data.grant.expiresAt : null,
          link: r.data.grant.status === 'valid' ? authorized(r.data.runtimeId) : { status: 'authorization-required', reason: 'initial' } });
      } else if (r.kind === 'not-sent') set({ link: settled() });
      else set({ link: { status: 'unavailable', reason: r.kind === 'failure' && r.status === 404 ? 'disabled' : 'unreachable' } });
    },

    /** The operator types the token; it is sent once and never stored. The server sets an HttpOnly grant cookie. */
    async authorize(approvalToken: string) {
      set({ link: { status: 'authorizing' } });
      const r = await paced(null, () => deps.transport.authorize(approvalToken));
      if (r.kind === 'ok') {
        set({ runtimeId: r.data.runtimeId, grantExpiresAt: r.data.expiresAt, link: authorized(r.data.runtimeId) });
      } else if (r.kind === 'failure') set({ link: { status: 'authorization-required', reason: r.status === 503 ? 'capacity' : r.status === 403 ? 'token-rejected' : 'unreachable' } });
      else if (r.kind === 'not-sent') set({ link: settled() });
      else set({ link: { status: 'authorization-required', reason: 'unreachable' } });
    },

    async revoke() {
      await paced(null, () => deps.transport.revoke());
      set({ grantExpiresAt: null, link: { status: 'authorization-required', reason: 'initial' } });
    },

    /** Deliberate new case: one fresh session UUID, retained with its exact request until resolved. */
    start: () => once(async () => {
      if (!state.runtimeId || isBusy(state.link)) return;
      const request = { runtimeId: state.runtimeId, sessionId: uuid(), previewId: 'bass-b20-training-v1' as const, mode: 'demo' as const };
      await dispatch({ endpoint: 'start', label: 'Start a new training case', request: { ...request, commandId: await deps.identify('start', request) } });
    }),

    /** Resume a signed checkpoint (in-memory or a downloaded file) in the current runtime. */
    resume: (checkpoint: string) => once(async () => {
      if (!state.runtimeId || isBusy(state.link)) return;
      const request = { runtimeId: state.runtimeId, checkpoint: checkpoint.trim() };
      await dispatch({ endpoint: 'resume', label: 'Resume the saved checkpoint', request: { ...request, commandId: await deps.identify('resume', request) } });
    }),

    send: (action: TrainingAction, label: string) => once(async () => {
      const s = state.snapshot;
      if (!s || state.link.status !== 'confirmed') return;
      const request = { runtimeId: s.runtimeId, sessionId: s.sessionId, expectedRevision: s.revision, action };
      await dispatch({ endpoint: 'action', label, request: { ...request, commandId: await deps.identify('action', request) } });
    }),

    /** Unknown commit: re-read the case and decide from the server's own receipt; never guess. */
    async reconcile() {
      if (state.link.status !== 'outcome-unknown') return;
      const p = state.link.pending;
      set({ link: { status: 'reconciling', pending: p } });
      const sessionId = p.endpoint === 'resume' ? state.snapshot?.sessionId : p.request.sessionId;
      if (p.endpoint === 'resume' || !sessionId) { set({ held: p, link: settled(), notice: { tone: 'info', text: 'Resume is safe to repeat with the same checkpoint.' } }); return; }
      const r = await deps.transport.session(sessionId);
      if (r.kind === 'failure' && r.status === 404 && p.endpoint === 'start') { set({ held: p, link: settled(), notice: { tone: 'info', text: 'The case was not created. You can send the same start request again.' } }); return; }
      if (r.kind === 'failure') { handleFailure(null, r); return; }
      if (r.kind !== 'ok') { set({ link: { status: 'outcome-unknown', pending: p, reason: r.kind === 'unknown' ? r.reason : 'network' } }); return; }
      const before = state.snapshot, expected = p.endpoint === 'action' ? p.request.expectedRevision : -1;
      if (p.endpoint === 'action' && r.data.revision === expected) {
        accept(r.data); set({ held: p, link: { status: 'confirmed' }, notice: { tone: 'info', text: 'Your last action was not applied. You can send exactly the same request again.' } });
        return;
      }
      if (!accept(r.data)) return;
      const ours = checkpointReceipt(r.data.checkpoint) === p.request.commandId && r.data.revision === expected + 1;
      set({ link: { status: 'confirmed' }, notice: ours || p.endpoint === 'start'
        ? { tone: 'info', text: 'Your last action was applied by the server.' }
        : { tone: 'warn', text: 'The case changed elsewhere; your last action was not resent. Review the current state.' } });
      if (ours || p.endpoint === 'start') emit({ kind: 'accepted', label: p.label, action: actionOf(p), before, after: r.data, feedback: null });
    },

    /** Send a held (not-applied) request again, verbatim, only if the case is still where it was. */
    retryHeld: () => once(async () => {
      const p = state.held;
      if (!p || isBusy(state.link)) return;
      if (p.endpoint === 'action' && state.snapshot?.revision !== p.request.expectedRevision) {
        set({ held: null, notice: { tone: 'warn', text: 'The case has moved on, so the held action was discarded rather than resent at a new revision.' } });
        return;
      }
      await dispatch(p);
    }),
    discardHeld: () => set({ held: null }),

    async refresh() {
      const s = state.snapshot;
      if (!s) return;
      const r = await deps.transport.session(s.sessionId);
      if (r.kind === 'ok') {
        // A conflict is resolved by adopting the server's current head, even when the local copy was newer.
        if (state.link.status === 'conflict') set({ snapshot: null });
        if (accept(r.data)) set({ link: { status: 'confirmed' } });
      } else if (r.kind === 'failure') handleFailure(null, r);
      else if (r.kind === 'unknown') set({ notice: { tone: 'warn', text: 'Could not reach the local preview server. Your confirmed progress is still shown.' } });
    },

    acknowledge: () => set({ link: settled(), notice: null }),
    expire() { if (state.link.status === 'confirmed' || state.link.status === 'ready') set({ link: { status: 'authorization-required', reason: 'expired' } }); },
    save
  };
}
