import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CampaignExportSchema, CampaignSnapshotSchema, CampaignCommandSchema, PreviewUuidSchema, campaignIdentity, campaignJson, parsePreviewJson, type CampaignRecord } from '@microfire/shared';
import { createCampaign, replayCampaign, transitionCampaign } from '@microfire/game-core';
import { catalog, catalogSha256, validatePassport } from '@microfire/science';
import { localPreviewRequest, PreviewAuthority, PreviewFailure } from './game-preview-security';
import { z } from 'zod';
import { CampaignRecordSchema } from '@microfire/shared';

const checkpointSchema = z.strictObject({ format: z.literal('evidence-campaign-v1'), realmId: PreviewUuidSchema, origin: z.string(), keyId: z.string(), catalogSha256: z.string(), record: CampaignRecordSchema });
const PREFIX = 'microfire-evidence-campaign-v1\0';
type Head = { record: CampaignRecord; checkpoint: string; commandId: string | null };
/** Private server adapter only. No HTTP route or public availability is enabled by constructing it. */
export class CampaignService {
  private readonly heads = new Map<string, Head>();
  private readonly locks = new Map<string, Promise<void>>();
  constructor(readonly authority: PreviewAuthority, private readonly now: () => number = Date.now) {}
  private authorized(request: Request) {
    if (!localPreviewRequest(request, this.authority.config)) throw new PreviewFailure(403, 'PREVIEW_UNAUTHORIZED', 'Local campaign authorization is required.');
    this.authority.require(request);
  }
  private sign(record: CampaignRecord): string {
    replayCampaign(record, catalog);
    const { realmId, origin, keyId, signingKey } = this.authority.config;
    const bytes = Buffer.from(campaignJson({ format: 'evidence-campaign-v1', realmId, origin, keyId, catalogSha256, record }));
    if (bytes.length > 131072) throw new PreviewFailure(413, 'PAYLOAD_TOO_LARGE', 'Campaign checkpoint budget reached; previous progress is unchanged.');
    return bytes.toString('base64url') + '.' + createHmac('sha256', signingKey).update(PREFIX).update(bytes).digest('base64url');
  }
  private verify(token: string): CampaignRecord {
    const bad = () => new PreviewFailure(400, 'CHECKPOINT_UNTRUSTED', 'Preserve the raw campaign checkpoint; its authenticity or history could not be verified.');
    if (typeof token !== 'string' || token.length > 175000) throw bad();
    const [encoded, mac, extra] = token.split('.');
    if (!encoded || !mac || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(encoded) || !/^[A-Za-z0-9_-]{43}$/.test(mac)) throw bad();
    const bytes = Buffer.from(encoded, 'base64url'), signature = Buffer.from(mac, 'base64url');
    if (bytes.length > 131072 || bytes.toString('base64url') !== encoded || signature.toString('base64url') !== mac || signature.length !== 32) throw bad();
    const expected = createHmac('sha256', this.authority.config.signingKey).update(PREFIX).update(bytes).digest();
    if (!timingSafeEqual(expected, signature)) throw bad();
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes), raw = parsePreviewJson(text), payload = checkpointSchema.parse(raw);
      if (campaignJson(payload) !== text) throw bad();
      const c = this.authority.config;
      if (payload.realmId !== c.realmId || payload.origin !== c.origin || payload.keyId !== c.keyId || payload.catalogSha256 !== catalogSha256) throw bad();
      replayCampaign(payload.record, catalog); return payload.record;
    } catch { throw bad(); }
  }
  private snapshot(head: Head) {
    const view = replayCampaign(head.record, catalog);
    validatePassport(view.state.passport);
    return CampaignSnapshotSchema.parse({ campaignVersion: 1 as const, runtimeId: this.authority.runtimeId, sessionId: head.record.sessionId, revision: head.record.events.length, checkpoint: head.checkpoint, ...view,
      scope: 'local-educational-campaign-not-public-mission' as const });
  }
  start(request: Request, sessionId: string) {
    this.authorized(request); PreviewUuidSchema.parse(sessionId);
    const existing = this.heads.get(sessionId);
    if (existing) return this.snapshot(existing);
    if (this.heads.size >= 8) throw new PreviewFailure(503, 'PREVIEW_CAPACITY', 'Retain checkpoints; local campaign capacity is full.');
    const record = createCampaign(sessionId, catalog, new Date(this.now()).toISOString());
    const head = { record, checkpoint: this.sign(record), commandId: null };
    const snapshot = this.snapshot(head); this.heads.set(sessionId, head); return snapshot;
  }
  read(request: Request, sessionId: string) {
    this.authorized(request); PreviewUuidSchema.parse(sessionId);
    const head = this.heads.get(sessionId);
    if (!head) throw new PreviewFailure(404, 'SESSION_NOT_FOUND', 'Explicitly resume the saved campaign checkpoint.');
    return this.snapshot(head);
  }
  export(request: Request, sessionId: string) {
    const snapshot = this.read(request, sessionId), record = this.heads.get(sessionId)!.record;
    return CampaignExportSchema.parse({ exportVersion: 1, record, passport: snapshot.state.passport, checkpoint: snapshot.checkpoint, scope: 'educational-record-not-scientific-certification' });
  }
  async command(request: Request, input: unknown) {
    this.authorized(request); const command = CampaignCommandSchema.parse(input);
    if (command.runtimeId !== this.authority.runtimeId) throw new PreviewFailure(409, 'RUNTIME_CHANGED', 'Reauthorize and reconcile the current campaign runtime.');
    if (await campaignIdentity(command) !== command.commandId) throw new PreviewFailure(409, 'COMMAND_ID_REUSED', 'Campaign command identity does not match its content.');
    const previous = this.locks.get(command.sessionId) ?? Promise.resolve();
    let unlock!: () => void;
    const tail = new Promise<void>(resolve => { unlock = resolve; }); this.locks.set(command.sessionId, tail);
    await previous;
    try {
      this.authorized(request);
      const head = this.heads.get(command.sessionId);
      if (!head) throw new PreviewFailure(404, 'SESSION_NOT_FOUND', 'Explicitly resume the saved campaign checkpoint.');
      if (head.commandId === command.commandId && head.record.events.length === command.expectedRevision + 1) return { ok: true as const, snapshot: this.snapshot(head) };
      if (head.record.events.length !== command.expectedRevision) throw new PreviewFailure(409, 'STALE_SESSION', 'Read the current campaign head before retrying.');
      const result = transitionCampaign(head.record, command.action, catalog, new Date(this.now()).toISOString());
      if (!result.ok) return { ok: false as const, code: result.code, message: result.message, snapshot: this.snapshot(head) };
      const candidate = { record: result.record, checkpoint: this.sign(result.record), commandId: command.commandId };
      const snapshot = this.snapshot(candidate); this.authorized(request); this.heads.set(command.sessionId, candidate);
      return { ok: true as const, snapshot, ...(result.feedback ? { feedback: result.feedback } : {}) };
    } finally { unlock(); if (this.locks.get(command.sessionId) === tail) this.locks.delete(command.sessionId); }
  }
  resume(request: Request, token: string) {
    this.authorized(request); const record = this.verify(token);
    if (record.startedAt > new Date(this.now() + 300000).toISOString() || (record.events.at(-1)?.at ?? record.startedAt) > new Date(this.now() + 300000).toISOString())
      throw new PreviewFailure(400, 'CHECKPOINT_UNTRUSTED', 'Campaign checkpoint is ahead of the local clock.');
    const old = this.heads.get(record.sessionId);
    if (old && old.checkpoint !== token) throw new PreviewFailure(409, 'STALE_SESSION', 'Resume cannot replace a different live campaign head.');
    if (!old && this.heads.size >= 8) throw new PreviewFailure(503, 'PREVIEW_CAPACITY', 'Retain the checkpoint; local campaign capacity is full.');
    const head = old ?? { record, checkpoint: token, commandId: null };
    const snapshot = this.snapshot(head); this.heads.set(record.sessionId, head); return snapshot;
  }
}
