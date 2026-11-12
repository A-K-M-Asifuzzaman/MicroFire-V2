import 'server-only';
import { z } from 'zod';
import { AuthorizeRequestSchema, CampaignAuthorizeResponseSchema, RevokeRequestSchema, RevokeResponseSchema, HttpFailureSchema, PreviewUuidSchema,
  CAMPAIGN_HTTP_BASE, CampaignHttpCapabilityResponseSchema, CampaignHttpStartRequestSchema, CampaignHttpResumeRequestSchema,
  CampaignHttpSnapshotResponseSchema, CampaignHttpActionResponseSchema, CampaignHttpExportResponseSchema, CampaignCommandSchema, campaignJson } from '@microfire/shared';
import { CampaignAuthority, CampaignFailure, campaignConfig } from './campaign-security';
import { CampaignService } from './campaign-service';
import { readCampaignBody } from './campaign-body';
import { createMemoryLimiter } from './api';

export const CAMPAIGN_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Cross-Origin-Resource-Policy': 'same-origin' };
export function campaignResponse(schema: z.ZodType, data: unknown, status = 200) {
  const text = campaignJson(schema.parse({ apiVersion: '1', data }));
  if (Buffer.byteLength(text) > 524288) throw new CampaignFailure(413, 'PAYLOAD_TOO_LARGE', 'Campaign response exceeds its byte budget.');
  return new Response(text, { status, headers: CAMPAIGN_HEADERS });
}
export function campaignError(error: unknown): Response {
  const e = error instanceof CampaignFailure ? error : error instanceof z.ZodError
    ? new CampaignFailure(400, 'INVALID_REQUEST', 'Request does not match the campaign contract.')
    : new CampaignFailure(500, 'INTERNAL_ERROR', 'Campaign request could not be completed.');
  return Response.json(HttpFailureSchema.parse({ apiVersion: '1', error: { code: e.code, message: e.message, retryable: e.status === 429 || e.status === 503 } }), { status: e.status, headers: CAMPAIGN_HEADERS });
}
/** Review candidate. Deliberately not imported by any Next route. */
export function createLoopbackCampaignHandler(env: NodeJS.ProcessEnv, now: () => number = Date.now) {
  const config = campaignConfig(env), authority = config ? new CampaignAuthority(config, now) : null;
  const service = authority ? new CampaignService(authority, now) : null;
  const limiter = createMemoryLimiter({ read: 120, write: 30 }, now);
  return async (request: Request): Promise<Response> => {
    try {
      if (!authority || !service || !config) throw new CampaignFailure(404, 'NOT_FOUND', 'API route not found.');
      authority.check(request);
      const url = new URL(request.url), prefix = CAMPAIGN_HTTP_BASE + '/';
      if (!url.pathname.startsWith(prefix)) throw new CampaignFailure(404, 'NOT_FOUND', 'API route not found.');
      const path = url.pathname.slice(prefix.length).split('/'), route = path.join('/');
      const quota = limiter.take(request.method === 'GET' ? 'read' : 'write');
      if (!quota.allowed) { const r = campaignError(new CampaignFailure(429, 'RATE_LIMITED', 'Campaign request budget reached.')); r.headers.set('Retry-After', String(quota.retryAfterSeconds)); return r; }
      if (request.method === 'GET' && route === 'capability') {
        const grant = authority.current(request);
        return campaignResponse(CampaignHttpCapabilityResponseSchema, { campaignVersion: 1, runtimeId: authority.runtimeId,
          authorization: 'operator-token-required', grant: grant ? { status: 'valid', expiresAt: new Date(grant.expires).toISOString() } : { status: 'required' }, scope: 'local-educational-campaign-not-public-mission' });
      }
      if (request.method === 'POST' && (route === 'authorize' || route === 'revoke')) {
        const raw = await readCampaignBody(request, route);
        if (route === 'authorize') {
          const body = AuthorizeRequestSchema.parse(raw), grant = authority.authorize(request, body.approvalToken);
          const r = campaignResponse(CampaignAuthorizeResponseSchema, { authorized: true, runtimeId: authority.runtimeId, expiresAt: grant.expiresAt, csrfToken: grant.csrfToken });
          if (grant.cookie) r.headers.set('Set-Cookie', grant.cookie); return r;
        }
        RevokeRequestSchema.parse(raw);
        const r = campaignResponse(RevokeResponseSchema, { authorized: false }); r.headers.set('Set-Cookie', authority.revoke(request)); return r;
      }
      authority.require(request);
      if (request.method === 'GET' && path.length === 2 && ['session', 'export'].includes(path[0]!)) {
        const id = PreviewUuidSchema.parse(path[1]);
        return path[0] === 'session' ? campaignResponse(CampaignHttpSnapshotResponseSchema, service.read(request, id)) : campaignResponse(CampaignHttpExportResponseSchema, service.export(request, id));
      }
      if (request.method !== 'POST' || !['start', 'action', 'resume'].includes(route)) throw new CampaignFailure(404, 'NOT_FOUND', 'API route not found.');
      const raw = await readCampaignBody(request, route as 'start' | 'action' | 'resume');
      const body = route === 'start' ? CampaignHttpStartRequestSchema.parse(raw) : route === 'resume' ? CampaignHttpResumeRequestSchema.parse(raw) : CampaignCommandSchema.parse(raw);
      authority.require(request);
      if (body.runtimeId !== authority.runtimeId) throw new CampaignFailure(409, 'RUNTIME_CHANGED', 'Reauthorize and reconcile this campaign runtime.');
      if (route === 'start') return campaignResponse(CampaignHttpSnapshotResponseSchema, service.start(request, CampaignHttpStartRequestSchema.parse(body).sessionId));
      if (route === 'resume') return campaignResponse(CampaignHttpSnapshotResponseSchema, service.resume(request, CampaignHttpResumeRequestSchema.parse(body).checkpoint));
      return campaignResponse(CampaignHttpActionResponseSchema, await service.command(request, body));
    } catch (error) { return campaignError(error); }
  };
}
