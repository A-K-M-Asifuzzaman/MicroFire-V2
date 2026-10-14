import { z } from 'zod';
import { CitationSchema, EvidenceLevelSchema, ExperimentSchema, HttpsUrlSchema, IdSchema, SourceSchema, StatementTypeSchema, TextSchema } from './science';
import { FeatureSchema } from './features';

export const API_VERSION = '1' as const;
export const ApiErrorSchema = z.strictObject({ apiVersion: z.literal(API_VERSION), error: z.strictObject({
  code: z.enum(['INVALID_REQUEST', 'NOT_FOUND', 'NOT_IMPLEMENTED', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: TextSchema, retryable: z.boolean()
}) });
export const envelope = <T extends z.ZodType>(data: T) => z.strictObject({ apiVersion: z.literal(API_VERSION), data });

/** P1: every research response states how small the validated corpus is, so no client can imply broad coverage. */
export const CoverageSchema = z.strictObject({
  datasetVersion: IdSchema, validatedExperiments: z.number().int().nonnegative(), validatedSources: z.number().int().nonnegative(),
  quarantinedCandidates: z.number().int().nonnegative(), statement: TextSchema
});

export const HealthResponseSchema = envelope(z.strictObject({ status: z.literal('ok'), phase: z.enum(['zero', 'one']), datasetVersion: IdSchema }));
export const FeaturesResponseSchema = envelope(z.array(FeatureSchema));
export const SourcesResponseSchema = envelope(z.array(SourceSchema));
export const SourceDetailResponseSchema = envelope(z.strictObject({
  source: SourceSchema,
  citedBy: z.array(z.strictObject({ experimentId: IdSchema, claimIds: z.array(IdSchema), conditionFields: z.array(TextSchema) }))
}));
export const ExperimentResponseSchema = envelope(ExperimentSchema);
export const ExperimentQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(200).optional(), program: TextSchema.optional(), material: TextSchema.optional(), flowDirection: TextSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().nonnegative().max(100000).default(0)
});
export const ExperimentsResponseSchema = envelope(z.strictObject({ items: z.array(ExperimentSchema), total: z.number().int().nonnegative(), limit: z.number().int().positive(), offset: z.number().int().nonnegative(), datasetVersion: IdSchema, coverage: CoverageSchema }));
export const TargetConditionsSchema = z.strictObject({
  gravity: TextSchema.optional(), material: TextSchema.optional(), geometry: TextSchema.optional(),
  oxygenPct: z.number().min(0).max(100).optional(), pressureKpa: z.number().positive().optional(), flowCmS: z.number().nonnegative().optional()
});
export const RankRequestSchema = z.strictObject({ question: TextSchema, targetConditions: TargetConditionsSchema, limit: z.number().int().min(1).max(20).default(5) });
export const RankedEvidenceSchema = z.strictObject({
  experimentId: IdSchema, evidenceLevel: EvidenceLevelSchema, relevanceScore: z.number().min(0).max(1),
  support: z.strictObject({ kind: z.enum(['observed', 'derived', 'interpretation', 'unsupported']), claimId: IdSchema.nullable(), citations: z.array(CitationSchema).max(20) }),
  matchedFields: z.array(TextSchema), mismatches: z.array(TextSchema), missingFields: z.array(TextSchema), reasons: z.array(TextSchema).min(1), limitations: z.array(TextSchema).min(1)
}).superRefine((item, ctx) => {
  const supported = item.support.kind !== 'unsupported';
  if (supported !== (item.support.claimId !== null && item.support.citations.length > 0) ||
    (!supported && (item.evidenceLevel !== 'gap' || item.support.claimId !== null || item.support.citations.length > 0)) ||
    (item.evidenceLevel === 'direct' && item.support.kind !== 'observed'))
    ctx.addIssue({ code: 'custom', message: 'Evidence level requires consistent source claim support' });
});
export const RankResponseSchema = envelope(z.strictObject({ items: z.array(RankedEvidenceSchema), rankingVersion: IdSchema, datasetVersion: IdSchema, scoreMeaning: z.literal('retrieval-relevance-not-fire-risk'), coverage: CoverageSchema }));
export const CompareRequestSchema = z.strictObject({ experimentIds: z.array(IdSchema).min(2).max(4) }).refine((r) => new Set(r.experimentIds).size === r.experimentIds.length, 'Choose distinct records');
export const CompareResponseSchema = envelope(z.strictObject({ experimentIds: z.array(IdSchema), comparability: z.enum(['controlled', 'confounded', 'insufficient-data']), differences: z.array(TextSchema), missingFields: z.array(TextSchema), limitations: z.array(TextSchema).min(1), citations: z.array(CitationSchema).min(1) }));

export const GapsRequestSchema = z.strictObject({ targetConditions: TargetConditionsSchema })
  .refine((r) => Object.keys(r.targetConditions).length > 0, 'Name at least one target condition');
export const GapStatusSchema = z.enum(['covered', 'conditions-differ', 'not-recorded', 'not-in-catalog']);
export const GapsResponseSchema = envelope(z.strictObject({
  fields: z.array(z.strictObject({ field: TextSchema, status: GapStatusSchema, experimentIds: z.array(IdSchema), note: TextSchema })).min(1),
  statements: z.array(TextSchema).min(1), coverage: CoverageSchema
}));

export const VerifySubjectSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('claim'), claimId: IdSchema, kind: StatementTypeSchema.optional() }),
  z.strictObject({ type: z.literal('condition'), experimentId: IdSchema, field: z.enum(['gravity', 'material', 'geometry', 'flowDirection', 'oxygenPct', 'pressureKpa', 'flowCmS', 'thicknessMm']) })
]);
export const CitationVerifyRequestSchema = z.strictObject({ subject: VerifySubjectSchema, citations: z.array(CitationSchema).min(1).max(20) });
export const CitationVerifyResponseSchema = envelope(z.strictObject({
  verdict: z.enum(['lineage-verified', 'lineage-mismatch', 'unknown-subject']), issues: z.array(TextSchema), resolvedUrls: z.array(HttpsUrlSchema),
  scope: z.literal('citation-lineage-only-not-scientific-truth')
}));

export const ExportQuerySchema = z.strictObject({ ids: z.string().regex(/^[a-z0-9-]+(?:,[a-z0-9-]+){0,19}$/) });
export const ExportResponseSchema = envelope(z.strictObject({
  exportVersion: z.literal(1), datasetVersion: IdSchema, catalogSha256: z.string().regex(/^[a-f0-9]{64}$/),
  records: z.array(z.strictObject({ experiment: ExperimentSchema, sources: z.array(SourceSchema).min(1), citationLinks: z.array(z.strictObject({ sourceId: IdSchema, page: z.number().int().positive().nullable(), url: HttpsUrlSchema })).min(1) })).min(1),
  disclaimer: TextSchema
}));

export const AnswerCategorySchema = z.enum(['direct-observation', 'supported-derivation', 'scientific-interpretation', 'analogous-or-mechanistic', 'unknown-or-gap']);
export const AnswerStatementSchema = z.strictObject({ category: AnswerCategorySchema, text: TextSchema, claimId: IdSchema.nullable(), citations: z.array(CitationSchema).max(20) })
  .refine((s) => s.category === 'unknown-or-gap' || s.citations.length > 0, 'Evidence-bearing statements need citations');
export const AskRequestSchema = z.strictObject({ question: TextSchema, targetConditions: TargetConditionsSchema });
export const AbstentionCodeSchema = z.enum(['unsupported-intent', 'no-relevant-evidence', 'quarantined-record', 'citation-verification-failed']);
export const AskResponseSchema = envelope(z.discriminatedUnion('abstained', [
  z.strictObject({ abstained: z.literal(true), code: AbstentionCodeSchema, reason: TextSchema, citations: z.array(CitationSchema), datasetVersion: IdSchema, retrievalVersion: IdSchema }),
  z.strictObject({ abstained: z.literal(false), answer: TextSchema, statements: z.array(AnswerStatementSchema).min(1), claimIds: z.array(IdSchema).min(1), citations: z.array(CitationSchema).min(1), limitations: z.array(TextSchema).min(1), datasetVersion: IdSchema, retrievalVersion: IdSchema })
]));
export const PassportValidationResponseSchema = envelope(z.strictObject({ valid: z.literal(true), scope: z.literal('structure-and-citation-lineage-only'), certification: z.literal(false) }));

export type TargetConditions = z.infer<typeof TargetConditionsSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type AnswerStatement = z.infer<typeof AnswerStatementSchema>;
