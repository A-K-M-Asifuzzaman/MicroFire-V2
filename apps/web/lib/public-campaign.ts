import 'server-only';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import { HttpFailureSchema, CAMPAIGN_RULES_VERSION, PUBLIC_CAMPAIGN_BASE, PublicCampaignEmptyRequestSchema, PublicCampaignViewSchema, PublicCampaignViewResponseSchema,
  PublicCampaignBootstrapResponseSchema, PublicCampaignActionRequestSchema, PublicCampaignActionResponseSchema,
  PublicCampaignRevokeResponseSchema, PublicCampaignExportResponseSchema, CampaignRecordSchema, campaignIdentity, campaignJson } from '@microfire/shared';
import { createCampaign, replayCampaign, transitionCampaign, trainingProgress, trainingDiagnostic, claimTrialStatements } from '@microfire/game-core';
import { catalog, catalogSha256, validatePassport } from '@microfire/science';
import { CampaignFailure, campaignRequestAllowed, secretBytes, tokenDigest, uniqueCookie } from './campaign-security';
import { readCampaignBody } from './campaign-body';
import { CAMPAIGN_HEADERS, campaignResponse } from './campaign-http';

export const PUBLIC_SESSION_COOKIE = '__Host-microfire_campaign_session';
export type PublicCampaignConfig = { origin: string; realmId: string; runtimeId: string; csrfKey: Buffer; abuseKey: Buffer };
export function publicCampaignConfig(env: NodeJS.ProcessEnv): PublicCampaignConfig | null {
  if (env.MICROFIRE_PUBLIC_CAMPAIGN_ENABLED !== '1' || env.MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL !== 'public-campaign-v1') return null;
  try {
    const origin = env.MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN ?? '', u = new URL(origin);
    if (u.protocol !== 'https:' || u.origin !== origin || u.username || u.password) return null;
    const realmId = z.uuid().parse(env.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID), runtimeId = z.uuid().parse(env.MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID);
    const csrfKey = secretBytes(env.MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY), abuseKey = secretBytes(env.MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY);
    if (!csrfKey || !abuseKey || csrfKey.equals(abuseKey) || [csrfKey, abuseKey].some(b => b.every(v => v === b[0]))) return null;
    for (const name of ['MICROFIRE_PREVIEW_ACCESS_TOKEN', 'MICROFIRE_PREVIEW_SIGNING_KEY', 'MICROFIRE_CAMPAIGN_ACCESS_TOKEN', 'MICROFIRE_CAMPAIGN_SIGNING_KEY', 'MICROFIRE_REVIEW_ACCESS_TOKEN']) {
      const b = secretBytes(env[name]); if (b && (b.equals(csrfKey) || b.equals(abuseKey))) return null;
    }
    return { origin, realmId, runtimeId, csrfKey, abuseKey };
  } catch { return null; }
}
/** A managed PostgreSQL pooler is required on Vercel; never fall back to memory or /tmp. */
export function publicCampaignPool(databaseUrl: string, ca?: string): Pool {
  let u: URL; try { u = new URL(databaseUrl); } catch { throw Error('Invalid campaign database configuration.'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.hostname || !u.username || !u.password || u.pathname.length < 2 || u.hash ||
    [...u.searchParams].some(([k, v]) => k !== 'sslmode' || !['require', 'verify-full'].includes(v))) throw Error('Invalid campaign database configuration.');
  const pool = new Pool({ host: u.hostname, port: Number(u.port || 5432), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    statement_timeout: 3000, query_timeout: 5000, allowExitOnIdle: true, application_name: 'microfire-public-campaign' });
  pool.on('error', () => {}); // Request failures are sanitized; idle-client errors must not print credentials or crash a worker.
  return pool;
}
type Visitor = { owner_hash: string; session_id: string; expires_at: Date; record: unknown; revision: number; last_command: string | null; last_response: unknown };
class SessionUnavailable extends CampaignFailure {
  constructor() { super(403, 'PREVIEW_UNAUTHORIZED', 'Visitor session is absent, expired or revoked.'); }
}
const missing = () => new CampaignFailure(404, 'SESSION_NOT_FOUND', 'Campaign case not found.');
export class PublicCampaignService {
  private readonly binding: string;
  constructor(readonly config: PublicCampaignConfig, private readonly pool: Pool) {
    this.binding = tokenDigest(campaignJson({ protocol: 'public-campaign-v1', origin: config.origin, runtimeId: config.runtimeId, rulesVersion: CAMPAIGN_RULES_VERSION, catalogSha256 }));
  }
  private owner(token: string) { return tokenDigest('public-campaign-v1\0' + token); }
  private csrf(owner: string) { return createHmac('sha256', this.config.csrfKey).update('public-campaign-v1/csrf\0').update(this.binding).update(owner).digest('base64url'); }
  private validCsrf(owner: string, supplied: string | null) {
    const value = secretBytes(supplied); return value && timingSafeEqual(value, Buffer.from(this.csrf(owner), 'base64url'));
  }
  private async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let disconnected = false;
    const onError = () => { disconnected = true; };
    client.on('error', onError); // Leased clients are not covered by the pool's idle-client error handler.
    try { await client.query('BEGIN'); await client.query("SET LOCAL statement_timeout = '3s'"); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.off('error', onError); client.release(disconnected); }
  }
  private async reserve(buckets: readonly (readonly [string, number])[]) {
    // Address first, global last; commit before taking any visitor/head or bootstrap lock.
    await this.transaction(async client => {
      await client.query("SET LOCAL lock_timeout = '250ms'; SET LOCAL idle_in_transaction_session_timeout = '3s'");
      const window = (await client.query("SELECT date_trunc('minute',clock_timestamp()) AS window_at")).rows[0].window_at as Date;
      for (const [subject, limit] of buckets) {
        const hash = createHmac('sha256', this.config.abuseKey).update(subject).digest('hex');
        const result = await client.query(`INSERT INTO microfire_campaign_budgets(realm,bucket_hash,window_at,hits,expires_at)
          VALUES($1,$2,$3,1,$3::timestamptz+interval '2 days')
          ON CONFLICT(realm,bucket_hash,window_at) DO UPDATE SET hits=microfire_campaign_budgets.hits+1
          WHERE microfire_campaign_budgets.hits<$4 RETURNING hits`, [this.config.realmId, hash, window, limit]);
        if (!result.rowCount) throw new CampaignFailure(429, 'RATE_LIMITED', 'Campaign request budget reached.');
      }
    });
  }
  budget(subject: string, limit: number) { return this.reserve([[subject, limit]]); }
  admit(trustedAddress: string) { return this.reserve([['edge:' + trustedAddress, 240], ['edge-global', 2000]]); }
  private async withOwner<T>(token: string | null, csrf: string | null, mutation: boolean, fn: (client: PoolClient, visitor: Visitor) => Promise<T>) {
    if (!token) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'A visitor session is required.');
    const owner = this.owner(token);
    if (mutation && !this.validCsrf(owner, csrf)) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Session CSRF validation failed.');
    await this.budget('visitor:' + owner, 120);
    return this.transaction(async client => {
      const result = await client.query(`SELECT v.owner_hash,v.session_id,v.expires_at,h.record,h.revision,h.last_command,h.last_response
        FROM microfire_campaign_visitors v JOIN microfire_campaign_heads h USING(realm,owner_hash)
        WHERE v.realm=$1 AND v.owner_hash=$2 AND v.audience='public-campaign-v1' AND v.binding=$3 AND NOT v.revoked AND v.expires_at>clock_timestamp()
        FOR UPDATE OF v,h`, [this.config.realmId, owner, this.binding]);
      const row = result.rows[0] as Visitor | undefined;
      if (!row) throw new SessionUnavailable();
      const record = CampaignRecordSchema.parse(row.record);
      if (record.sessionId !== row.session_id || record.events.length !== row.revision) throw Error('Stored campaign invariant failed.');
      const value = await fn(client, row);
      const live = await client.query('SELECT 1 FROM microfire_campaign_visitors WHERE realm=$1 AND owner_hash=$2 AND NOT revoked AND expires_at>clock_timestamp()', [this.config.realmId, owner]);
      if (!live.rowCount) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Visitor session expired before completion.');
      return value;
    });
  }
  private view(input: unknown) {
    const record = CampaignRecordSchema.parse(input), view = replayCampaign(record, catalog), s = view.state;
    validatePassport(s.passport);
    return PublicCampaignViewSchema.parse({ protocol: 'public-campaign-v1', runtimeId: this.config.runtimeId, sessionId: record.sessionId, revision: record.events.length,
      activeMission: s.activeMission, completedMissions: s.completedMissions, trainingStep: trainingProgress(view).step,
      installedPartIds: s.setup.installedParts.map(p => p.partId), diagnostic: view.training.diagnosticRevision !== null ? trainingDiagnostic(view) : null,
      sourceReviewed: view.sourceReviewed, selectedExperimentId: view.selectedExperimentId, predictionLocked: s.predictions.length > 0, passport: s.passport,
      inspectedExperimentIds: s.inspectedExperimentIds, prediction: s.predictions.at(-1)?.prediction ?? null,
      explanation: view.explanation, appraisals: view.appraisals, habitat: view.habitat, decision: s.decision?.verdict ?? null, proposalCount: s.proposals.length,
      trialStatements: s.activeMission === 'claim-trial' ? claimTrialStatements.map(({ id, text, origin }) => ({ id, text, origin })) : [],
      scope: 'educational-progress-not-scientific-certification' });
  }
  async bootstrap(token: string | null, trustedAddress: string) {
    if (token) return this.withOwner(token, null, false, async (_client, row) => ({ token: null, csrfToken: this.csrf(row.owner_hash), expiresAt: row.expires_at.toISOString(), view: this.view(row.record) }));
    await this.reserve([['new-address:' + trustedAddress, 5], ['new-global', 60]]);
    return this.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', ['microfire-public-bootstrap:' + this.config.realmId]);
      const count = await client.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors WHERE realm=$1 AND NOT revoked AND expires_at>clock_timestamp()', [this.config.realmId]);
      if (count.rows[0].n >= 10000) throw new CampaignFailure(503, 'PREVIEW_CAPACITY', 'Visitor capacity reached.');
      const token = randomBytes(32).toString('base64url'), owner = this.owner(token), id = randomUUID();
      const now = (await client.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
      const record = createCampaign(id, catalog, now.toISOString());
      const visitor = await client.query(`INSERT INTO microfire_campaign_visitors(realm,owner_hash,audience,binding,session_id,expires_at)
        VALUES($1,$2,'public-campaign-v1',$3,$4,clock_timestamp()+interval '24 hours') RETURNING expires_at`, [this.config.realmId, owner, this.binding, id]);
      await client.query('INSERT INTO microfire_campaign_heads(realm,owner_hash,revision,record) VALUES($1,$2,0,$3::jsonb)', [this.config.realmId, owner, campaignJson(record)]);
      return { token, csrfToken: this.csrf(owner), expiresAt: (visitor.rows[0].expires_at as Date).toISOString(), view: this.view(record) };
    });
  }
  read(token: string | null) { return this.withOwner(token, null, false, async (_c, row) => this.view(row.record)); }
  resume(token: string | null, csrf: string | null) { return this.withOwner(token, csrf, true, async (_c, row) => this.view(row.record)); }
  export(token: string | null) { return this.withOwner(token, null, false, async (_c, row) => PublicCampaignExportResponseSchema.parse({ apiVersion: '1', data: { sessionId: row.session_id, revision: row.revision, passport: this.view(row.record).passport, scope: 'educational-progress-not-scientific-certification' } }).data); }
  async revoke(token: string | null, csrf: string | null) {
    // Lock ordering is the same as actions; no revocation can race a later authorized commit.
    if (!token) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'A visitor session is required.');
    const owner = this.owner(token);
    if (!this.validCsrf(owner, csrf)) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Session CSRF validation failed.');
    await this.transaction(async c => {
      const row = await c.query("SELECT 1 FROM microfire_campaign_visitors WHERE realm=$1 AND owner_hash=$2 AND binding=$3 AND NOT revoked AND expires_at>clock_timestamp() FOR UPDATE", [this.config.realmId, owner, this.binding]);
      if (!row.rowCount) throw new SessionUnavailable();
      await c.query('UPDATE microfire_campaign_visitors SET revoked=true WHERE realm=$1 AND owner_hash=$2', [this.config.realmId, owner]);
    });
  }
  async action(token: string | null, csrf: string | null, input: unknown) {
    const command = PublicCampaignActionRequestSchema.parse(input);
    if (command.runtimeId !== this.config.runtimeId) throw new CampaignFailure(409, 'RUNTIME_CHANGED', 'Reload and reconcile the current campaign.');
    if (await campaignIdentity(command) !== command.commandId) throw new CampaignFailure(409, 'COMMAND_ID_REUSED', 'Command identity does not match its content.');
    return this.withOwner(token, csrf, true, async (client, row) => {
      if (row.session_id !== command.sessionId) throw missing();
      if (row.last_command === command.commandId && row.revision === command.expectedRevision + 1)
        return PublicCampaignActionResponseSchema.parse({ apiVersion: '1', data: row.last_response }).data;
      if (row.revision !== command.expectedRevision) throw new CampaignFailure(409, 'STALE_SESSION', 'Read the authoritative session before retrying.');
      const now = (await client.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
      const record = CampaignRecordSchema.parse(row.record);
      const result = transitionCampaign(record, command.action, catalog, now.toISOString());
      const data = PublicCampaignActionResponseSchema.parse({ apiVersion: '1', data: result.ok
        ? { ok: true, view: this.view(result.record), ...(result.feedback ? { feedback: result.feedback } : {}) }
        : { ok: false, view: this.view(record), code: result.code, message: result.message } }).data;
      if (Buffer.byteLength(campaignJson({ apiVersion: '1', data })) > 524288) throw new CampaignFailure(413, 'PAYLOAD_TOO_LARGE', 'Response budget reached; previous progress is unchanged.');
      if (result.ok) {
        if (Buffer.byteLength(campaignJson(result.record)) > 131072) throw new CampaignFailure(413, 'PAYLOAD_TOO_LARGE', 'Campaign history budget reached.');
        const saved = await client.query('UPDATE microfire_campaign_heads SET revision=$3,record=$4::jsonb,last_command=$5,last_response=$6::jsonb WHERE realm=$1 AND owner_hash=$2 AND revision=$7',
          [this.config.realmId, row.owner_hash, result.record.events.length, campaignJson(result.record), command.commandId, campaignJson(data), command.expectedRevision]);
        if (saved.rowCount !== 1) throw new CampaignFailure(409, 'STALE_SESSION', 'The campaign changed; reconcile the current session.');
      }
      return data;
    });
  }
}
const publicCookie = (value: string, age = 86400) => `${PUBLIC_SESSION_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
/** Review candidate only: no Next route imports this factory. trustedAddress must come from the hosting adapter, never raw client forwarding headers. */
export function createPublicCampaignHandler(env: NodeJS.ProcessEnv, pool: Pool) {
  const config = publicCampaignConfig(env), service = config ? new PublicCampaignService(config, pool) : null;
  return async (request: Request, trustedAddress: string): Promise<Response> => {
    try {
      if (!config || !service) throw new CampaignFailure(404, 'NOT_FOUND', 'API route not found.');
      if (!campaignRequestAllowed(request, config.origin, false) || !isIP(trustedAddress)) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Origin or CSRF validation failed.');
      const path = new URL(request.url).pathname.slice(PUBLIC_CAMPAIGN_BASE.length);
      if (!new URL(request.url).pathname.startsWith(PUBLIC_CAMPAIGN_BASE + '/')) throw missing();
      await service.admit(trustedAddress);
      const token = uniqueCookie(request, PUBLIC_SESSION_COOKIE), csrf = request.headers.get('x-microfire-csrf');
      if (!token && request.headers.get('cookie')?.includes(PUBLIC_SESSION_COOKIE + '=')) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Ambiguous visitor cookie.');
      if (request.method === 'POST' && path === '/session') {
        PublicCampaignEmptyRequestSchema.parse(await readCampaignBody(request, 'start'));
        const { token: minted, ...data } = await service.bootstrap(token, trustedAddress);
        const response = campaignResponse(PublicCampaignBootstrapResponseSchema, data);
        if (minted) response.headers.set('Set-Cookie', publicCookie(minted)); return response;
      }
      if (request.method === 'GET' && path === '/session') return campaignResponse(PublicCampaignViewResponseSchema, await service.read(token));
      if (request.method === 'GET' && path === '/export') return campaignResponse(PublicCampaignExportResponseSchema, await service.export(token));
      if (request.method !== 'POST' || !['/action', '/resume', '/revoke'].includes(path)) throw missing();
      const raw = await readCampaignBody(request, path === '/action' ? 'action' : 'start');
      if (path === '/action') return campaignResponse(PublicCampaignActionResponseSchema, await service.action(token, csrf, raw));
      PublicCampaignEmptyRequestSchema.parse(raw);
      if (path === '/resume') {
        // Recovery reads only durable state. A client checkpoint can never replace a public head.
        return campaignResponse(PublicCampaignViewResponseSchema, await service.resume(token, csrf));
      }
      await service.revoke(token, csrf); const r = campaignResponse(PublicCampaignRevokeResponseSchema, { revoked: true }); r.headers.set('Set-Cookie', publicCookie('', 0)); return r;
    } catch (error) {
      const e = error instanceof CampaignFailure ? error : error instanceof z.ZodError ? new CampaignFailure(400, 'INVALID_REQUEST', 'Invalid public campaign request.') : new CampaignFailure(503, 'INTERNAL_ERROR', 'Campaign storage is unavailable.');
      const response = Response.json(HttpFailureSchema.parse({ apiVersion: '1', error: { code: e.code, message: e.message, retryable: e.status === 429 || e.status === 503 } }), { status: e.status, headers: CAMPAIGN_HEADERS });
      if (e.status === 429) response.headers.set('Retry-After', '60');
      if (error instanceof SessionUnavailable) response.headers.set('Set-Cookie', publicCookie('', 0));
      return response;
    }
  };
}
