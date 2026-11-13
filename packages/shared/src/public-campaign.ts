import { z } from 'zod';
import { envelope } from './api';
import { CampaignCommandSchema, CampaignFeedbackSchema } from './campaign';
import { PassportSchema, PartIdSchema, MissionIdSchema } from './game';
import { PreviewUuidSchema, DiagnosticResultSchema } from './training-schemas';
import { IdSchema, TextSchema } from './science';

export const PUBLIC_CAMPAIGN_BASE = '/api/game/public-campaign/v1' as const;
export const PublicCampaignEmptyRequestSchema = z.strictObject({});
export const PublicCampaignViewSchema = z.strictObject({
  protocol: z.literal('public-campaign-v1'), runtimeId: PreviewUuidSchema, sessionId: PreviewUuidSchema,
  revision: z.number().int().nonnegative().max(256), activeMission: MissionIdSchema.nullable(), completedMissions: z.array(MissionIdSchema).max(5),
  trainingStep: TextSchema, installedPartIds: z.array(PartIdSchema).max(10), diagnostic: DiagnosticResultSchema.nullable(),
  sourceReviewed: z.boolean(), selectedExperimentId: IdSchema.nullable(), predictionLocked: z.boolean(), passport: PassportSchema,
  inspectedExperimentIds: z.array(IdSchema).max(100), prediction: TextSchema.nullable(),
  explanation: CampaignFeedbackSchema.nullable(), appraisals: z.record(IdSchema, CampaignFeedbackSchema).refine(a => Object.keys(a).length <= 4),
  habitat: CampaignFeedbackSchema.nullable(), decision: z.literal('insufficient-evidence').nullable(), proposalCount: z.number().int().min(0).max(20),
  trialStatements: z.array(z.strictObject({ id: IdSchema, text: TextSchema, origin: z.enum(['research', 'authored-tutorial', 'fictional-scenario']) })).max(4),
  scope: z.literal('educational-progress-not-scientific-certification')
});
export const PublicCampaignViewResponseSchema = envelope(PublicCampaignViewSchema);
export const PublicCampaignBootstrapResponseSchema = envelope(z.strictObject({ csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresAt: z.iso.datetime(), view: PublicCampaignViewSchema }));
export const PublicCampaignActionRequestSchema = CampaignCommandSchema;
export const PublicCampaignActionResponseSchema = envelope(z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), view: PublicCampaignViewSchema, feedback: CampaignFeedbackSchema.optional() }),
  z.strictObject({ ok: z.literal(false), view: PublicCampaignViewSchema, code: IdSchema.or(z.string().regex(/^[A-Z_]+$/)), message: TextSchema })
]));
export const PublicCampaignRevokeResponseSchema = envelope(z.strictObject({ revoked: z.literal(true) }));
export const PublicCampaignExportResponseSchema = envelope(z.strictObject({ sessionId: PreviewUuidSchema, revision: z.number().int().nonnegative(), passport: PassportSchema, scope: z.literal('educational-progress-not-scientific-certification') }));
