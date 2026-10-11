import 'server-only';
import { z } from 'zod';
import { API_VERSION, ApiErrorSchema, AskRequestSchema, CompareRequestSchema, ExperimentQuerySchema, ExperimentResponseSchema, ExperimentsResponseSchema, FeaturesResponseSchema, HealthResponseSchema, IdSchema, PassportSchema, PassportValidationResponseSchema, RankRequestSchema, SourcesResponseSchema, features } from '@microfire/shared';
import { catalog, validatePassport } from '@microfire/science';

export function apiError(status: number, code: z.infer<typeof ApiErrorSchema>['error']['code'], message: string) {
  return Response.json(ApiErrorSchema.parse({ apiVersion: API_VERSION, error: { code, message, retryable: status === 429 || status === 503 } }), { status, headers: { 'Cache-Control': 'no-store' } });
}
function success(schema: z.ZodType, data: unknown) {
  return Response.json(schema.parse({ apiVersion: API_VERSION, data }), { headers: { 'Cache-Control': 'no-store' } });
}
export function readApi(path: string[], url: URL): Response {
  const route = path.join('/');
  if (route === 'health') return success(HealthResponseSchema, { status: 'ok', phase: 'zero', datasetVersion: catalog.datasetVersion });
  if (route === 'feature-status') return success(FeaturesResponseSchema, features);
  if (route === 'sources') return success(SourcesResponseSchema, catalog.sources);
  if (route === 'experiments') {
    const seen = new Set<string>();
    for (const key of url.searchParams.keys()) {
      if (seen.has(key)) return apiError(400, 'INVALID_REQUEST', 'Duplicate query parameters are not accepted.');
      seen.add(key);
    }
    const query = ExperimentQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!query.success) return apiError(400, 'INVALID_REQUEST', 'Invalid experiment filters or pagination.');
    const { program, offset, limit } = query.data;
    const records = catalog.experiments.filter((e) => !program || e.program === program);
    return success(ExperimentsResponseSchema, { items: records.slice(offset, offset + limit), total: records.length, limit, offset, datasetVersion: catalog.datasetVersion });
  }
  if (path.length === 2 && path[0] === 'experiments') {
    const id = IdSchema.safeParse(path[1]);
    if (!id.success) return apiError(400, 'INVALID_REQUEST', 'Invalid experiment identifier.');
    const experiment = catalog.experiments.find((e) => e.id === id.data);
    return experiment ? success(ExperimentResponseSchema, experiment) : apiError(404, 'NOT_FOUND', 'Experiment not found.');
  }
  return apiError(404, 'NOT_FOUND', 'API route not found.');
}
const MAX_BODY = 32_768;
class RequestFailure extends Error { constructor(readonly status: number, readonly code: z.infer<typeof ApiErrorSchema>['error']['code'], message: string) { super(message); } }
async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new RequestFailure(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new RequestFailure(413, 'PAYLOAD_TOO_LARGE', 'Request exceeds 32 KiB.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestFailure(400, 'INVALID_REQUEST', 'A JSON body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); throw new RequestFailure(413, 'PAYLOAD_TOO_LARGE', 'Request exceeds 32 KiB.'); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { throw new RequestFailure(400, 'INVALID_REQUEST', 'Malformed JSON.'); }
}
// shortcut: per-process budget only, use a shared limiter before any public or paid-provider release.
export function createPostHandler(now: () => number = Date.now) {
  let windowStart = 0;
  let requests = 0;
  return async (path: string[], request: Request): Promise<Response> => {
    const route = path.join('/');
    const schemas: Record<string, z.ZodType> = { 'evidence/rank': RankRequestSchema, 'evidence/compare': CompareRequestSchema, ask: AskRequestSchema, 'passport/validate': PassportSchema };
    const schema = schemas[route];
    if (!schema) return apiError(404, 'NOT_FOUND', 'API route not found.');
    if (now() - windowStart >= 60_000) { windowStart = now(); requests = 0; }
    if (++requests > 30) return apiError(429, 'RATE_LIMITED', 'Local request budget reached; retry after one minute.');
    try {
      const body = await readJson(request);
      const result = schema.safeParse(body);
      if (!result.success) return apiError(400, 'INVALID_REQUEST', 'Request does not match API v1.');
      if (route !== 'passport/validate') return apiError(501, 'NOT_IMPLEMENTED', 'This Phase One service is not implemented. No provider was called.');
      try { validatePassport(result.data); }
      catch { return apiError(400, 'INVALID_REQUEST', 'Passport structure or citation lineage is invalid.'); }
      return success(PassportValidationResponseSchema, { valid: true, scope: 'structure-and-citation-lineage-only', certification: false });
    } catch (error) {
      if (error instanceof RequestFailure) return apiError(error.status, error.code, error.message);
      return apiError(500, 'INTERNAL_ERROR', 'The request could not be processed.');
    }
  };
}
export const writeApi = createPostHandler();
