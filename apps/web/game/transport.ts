import type {
  ActionRequest, AuthorizeResponse, CapabilityResponse, ContractRuntime, DomainResult, HttpFailure, ResumeRequest, RevokeResponse,
  Snapshot, StartRequest
} from './contract';

/**
 * What a preview request produced. `unknown` means the commit outcome cannot be known from this response (timeout,
 * network loss, 5xx, malformed body): the controller must reconcile with a GET, never assume success or failure.
 */
export type TransportResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'failure'; status: number; failure: HttpFailure | null; retryAfterMs: number | null }
  | { kind: 'unknown'; reason: 'timeout' | 'network' | 'server-error' | 'malformed' }
  /** Fixture gallery only: the intent was recorded and deliberately not sent to any server. */
  | { kind: 'not-sent' };

export interface PreviewTransport {
  capability(): Promise<TransportResult<CapabilityResponse['data']>>;
  authorize(approvalToken: string): Promise<TransportResult<AuthorizeResponse['data']>>;
  revoke(): Promise<TransportResult<RevokeResponse['data']>>;
  start(request: StartRequest): Promise<TransportResult<Snapshot>>;
  action(request: ActionRequest): Promise<TransportResult<DomainResult>>;
  resume(request: ResumeRequest): Promise<TransportResult<Snapshot>>;
  session(sessionId: string): Promise<TransportResult<Snapshot>>;
}

export const retryAfterMs = (header: string | null, now = Date.now()): number | null => {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
};

/**
 * Real HTTP transport for /api/game/preview. Every body is parsed by Sol's shared schemas (injected); HTTP status,
 * typed error code and Retry-After are kept. Requests are never aborted because a newer one started: the controller
 * allows one write in flight, and a timeout is reported as an unknown commit, not as a failure.
 */
export function createHttpTransport(runtime: ContractRuntime, { base = '/api/game/preview', timeoutMs = 20_000, fetchImpl = fetch } = {}): PreviewTransport {
  async function call<T>(method: 'GET' | 'POST', path: string, body: unknown, parse: (v: unknown) => T): Promise<TransportResult<T>> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      });
    } catch (e) {
      return { kind: 'unknown', reason: e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'network' };
    }
    const json: unknown = await res.json().catch(() => undefined);
    if (res.ok) {
      try { return { kind: 'ok', data: parse(json) }; } catch { return { kind: 'unknown', reason: 'malformed' }; }
    }
    // 500 is ambiguous by contract (commit may have happened): reconcile first.
    if (res.status >= 500 && res.status !== 503) return { kind: 'unknown', reason: 'server-error' };
    let failure: HttpFailure | null;
    try { failure = runtime.parse.failure(json); } catch { failure = null; }
    return { kind: 'failure', status: res.status, failure, retryAfterMs: retryAfterMs(res.headers.get('retry-after')) };
  }
  const data = <T extends { data: unknown }>(parse: (v: unknown) => T) => (v: unknown) => parse(v).data as T['data'];
  return {
    capability: () => call('GET', '/capability', null, data(runtime.parse.capability)),
    authorize: (approvalToken) => call('POST', '/authorize', { approvalToken }, data(runtime.parse.authorize)),
    revoke: () => call('POST', '/revoke', {}, data(runtime.parse.revoke)),
    start: (request) => call('POST', '/start', request, data(runtime.parse.snapshot)),
    action: (request) => call('POST', '/action', request, data(runtime.parse.action)),
    resume: (request) => call('POST', '/resume', request, data(runtime.parse.snapshot)),
    session: (sessionId) => call('GET', `/session/${encodeURIComponent(sessionId)}`, null, data(runtime.parse.snapshot))
  };
}
