import { ApiErrorSchema } from '@microfire/shared';

type Envelope<D> = { safeParse(input: unknown): { success: true; data: { data: D } } | { success: false } };
export type ApiFailure = { ok: false; status: number; message: string; retryAfter: number | null };
export type ApiResult<D> = { ok: true; data: D } | ApiFailure;

/**
 * Calls the v1 API and validates the envelope against the current shared contract.
 * Anything that does not parse is reported as a failure, never rendered as evidence.
 */
export async function callApi<D>(path: string, schema: Envelope<D>, body?: unknown): Promise<ApiResult<D>> {
  let response: Response;
  try {
    response = await fetch(path, body === undefined
      ? { headers: { accept: 'application/json' } }
      : { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
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
  return <div className="notice" data-tone="error" role="alert">
    <p><strong>{failure.status === 429 ? 'Request budget reached.' : failure.status === 400 ? 'This request was not accepted.' : 'Evidence unavailable.'}</strong> {failure.message}
      {failure.retryAfter ? ` Retry in about ${failure.retryAfter} s.` : ''}</p>
    {onRetry && failure.status !== 400 && <button className="btn btn-quiet btn-sm" type="button" onClick={onRetry}>Retry</button>}
  </div>;
}
