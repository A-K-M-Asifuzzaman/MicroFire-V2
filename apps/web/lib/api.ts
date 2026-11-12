import 'server-only';
import { z } from 'zod';
import {
  API_VERSION, ApiErrorSchema, AskRequestSchema, AskResponseSchema, CitationVerifyRequestSchema, CitationVerifyResponseSchema, CompareRequestSchema,
  CompareResponseSchema, ExperimentQuerySchema, ExperimentResponseSchema, ExperimentsResponseSchema, ExportQuerySchema, ExportResponseSchema,
  FeaturesResponseSchema, GapsRequestSchema, GapsResponseSchema, HealthResponseSchema, IdSchema, PassportSchema, PassportValidationResponseSchema,
  RankRequestSchema, RankResponseSchema, FrontierResponseSchema, SourceDetailResponseSchema, SourcesResponseSchema, features,
  InvestigationQuerySchema, InvestigationResponseSchema, InvestigationsResponseSchema, InvestigationCitationRequestSchema,
  InvestigationCitationResponseSchema, TransferRequestSchema, TransferResponseSchema, IntelligenceRequestSchema, IntelligenceResponseSchema
} from '@microfire/shared';
import {
  answerQuestion, catalog, classifyGaps, compareExperiments, coverage, exportEvidence, isQuarantinedId, rankEvidence, searchExperiments,
  sourceDetail, validatePassport, verifyCitations, researchFrontier, investigationLibrary, INVESTIGATION_LIBRARY_VERSION,
  verifyInvestigationCitations, analyzeTransfer, scientificIntelligence
} from '@microfire/science';

type ErrorCode = z.infer<typeof ApiErrorSchema>['error']['code'];
// API responses are data only: nothing may render, frame or execute them.
const API_HEADERS = { 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Cross-Origin-Resource-Policy': 'same-origin' };
export function apiError(status: number, code: ErrorCode, message: string) {
  return Response.json(ApiErrorSchema.parse({ apiVersion: API_VERSION, error: { code, message, retryable: status === 429 || status === 503 } }), { status, headers: API_HEADERS });
}
function success(schema: z.ZodType, data: unknown) {
  return Response.json(schema.parse({ apiVersion: API_VERSION, data }), { headers: API_HEADERS });
}
const quarantineMessage = (ids: string[]) => `${ids.join(', ')} ${ids.length === 1 ? 'is a' : 'are'} quarantined legacy candidate${ids.length === 1 ? '' : 's'} pending primary-source review, not validated evidence.`;

function strictQuery<T extends z.ZodType>(url: URL, schema: T): z.infer<T> | Response {
  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (seen.has(key)) return apiError(400, 'INVALID_REQUEST', 'Duplicate query parameters are not accepted.');
    seen.add(key);
  }
  const query = schema.safeParse(Object.fromEntries(url.searchParams));
  return query.success ? query.data : apiError(400, 'INVALID_REQUEST', 'Invalid query parameters.');
}

export function readApi(path: string[], url: URL): Response {
  const route = path.join('/');
  if (route === 'health') return success(HealthResponseSchema, { status: 'ok', phase: 'one', datasetVersion: catalog.datasetVersion });
  if (route === 'feature-status') return success(FeaturesResponseSchema, features);
  if (route === 'sources') return success(SourcesResponseSchema, catalog.sources);
  if (route === 'investigations') {
    const query = strictQuery(url, InvestigationQuerySchema);
    if (query instanceof Response) return query;
    return success(InvestigationsResponseSchema, { libraryVersion: INVESTIGATION_LIBRARY_VERSION, items: investigationLibrary(query.q), coverage: coverage() });
  }
  if (path.length === 2 && path[0] === 'investigations') {
    const query = strictQuery(url, z.strictObject({}));
    if (query instanceof Response) return query;
    const id = IdSchema.safeParse(path[1]);
    if (!id.success) return apiError(400, 'INVALID_REQUEST', 'Invalid investigation identifier.');
    const entry = investigationLibrary().find(i => i.id === id.data);
    return entry ? success(InvestigationResponseSchema, entry) : apiError(404, 'NOT_FOUND', 'Investigation description not found.');
  }
  if (route === 'experiments') {
    const query = strictQuery(url, ExperimentQuerySchema);
    if (query instanceof Response) return query;
    const { offset, limit, ...filters } = query;
    const records = searchExperiments(filters);
    return success(ExperimentsResponseSchema, { items: records.slice(offset, offset + limit), total: records.length, limit, offset, datasetVersion: catalog.datasetVersion, coverage: coverage() });
  }
  if (route === 'export') {
    const query = strictQuery(url, ExportQuerySchema);
    if (query instanceof Response) return query;
    const result = exportEvidence(query.ids.split(','));
    if (!result.ok) return apiError(404, 'NOT_FOUND', result.unknownIds.some(isQuarantinedId) ? quarantineMessage(result.unknownIds.filter(isQuarantinedId)) : 'One or more records are not in the validated catalog.');
    return success(ExportResponseSchema, result.data);
  }
  if (path.length === 2 && (path[0] === 'experiments' || path[0] === 'sources')) {
    const id = IdSchema.safeParse(path[1]);
    if (!id.success) return apiError(400, 'INVALID_REQUEST', 'Invalid identifier.');
    if (path[0] === 'sources') {
      const detail = sourceDetail(id.data);
      return detail ? success(SourceDetailResponseSchema, detail) : apiError(404, 'NOT_FOUND', 'Source not found.');
    }
    const experiment = catalog.experiments.find((e) => e.id === id.data);
    if (experiment) return success(ExperimentResponseSchema, experiment);
    return apiError(404, 'NOT_FOUND', isQuarantinedId(id.data) ? quarantineMessage([id.data]) : 'Experiment not found.');
  }
  return apiError(404, 'NOT_FOUND', 'API route not found.');
}

// ---------- rate limiting ----------
export interface RateLimiter { take(bucket: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } }
// ponytail: fixed-window counters in one process; swap for a shared store (same interface) before any public or paid-provider release.
export function createMemoryLimiter(limits: Record<string, number>, now: () => number = Date.now, windowMs = 60_000): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    take(bucket) {
      const t = now();
      let w = windows.get(bucket);
      if (!w || t - w.start >= windowMs) { w = { start: t, count: 0 }; windows.set(bucket, w); }
      if (++w.count > (limits[bucket] ?? 0)) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) };
      return { allowed: true };
    }
  };
}
export const LIMITS = { read: 300, write: 30 } as const;
function limited(retryAfterSeconds: number) {
  const response = apiError(429, 'RATE_LIMITED', 'Local request budget reached; retry after the indicated delay.');
  response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}
export function createGetHandler(limiter: RateLimiter = createMemoryLimiter(LIMITS)) {
  return (path: string[], url: URL): Response => {
    try {
      const gate = limiter.take('read');
      if (!gate.allowed) return limited(gate.retryAfterSeconds);
      return readApi(path, url);
    }
    catch { return apiError(500, 'INTERNAL_ERROR', 'The catalog could not be read.'); }
  };
}

// ---------- POST ----------
const MAX_BODY = 32_768;
class RequestFailure extends Error { constructor(readonly status: number, readonly code: ErrorCode, message: string) { super(message); } }
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

const postRoutes: Record<string, { schema: z.ZodType; handle: (input: never) => Response }> = {
  'investigations/verify': { schema: InvestigationCitationRequestSchema, handle: (r: z.infer<typeof InvestigationCitationRequestSchema>) =>
    success(InvestigationCitationResponseSchema, verifyInvestigationCitations(r.investigationId, r.citations)) },
  'evidence/transfer': { schema: TransferRequestSchema, handle: (r: z.infer<typeof TransferRequestSchema>) => {
    const missing = r.experimentIds.filter(id => !catalog.experiments.some(e => e.id === id));
    if (missing.length) return apiError(404, 'NOT_FOUND', missing.some(isQuarantinedId) ? quarantineMessage(missing.filter(isQuarantinedId)) : 'Transfer requires admitted experimental records; source descriptions are not runs.');
    return success(TransferResponseSchema, analyzeTransfer(r));
  } },
  intelligence: { schema: IntelligenceRequestSchema, handle: (r: z.infer<typeof IntelligenceRequestSchema>) => success(IntelligenceResponseSchema, scientificIntelligence(r)) },
  'evidence/frontier': { schema: RankRequestSchema, handle: (r: z.infer<typeof RankRequestSchema>) => success(FrontierResponseSchema, researchFrontier(r)) },
  'evidence/rank': { schema: RankRequestSchema, handle: (r: z.infer<typeof RankRequestSchema>) => success(RankResponseSchema, rankEvidence(r)) },
  'evidence/compare': { schema: CompareRequestSchema, handle: (r: z.infer<typeof CompareRequestSchema>) => {
    const result = compareExperiments(r.experimentIds);
    if (result.ok) return success(CompareResponseSchema, result.data);
    return apiError(404, 'NOT_FOUND', result.quarantinedIds.length
      ? quarantineMessage(result.quarantinedIds)
      : `Comparison needs validated records; not in the catalog: ${result.unknownIds.join(', ')}. The catalog currently holds ${catalog.experiments.length} validated experiment(s).`);
  } },
  ask: { schema: AskRequestSchema, handle: (r: z.infer<typeof AskRequestSchema>) => success(AskResponseSchema, answerQuestion(r)) },
  gaps: { schema: GapsRequestSchema, handle: (r: z.infer<typeof GapsRequestSchema>) => success(GapsResponseSchema, classifyGaps(r.targetConditions)) },
  'citations/verify': { schema: CitationVerifyRequestSchema, handle: (r: z.infer<typeof CitationVerifyRequestSchema>) => success(CitationVerifyResponseSchema, verifyCitations(r)) },
  'passport/validate': { schema: PassportSchema, handle: (r: z.infer<typeof PassportSchema>) => {
    try { validatePassport(r); }
    catch { return apiError(400, 'INVALID_REQUEST', 'Passport structure or citation lineage is invalid.'); }
    return success(PassportValidationResponseSchema, { valid: true, scope: 'structure-and-citation-lineage-only', certification: false });
  } }
};

export function createPostHandler(now: () => number = Date.now, limiter: RateLimiter = createMemoryLimiter(LIMITS, now)) {
  return async (path: string[], request: Request): Promise<Response> => {
    const route = Object.hasOwn(postRoutes, path.join('/')) ? postRoutes[path.join('/')] : undefined;
    if (!route) return apiError(404, 'NOT_FOUND', 'API route not found.');
    try {
      const gate = limiter.take('write');
      if (!gate.allowed) return limited(gate.retryAfterSeconds);
      const body = await readJson(request);
      const result = route.schema.safeParse(body);
      if (!result.success) return apiError(400, 'INVALID_REQUEST', 'Request does not match API v1.');
      return route.handle(result.data as never);
    } catch (error) {
      if (error instanceof RequestFailure) return apiError(error.status, error.code, error.message);
      return apiError(500, 'INTERNAL_ERROR', 'The request could not be processed.');
    }
  };
}
export const apiLimiter = createMemoryLimiter(LIMITS);
export const readApiLimited = createGetHandler(apiLimiter);
export const writeApi = createPostHandler(Date.now, apiLimiter);
