// Visitor-side controller for public-campaign-v1. One write in flight; the CSRF proof lives only in this object's
// memory; a reload bootstraps again and the server recovers the same durable case. Nothing here decides progression:
// views, feedback and refusals are shown exactly as the server returned them.
import type { CampaignAction } from '@microfire/shared';
import { commandFor, type ActionResult, type PassportExport, type Problem, type PublicTransport, type PublicView, type Result } from './public-transport';

export type Phase = 'booting' | 'ready' | 'sending' | 'expired' | 'missing' | 'disabled' | 'unavailable' | 'rate-limited';

export type State = {
  phase: Phase; view: PublicView | null; expiresAt: string | null;
  /** The server's answer to the latest learner intent (accepted with feedback, or a domain refusal). */
  last: { action: CampaignAction; result: ActionResult } | null;
  notice: string | null; retryAt: number | null; canRetry: boolean;
};

const AUTO_RETRIES = 2;

export function createPublicController(transport: PublicTransport, { sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  let csrf: string | null = null;
  let pending: { bytes: string; action: CampaignAction; expectedRevision: number } | null = null;
  let state: State = { phase: 'booting', view: null, expiresAt: null, last: null, notice: null, retryAt: null, canRetry: false };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

  function adopt(view: PublicView, notice: string | null = null) {
    const prev = state.view;
    if (prev && prev.runtimeId !== view.runtimeId) notice = 'MicroFire was updated since your last action. Your case was reloaded from the server; choose your next step again.';
    set({ view, notice, last: null });
  }

  function fail(problem: Problem, keepPending: boolean) {
    if (!keepPending) pending = null;
    switch (problem.kind) {
      case 'expired': csrf = null; pending = null; return set({ phase: 'expired', canRetry: false, notice: null });
      case 'missing': csrf = null; pending = null; return set({ phase: 'missing', canRetry: false, notice: null });
      case 'disabled': pending = null; return set({ phase: 'disabled', canRetry: false });
      case 'rate-limited': return set({ phase: 'rate-limited', retryAt: now() + problem.retryAfterMs, canRetry: true });
      case 'unavailable': case 'ambiguous': return set({ phase: 'unavailable', canRetry: true });
      case 'rejected': pending = null; return set({ phase: 'ready', canRetry: false, notice: `The server did not accept that request (HTTP ${problem.status}). Nothing changed.` });
      case 'conflict': return; // handled by reconcile()
    }
  }

  async function boot() {
    set({ phase: 'booting', notice: null, canRetry: false });
    const r = await transport.bootstrap();
    if (!r.ok) return fail(r.problem, false);
    csrf = r.data.csrfToken;
    adopt(r.data.view);
    set({ phase: 'ready', expiresAt: r.data.expiresAt, retryAt: null });
  }

  /** 409: another tab or an earlier request advanced the head. Show the server's head; never replay the old intent. */
  async function reconcile() {
    pending = null;
    const r = await transport.read();
    if (!r.ok) return fail(r.problem, false);
    adopt(r.data, 'Your case had already moved on (another tab or an earlier request). The latest saved state is shown; choose again.');
    set({ phase: 'ready', canRetry: false, retryAt: null });
  }

  async function send(): Promise<void> {
    if (!pending || !csrf) return;
    let r: Result<ActionResult> = { ok: false, problem: { kind: 'ambiguous' } };
    for (let attempt = 0; attempt <= AUTO_RETRIES; attempt++) {
      if (attempt) await sleep(400 * attempt);
      r = await transport.action(pending.bytes, csrf); // identical bytes, identity and revision on every attempt
      if (r.ok || r.problem.kind !== 'ambiguous') break;
    }
    if (!r.ok) {
      if (r.problem.kind === 'conflict') return reconcile();
      return fail(r.problem, ['rate-limited', 'unavailable', 'ambiguous'].includes(r.problem.kind));
    }
    const { action } = pending; pending = null;
    adopt(r.data.view);
    set({ phase: 'ready', last: { action, result: r.data }, canRetry: false, retryAt: null });
  }

  return {
    get: () => state,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    boot,
    /** Returns false when the intent was not sent (not ready, or another write is in flight). */
    async act(action: CampaignAction): Promise<boolean> {
      if (state.phase !== 'ready' || !state.view || !csrf || pending) return false;
      const { bytes, command } = await commandFor(state.view, action);
      pending = { bytes, action, expectedRevision: command.expectedRevision };
      set({ phase: 'sending', notice: null });
      await send();
      return true;
    },
    /** Resend the identical command after 429/503/network ambiguity, or bootstrap again if there is no case yet. */
    async retry() {
      if (state.retryAt && state.retryAt > now()) return;
      if (pending && csrf) { set({ phase: 'sending' }); return send(); }
      return boot();
    },
    /** Explicit restart after the visitor has been told there is no account recovery. Revokes the old case first. */
    async restart() {
      if (csrf) { const r = await transport.revoke(csrf); if (!r.ok && r.problem.kind !== 'expired') return fail(r.problem, false); }
      csrf = null; pending = null;
      state = { ...state, view: null, last: null };
      return boot();
    },
    async exportPassport(): Promise<PassportExport | null> {
      const r = await transport.exportPassport();
      if (!r.ok) { fail(r.problem, false); return null; }
      return r.data;
    }
  };
}
export type PublicController = ReturnType<typeof createPublicController>;
