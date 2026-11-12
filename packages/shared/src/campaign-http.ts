import { z } from 'zod';
import { envelope } from './api';
import { TextSchema } from './science';
import { CampaignSnapshotSchema, CampaignFeedbackSchema, CampaignExportSchema } from './campaign';
import { PreviewUuidSchema, PreviewTimeSchema } from './training-schemas';

// Review candidate only: this versioned transport is not mounted by the application.
export const CAMPAIGN_HTTP_BASE = '/api/game/campaign/v1' as const;
export const CampaignHttpCapabilityResponseSchema = envelope(z.strictObject({
  campaignVersion: z.literal(1), runtimeId: PreviewUuidSchema, authorization: z.literal('operator-token-required'),
  grant: z.discriminatedUnion('status', [z.strictObject({ status: z.literal('required') }), z.strictObject({ status: z.literal('valid'), expiresAt: PreviewTimeSchema })]),
  scope: z.literal('local-educational-campaign-not-public-mission')
}));
export const CampaignHttpStartRequestSchema = z.strictObject({ runtimeId: PreviewUuidSchema, sessionId: PreviewUuidSchema });
export const CampaignHttpResumeRequestSchema = z.strictObject({ runtimeId: PreviewUuidSchema,
  checkpoint: z.string().max(175000).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/) });
export const CampaignHttpSnapshotResponseSchema = envelope(CampaignSnapshotSchema);
export const CampaignHttpActionResponseSchema = envelope(z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), snapshot: CampaignSnapshotSchema, feedback: CampaignFeedbackSchema.optional() }),
  z.strictObject({ ok: z.literal(false), snapshot: CampaignSnapshotSchema, code: z.string().regex(/^[A-Z][A-Z0-9_]{0,99}$/), message: TextSchema })
]));
export const CampaignHttpExportResponseSchema = envelope(CampaignExportSchema);

// Separate from frozen M2 authorization: origin-held proof is required alongside the campaign cookie.
export const CampaignAuthorizeResponseSchema = envelope(z.strictObject({ authorized: z.literal(true), expiresAt: PreviewTimeSchema,
  runtimeId: PreviewUuidSchema, csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }));
