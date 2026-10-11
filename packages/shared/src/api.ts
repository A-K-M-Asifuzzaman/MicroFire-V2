import { z } from 'zod';
import { CitationSchema, EvidenceLevelSchema, ExperimentSchema, IdSchema, SourceSchema, TextSchema } from './science';
import { FeatureSchema } from './features';

export const API_VERSION = '1' as const;
export const ApiErrorSchema = z.strictObject({ apiVersion: z.literal(API_VERSION), error: z.strictObject({
  code: z.enum(['INVALID_REQUEST', 'NOT_FOUND', 'NOT_IMPLEMENTED', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: TextSchema, retryable: z.boolean()
}) });
export const envelope = <T extends z.ZodType>(data: T) => z.strictObject({ apiVersion: z.literal(API_VERSION), data });
export const HealthResponseSchema = envelope(z.strictObject({ status: z.literal('ok'), phase: z.literal('zero'), datasetVersion: IdSchema }));
export const FeaturesResponseSchema = envelope(z.array(FeatureSchema));
export const SourcesResponseSchema = envelope(z.array(SourceSchema));
export const ExperimentResponseSchema = envelope(ExperimentSchema);
export const ExperimentQuerySchema = z.strictObject({
  program: TextSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().nonnegative().max(100000).default(0)
});
export const ExperimentsResponseSchema = envelope(z.strictObject({ items: z.array(ExperimentSchema), total: z.number().int().nonnegative(), limit: z.number().int().positive(), offset: z.number().int().nonnegative(), datasetVersion: IdSchema }));
export const TargetConditionsSchema = z.strictObject({
  gravity: TextSchema.optional(), material: TextSchema.optional(), geometry: TextSchema.optional(),
  oxygenPct: z.number().min(0).max(100).optional(), pressureKpa: z.number().positive().optional(), flowCmS: z.number().nonnegative().optional()
});
export const RankRequestSchema = z.strictObject({ question: TextSchema, targetConditions: TargetConditionsSchema, limit: z.number().int().min(1).max(20).default(5) });
export const RankedEvidenceSchema = z.strictObject({
  experimentId: IdSchema, evidenceLevel: EvidenceLevelSchema, relevanceScore: z.number().min(0).max(1),
  matchedFields: z.array(TextSchema), mismatches: z.array(TextSchema), missingFields: z.array(TextSchema), reasons: z.array(TextSchema).min(1), limitations: z.array(TextSchema).min(1)
});
export const RankResponseSchema = envelope(z.strictObject({ items: z.array(RankedEvidenceSchema), rankingVersion: IdSchema, datasetVersion: IdSchema, scoreMeaning: z.literal('retrieval-relevance-not-fire-risk') }));
export const CompareRequestSchema = z.strictObject({ experimentIds: z.array(IdSchema).min(2).max(4) }).refine((r) => new Set(r.experimentIds).size === r.experimentIds.length, 'Choose distinct records');
export const CompareResponseSchema = envelope(z.strictObject({ experimentIds: z.array(IdSchema), comparability: z.enum(['controlled', 'confounded', 'insufficient-data']), differences: z.array(TextSchema), missingFields: z.array(TextSchema), limitations: z.array(TextSchema).min(1), citations: z.array(CitationSchema).min(1) }));
export const AskRequestSchema = z.strictObject({ question: TextSchema, targetConditions: TargetConditionsSchema });
export const AskResponseSchema = envelope(z.discriminatedUnion('abstained', [
  z.strictObject({ abstained: z.literal(true), reason: TextSchema, citations: z.array(CitationSchema), datasetVersion: IdSchema, retrievalVersion: IdSchema }),
  z.strictObject({ abstained: z.literal(false), answer: TextSchema, claimIds: z.array(IdSchema).min(1), citations: z.array(CitationSchema).min(1), limitations: z.array(TextSchema).min(1), datasetVersion: IdSchema, retrievalVersion: IdSchema })
]));
export const PassportValidationResponseSchema = envelope(z.strictObject({ valid: z.literal(true), scope: z.literal('structure-and-citation-lineage-only'), certification: z.literal(false) }));
