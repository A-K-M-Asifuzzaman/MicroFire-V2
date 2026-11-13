// Browser transport for Codex's public anonymous campaign protocol (public-campaign-v1). Every body is parsed with the
// shared Zod contracts. The browser never sends an operator secret, never forges Origin/Fetch Metadata, keeps the CSRF
// proof in memory only and never imports campaign rules: the server alone decides progression, grading and Passport.
import {
  HttpFailureSchema, PUBLIC_CAMPAIGN_BASE, PublicCampaignActionRequestSchema, PublicCampaignActionResponseSchema,
  PublicCampaignBootstrapResponseSchema, PublicCampaignEmptyRequestSchema, PublicCampaignExportResponseSchema,
  PublicCampaignRevokeResponseSchema, PublicCampaignViewResponseSchema, campaignIdentity,
  type CampaignAction, type CampaignCommand
} from '@microfire/shared';
import type { z } from 'zod';
import { retryAfterMs } from '../transport';

export type PublicView = z.infer<typeof PublicCampaignViewResponseSchema>['data'];
export type Bootstrap = z.infer<typeof PublicCampaignBootstrapResponseSchema>['data'];
export type ActionResult = z.infer<typeof PublicCampaignActionResponseSchema>['data'];
export type PassportExport = z.infer<typeof PublicCampaignExportResponseSchema>['data'];

/**
 * Why a request did not produce data. `ambiguous` = the commit outcome is unknowable from this response (network loss,
 * timeout, malformed body, 500): the caller may only resend the identical command bytes or reconcile with GET.
 */
export type Problem =
  | { kind: 'expired' }                         // 403: visitor cookie absent/expired/revoked, or CSRF proof rejected
  | { kind: 'missing' }                         // 404 SESSION_NOT_FOUND: the case no longer exists
  | { kind: 'disabled' }                        // 404 NOT_FOUND: public campaign not enabled on this server
  | { kind: 'conflict' }                        // 409: the head moved; read it and ask for a fresh learner intent
  | { kind: 'rate-limited'; retryAfterMs: number }
  | { kind: 'unavailable' }                     // 503: storage unavailable; nothing was committed
  | { kind: 'rejected'; status: number }        // 400/413/415: the request itself is invalid
  | { kind: 'ambiguous' };

export type Result<T> = { ok: true; data: T } | { ok: false; problem: Problem };

export function classify(status: number, body: unknown, retryAfter: string | null): Problem {
  const parsed = HttpFailureSchema.safeParse(body), code = parsed.success ? parsed.data.error.code : null;
  if (status === 403) return { kind: 'expired' };
  if (status === 404) return code === 'SESSION_NOT_FOUND' ? { kind: 'missing' } : { kind: 'disabled' };
  if (status === 409) return { kind: 'conflict' };
  if (status === 429) return { kind: 'rate-limited', retryAfterMs: retryAfterMs(retryAfter) ?? 60_000 };
  if (status === 503) return { kind: 'unavailable' };
  if (status >= 400 && status < 500) return { kind: 'rejected', status };
  return { kind: 'ambiguous' };
}

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export function createPublicTransport({ fetchImpl = (i: string, n: RequestInit) => fetch(i, n), timeoutMs = 15_000, base = PUBLIC_CAMPAIGN_BASE }: { fetchImpl?: Fetch; timeoutMs?: number; base?: string } = {}) {
  async function call<T>(method: 'GET' | 'POST', path: string, body: string | null, csrf: string | null, parse: (v: unknown) => T): Promise<Result<T>> {
    let res: Response;
    try {
      res = await fetchImpl(base + path, {
        method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'X-MicroFire-Campaign': '1', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-MicroFire-CSRF': csrf } : {}) },
        ...(body === null ? {} : { body })
      });
    } catch { return { ok: false, problem: { kind: 'ambiguous' } }; }
    const json: unknown = await res.json().catch(() => undefined);
    if (!res.ok) return { ok: false, problem: classify(res.status, json, res.headers.get('retry-after')) };
    try { return { ok: true, data: parse(json) }; } catch { return { ok: false, problem: { kind: 'ambiguous' } }; }
  }
  const empty = JSON.stringify(PublicCampaignEmptyRequestSchema.parse({}));
  return {
    /** POST /session: a valid cookie recovers the same durable case and its CSRF proof; no cookie mints a new case. */
    bootstrap: () => call('POST', '/session', empty, null, (v) => PublicCampaignBootstrapResponseSchema.parse(v).data),
    read: () => call('GET', '/session', null, null, (v) => PublicCampaignViewResponseSchema.parse(v).data),
    /** `bytes` is sent verbatim so a retry after an ambiguous outcome is byte-identical. */
    action: (bytes: string, csrf: string) => call('POST', '/action', bytes, csrf, (v) => PublicCampaignActionResponseSchema.parse(v).data),
    resume: (csrf: string) => call('POST', '/resume', empty, csrf, (v) => PublicCampaignViewResponseSchema.parse(v).data),
    revoke: (csrf: string) => call('POST', '/revoke', empty, csrf, (v) => PublicCampaignRevokeResponseSchema.parse(v).data),
    exportPassport: () => call('GET', '/export', null, null, (v) => PublicCampaignExportResponseSchema.parse(v).data)
  };
}
export type PublicTransport = ReturnType<typeof createPublicTransport>;

/** One learner intent bound to the head it was chosen against. The identity is the shared campaignIdentity digest. */
export async function commandFor(view: Pick<PublicView, 'runtimeId' | 'sessionId' | 'revision'>, action: CampaignAction): Promise<{ command: CampaignCommand; bytes: string }> {
  const intent = { runtimeId: view.runtimeId, sessionId: view.sessionId, expectedRevision: view.revision, action };
  const command = PublicCampaignActionRequestSchema.parse({ ...intent, commandId: await campaignIdentity(intent) });
  return { command, bytes: JSON.stringify(command) };
}
