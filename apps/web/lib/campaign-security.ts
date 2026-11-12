import 'server-only';
import { createHash, hkdfSync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { HttpCode } from '@microfire/shared';
import { hostedEnvironment } from './review-policy';

export class CampaignFailure extends Error {
  constructor(readonly status: number, readonly code: HttpCode, message: string) { super(message); }
}
export const secretBytes = (value: string | null | undefined): Buffer | null => {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64url');
  return bytes.length === 32 && bytes.toString('base64url') === value ? bytes : null;
};
export const tokenDigest = (value: string) => createHash('sha256').update(value).digest('hex');
export function uniqueCookie(request: Request, name: string): string | null {
  const values = (request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(name + '='));
  if (values.length !== 1) return null;
  const value = values[0]!.slice(name.length + 1);
  return secretBytes(value) ? value : null;
}
export type CampaignConfig = { origin: string; host: string; port: string; realmId: string; keyId: string; accessToken: Buffer; signingKey: Buffer };
export function campaignConfig(env: NodeJS.ProcessEnv): CampaignConfig | null {
  if (env.MICROFIRE_LOCAL_CAMPAIGN !== '1' || hostedEnvironment(env)) return null;
  const origin = env.MICROFIRE_CAMPAIGN_ORIGIN ?? '';
  if (!/^https?:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin)) return null;
  let url: URL; try { url = new URL(origin); } catch { return null; }
  if (url.origin !== origin || !url.port || Number(url.port) > 65535) return null;
  const accessToken = secretBytes(env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN), key = secretBytes(env.MICROFIRE_CAMPAIGN_SIGNING_KEY);
  const realmId = env.MICROFIRE_CAMPAIGN_REALM_ID ?? '', keyId = env.MICROFIRE_CAMPAIGN_KEY_ID ?? '';
  if (!accessToken || !key || timingSafeEqual(accessToken, key) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(realmId) || !/^[a-z0-9_-]{1,32}$/.test(keyId)) return null;
  if ([accessToken, key].some(b => b.every(v => v === b[0]))) return null;
  // Compare for accidental reuse only; no M2 credential can authorize or sign a campaign.
  const forbidden = ['MICROFIRE_PREVIEW_ACCESS_TOKEN', 'MICROFIRE_PREVIEW_SIGNING_KEY', 'MICROFIRE_REVIEW_ACCESS_TOKEN', 'MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY', 'MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY'];
  if (forbidden.some(name => { const b = secretBytes(env[name]); return b && (b.equals(accessToken) || b.equals(key)); })) return null;
  return { origin, host: url.host, port: url.port, realmId, keyId, accessToken, signingKey: Buffer.from(hkdfSync('sha256', key, realmId, 'microfire/campaign-v1/checkpoint', 32)) };
}
export function campaignRequestAllowed(request: Request, origin: string, local: boolean): boolean {
  const h = request.headers, url = new URL(request.url), expected = new URL(origin);
  if (url.origin !== origin || url.username || url.password || url.search || url.hash || h.get('host') !== expected.host || h.has('forwarded')) return false;
  if (h.get('x-microfire-campaign') !== '1' || h.get('sec-fetch-mode') === 'no-cors') return false;
  const site = h.get('sec-fetch-site'); if (site !== null && site !== 'same-origin') return false;
  const supplied = h.get('origin');
  if (request.method === 'POST' ? supplied !== origin : supplied !== null && supplied !== origin) return false;
  if (local) {
    for (const [name, value] of [['x-forwarded-host', expected.host], ['x-forwarded-proto', expected.protocol.slice(0, -1)], ['x-forwarded-port', expected.port]])
      if (h.has(name!) && h.get(name!) !== value) return false;
    const forwarded = h.get('x-forwarded-for');
    if (forwarded !== null && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(forwarded)) return false;
  } else if (h.has('x-forwarded-host') && h.get('x-forwarded-host') !== expected.host) return false;
  return true;
}
type Grant = { csrfHash: string; ownerId: string; audience: 'campaign-v1'; runtimeId: string; origin: string; realmId: string; expires: number };
export class CampaignAuthority {
  readonly runtimeId = randomUUID();
  readonly cookieName: string;
  private readonly grants = new Map<string, Grant>();
  constructor(readonly config: CampaignConfig, private readonly now: () => number = Date.now) {
    this.cookieName = config.origin.startsWith('https:') ? '__Secure-microfire_campaign_grant' : 'microfire_campaign_grant';
  }
  check(request: Request) {
    if (!campaignRequestAllowed(request, this.config.origin, true)) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Campaign origin or CSRF validation failed.');
  }
  private cookie(value: string, age = 3600) {
    return `${this.cookieName}=${value}; Path=/api/game/campaign/v1; HttpOnly; SameSite=Strict; Max-Age=${age}${this.config.origin.startsWith('https:') ? '; Secure' : ''}`;
  }
  current(request: Request): Grant | null {
    this.check(request);
    for (const [id, g] of this.grants) if (g.expires <= this.now()) this.grants.delete(id);
    const value = uniqueCookie(request, this.cookieName); if (!value) return null;
    const g = this.grants.get(tokenDigest(value)), proof = secretBytes(request.headers.get('x-microfire-campaign-csrf'));
    return g && proof && timingSafeEqual(Buffer.from(g.csrfHash, 'hex'), Buffer.from(tokenDigest(proof.toString('base64url')), 'hex')) && g.audience === 'campaign-v1' && g.runtimeId === this.runtimeId && g.origin === this.config.origin && g.realmId === this.config.realmId ? g : null;
  }
  require(request: Request): Grant {
    const g = this.current(request); if (!g) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Authorize this campaign before accessing a case.'); return g;
  }
  authorize(request: Request, approvalToken: string): { expiresAt: string; csrfToken: string; cookie?: string } {
    this.check(request);
    const token = secretBytes(approvalToken);
    if (!token || !timingSafeEqual(token, this.config.accessToken)) throw new CampaignFailure(403, 'PREVIEW_UNAUTHORIZED', 'Campaign authorization was not accepted.');
    const old = this.current(request); if (old) return { expiresAt: new Date(old.expires).toISOString(), csrfToken: request.headers.get('x-microfire-campaign-csrf')! };
    if (this.grants.size >= 8) throw new CampaignFailure(503, 'PREVIEW_CAPACITY', 'Campaign grant capacity reached.');
    const value = randomBytes(32).toString('base64url'), csrfToken = randomBytes(32).toString('base64url'), ownerId = tokenDigest(value), expires = this.now() + 3600000;
    this.grants.set(ownerId, { ownerId, expires, csrfHash: tokenDigest(csrfToken), audience: 'campaign-v1', runtimeId: this.runtimeId, origin: this.config.origin, realmId: this.config.realmId });
    return { csrfToken, expiresAt: new Date(expires).toISOString(), cookie: this.cookie(value) };
  }
  revoke(request: Request): string {
    this.require(request); const token = uniqueCookie(request, this.cookieName); if (token) this.grants.delete(tokenDigest(token)); return this.cookie('', 0);
  }
}
