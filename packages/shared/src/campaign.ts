import { z } from 'zod';
import { CitationSchema, IdSchema, StatementTypeSchema, EvidenceLevelSchema } from './science';
import { PassportSchema, GameStateSchema, GameActionSchema } from './game';
import { TargetConditionsSchema } from './api';
import { TrainingSchema, TrainingActionSchema, PreviewTimeSchema, PreviewUuidSchema, SafeCounterSchema, CommandIdSchema, LearnerNoteSchema } from './training-schemas';

export const CAMPAIGN_RULES_VERSION = 'evidence-campaign-v1' as const;
export const HabitatDimensionSchema = z.enum(['gravity', 'oxygen', 'pressure', 'ventilation', 'material']);
const citations = z.array(CitationSchema).min(1).max(4);
export const CampaignActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('TRAINING'), action: TrainingActionSchema }),
  z.strictObject({ type: z.literal('CORE'), action: GameActionSchema }),
  z.strictObject({ type: z.literal('REVIEW_SOURCE'), claimId: IdSchema, citations, observationOrigin: z.enum(['research', 'fiction']), incidentOrigin: z.enum(['research', 'fiction']) }),
  z.strictObject({ type: z.literal('SELECT_EXPERIMENT'), experimentId: IdSchema, targetConditions: TargetConditionsSchema }),
  z.strictObject({ type: z.literal('EXPLAIN_OBSERVATION'), claimId: IdSchema, citations, relation: z.enum(['source-observation', 'flow-caused-outcome', 'lunar-proof']), limitations: z.array(z.enum(['single-run-no-causality', 'pressure-unknown', 'not-lunar-evidence'])).max(3), learnerExplanation: LearnerNoteSchema }),
  z.strictObject({ type: z.literal('APPRAISE_CLAIM'), statementId: IdSchema, kind: StatementTypeSchema, evidenceLevel: EvidenceLevelSchema, citations, support: z.enum(['supports', 'contradicts', 'insufficient']), confounders: z.array(z.enum(['flow-history', 'gravity', 'pressure'])).max(3) }),
  z.strictObject({ type: z.literal('ASSESS_HABITAT'), scenario: z.strictObject({ gravity: z.literal('lunar'), oxygenPct: z.number().min(0).max(100).nullable(), pressureKpa: z.number().positive().nullable(), ventilation: LearnerNoteSchema, material: LearnerNoteSchema }), verdict: z.enum(['insufficient-evidence', 'safe', 'unsafe']), citations, gaps: z.array(HabitatDimensionSchema).max(5), nextMeasurements: z.array(HabitatDimensionSchema).min(1).max(5), learnerExplanation: LearnerNoteSchema })
]);
export const CampaignRecordSchema = z.strictObject({
  campaignVersion: z.literal(1), rulesVersion: z.literal(CAMPAIGN_RULES_VERSION), datasetVersion: IdSchema,
  sessionId: PreviewUuidSchema, startedAt: PreviewTimeSchema,
  events: z.array(z.strictObject({ at: PreviewTimeSchema, action: CampaignActionSchema })).max(256)
});
export const CampaignCommandSchema = z.strictObject({ runtimeId: PreviewUuidSchema, sessionId: PreviewUuidSchema, expectedRevision: SafeCounterSchema, commandId: CommandIdSchema, action: CampaignActionSchema });
export type CampaignAction = z.infer<typeof CampaignActionSchema>;
export type CampaignRecord = z.infer<typeof CampaignRecordSchema>;
export type CampaignCommand = z.infer<typeof CampaignCommandSchema>;

/** Campaign v1 permits decimal research conditions; frozen integer-only M2 canonical JSON is unchanged. */
export function campaignJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === 'number' && !Number.isFinite(v)) throw Error('Nonfinite campaign number');
    if (v && typeof v === 'object' && !Array.isArray(v))
      return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    return v;
  });
}
export async function campaignIdentity(request: Omit<CampaignCommand, 'commandId'> & { commandId?: string }): Promise<string> {
  const { commandId: ignored, ...intent } = request; void ignored;
  const parsed = CampaignCommandSchema.omit({ commandId: true }).parse(intent);
  const bytes = new TextEncoder().encode(campaignJson({ domain: CAMPAIGN_RULES_VERSION, request: parsed }));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}

export const CampaignFeedbackSchema = z.strictObject({ correct: z.boolean(), reasons: z.array(z.string().min(1).max(1000)).max(10), citations: z.array(CitationSchema).max(4), scope: z.literal('educational-criteria-not-semantic-validation') });
export const CampaignSnapshotSchema = z.strictObject({
  campaignVersion: z.literal(1), runtimeId: PreviewUuidSchema, sessionId: PreviewUuidSchema, revision: SafeCounterSchema,
  checkpoint: z.string().max(175000), state: GameStateSchema, training: TrainingSchema,
  sourceReviewed: z.boolean(), selectedExperimentId: IdSchema.nullable(), explanation: CampaignFeedbackSchema.nullable(),
  appraisals: z.record(IdSchema, CampaignFeedbackSchema).refine(a => Object.keys(a).length <= 4), habitat: CampaignFeedbackSchema.nullable(),
  scope: z.literal('local-educational-campaign-not-public-mission')
});
export const CampaignExportSchema = z.strictObject({ exportVersion: z.literal(1), record: CampaignRecordSchema,
  passport: PassportSchema, checkpoint: z.string().max(175000), scope: z.literal('educational-record-not-scientific-certification') });
