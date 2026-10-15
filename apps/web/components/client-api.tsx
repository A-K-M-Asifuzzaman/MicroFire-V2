import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiErrorSchema } from '@microfire/shared';

type Envelope<D> = { safeParse(input: unknown): { success: true; data: { data: D } } | { success: false } };
export type ApiFailure = { ok: false; status: number; message: string; retryAfter: number | null };
export type ApiResult<D> = { ok: true; data: D } | ApiFailure;

/**
 * Calls the v1 API and validates the envelope against the current shared contract.
 * Anything that does not parse is reported as a failure, never rendered as evidence.
 */
export async function callApi<D>(path: string, schema: Envelope<D>, body?: unknown, signal?: AbortSignal): Promise<ApiResult<D>> {
  let response: Response;
  try {
    response = await fetch(path, body === undefined
      ? { headers: { accept: 'application/json' }, signal: signal ?? null }
      : { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal: signal ?? null });
  } catch {
    return { ok: false, status: 0, message: 'The evidence service could not be reached. Check the connection, then retry.', retryAfter: null };
  }
  let json: unknown;
  try { json = await response.json(); }
  catch { return { ok: false, status: response.status, message: `The service returned an unreadable response (HTTP ${response.status}).`, retryAfter: null }; }
  if (!response.ok) {
    const error = ApiErrorSchema.safeParse(json);
    const retryAfter = response.status === 429 ? Number(response.headers.get('Retry-After')) || null : null;
    return { ok: false, status: response.status, message: error.success ? error.data.error.message : `Request failed (HTTP ${response.status}).`, retryAfter };
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { ok: true, data: parsed.data.data }
    : { ok: false, status: response.status, message: 'The response did not match the evidence contract, so it is not shown.', retryAfter: null };
}

export function Failure({ failure, onRetry }: { failure: ApiFailure; onRetry?: (() => void) | undefined }) {
  // Honour the server's Retry-After: the Retry control stays disabled, with a visible countdown, until the delay passes.
  const [wait, setWait] = useState(failure.retryAfter ?? 0);
  useEffect(() => {
    if (!failure.retryAfter) return;
    const until = Date.now() + failure.retryAfter * 1000;
    const timer = setInterval(() => { const left = Math.max(0, Math.ceil((until - Date.now()) / 1000)); setWait(left); if (!left) clearInterval(timer); }, 250);
    return () => clearInterval(timer);
  }, [failure]);
  return <div className="notice" data-tone="error" role="alert">
    <p><strong>{failure.status === 429 ? 'Request budget reached.' : failure.status === 400 ? 'This request was not accepted.' : 'Evidence unavailable.'}</strong> {failure.message}
      {failure.retryAfter ? ` Retry in about ${failure.retryAfter} s.` : ''}</p>
    {onRetry && failure.status !== 400 && <div className="actions" style={{ alignItems: 'center' }}>
      <button className="btn btn-quiet btn-sm" type="button" onClick={onRetry} disabled={wait > 0} data-testid="retry">{wait > 0 ? `Retry available in ${wait} s` : 'Retry'}</button>
      {wait > 0 && <span className="cooldown" aria-live="off">The service asked us to wait before trying again.</span>}
    </div>}
  </div>;
}

/**
 * Latest-request-wins guard for research tools. Each begin() aborts the previous request and returns an identity check;
 * a response is applied only while it is still the newest request, even if an older fetch completes anyway.
 * Unmount aborts the active request.
 */
export function useLatestRequest() {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  return useCallback(() => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    return { signal: controller.signal, isCurrent: () => current.current === controller && !controller.signal.aborted };
  }, []);
}
