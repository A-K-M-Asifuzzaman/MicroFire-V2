import { z } from 'zod';
import { CitationSchema, HttpsUrlSchema, IdSchema, TextSchema } from './science';
import { AskResponseSchema, CoverageSchema, RankRequestSchema, RankResponseSchema, TargetConditionsSchema, envelope } from './api';

export const EnvironmentSchema = z.enum(['moon', 'mars', 'spacecraft', 'earth', 'custom']);
export const TransferFieldSchema = z.enum(['gravity', 'material', 'geometry', 'oxygenPct', 'pressureKpa', 'flowCmS']);
export const InvestigationSchema = z.strictObject({
  id: IdSchema, program: TextSchema, title: TextSchema, focus: TextSchema,
  fuelPhase: z.enum(['solid', 'liquid-droplet', 'gas']), platformContext: TextSchema,
  source: z.strictObject({ id: IdSchema, title: TextSchema, url: HttpsUrlSchema, documentUrl: HttpsUrlSchema,
    sha256: z.string().regex(/^[a-f0-9]{64}$/), rightsDetermination: TextSchema }),
  dataset: z.strictObject({ id: IdSchema, url: HttpsUrlSchema, version: TextSchema, doi: TextSchema, rightsStatement: TextSchema, citation: CitationSchema }).nullable(),
  datasetNote: TextSchema,
  citation: CitationSchema, contextCitation: CitationSchema, limitations: z.array(TextSchema).min(1).max(20),
  scope: z.literal('source-description-not-admitted-run-evidence'),
  admittedExperimentIds: z.array(IdSchema).max(100)
}).refine(i => i.citation.sourceId === i.source.id && i.contextCitation.sourceId === i.source.id && (!i.dataset || i.dataset.citation.sourceId === i.dataset.id), 'Metadata citations must reference the declared source');
export const InvestigationQuerySchema = z.strictObject({ q: z.string().trim().min(1).max(200).optional() });
export const InvestigationsResponseSchema = envelope(z.strictObject({ libraryVersion: z.literal('investigation-library-v1'),
  items: z.array(InvestigationSchema).max(100), coverage: CoverageSchema }));
export const InvestigationResponseSchema = envelope(InvestigationSchema);
export const InvestigationCitationRequestSchema = z.strictObject({ investigationId: IdSchema, citations: z.array(CitationSchema).min(1).max(20) });
export const InvestigationCitationResponseSchema = envelope(z.strictObject({ valid: z.boolean(), issues: z.array(TextSchema),
  scope: z.literal('investigation-description-lineage-only-not-scientific-truth') }));

export const TransferRequestSchema = z.strictObject({
  environment: EnvironmentSchema, experimentIds: z.array(IdSchema).min(1).max(4),
  targetConditions: TargetConditionsSchema.refine(t => Object.keys(t).length > 0, 'Supply at least one target condition')
}).refine(r => new Set(r.experimentIds).size === r.experimentIds.length, 'Choose distinct admitted experiments');
const value = z.union([TextSchema, z.number().finite(), z.null()]);
export function equalRecordedCondition(a: string | number | null, b: string | number | null): boolean {
  const normalize = (s: string) => s.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
  return typeof a === 'string' && typeof b === 'string' ? normalize(a) === normalize(b) : a === b;
}
export const TransferRecordSchema = z.strictObject({
  experimentId: IdSchema,
  dimensions: z.array(z.strictObject({ field: TransferFieldSchema,
    status: z.enum(['exact-recorded', 'non-exact-retrieval-match', 'conditions-differ', 'source-not-recorded', 'context-only', 'target-unspecified']),
    target: value, source: value, unit: TextSchema.nullable(), basis: z.enum(['recorded', 'series', 'derived', 'unknown']),
    reason: TextSchema, citations: z.array(CitationSchema).max(1)
  })).length(6),
  conclusion: z.enum(['insufficient-evidence', 'conditions-differ', 'recorded-conditions-match']),
  confounders: z.array(TextSchema).max(6), limitations: z.array(TextSchema).min(1)
}).superRefine((r, ctx) => {
  const incomplete = r.dimensions.some(d => ['target-unspecified', 'source-not-recorded', 'context-only'].includes(d.status));
  const expected = incomplete ? 'insufficient-evidence' : r.dimensions.every(d => d.status === 'exact-recorded') ? 'recorded-conditions-match' : 'conditions-differ';
  if (new Set(r.dimensions.map(d => d.field)).size !== 6 || r.conclusion !== expected || r.dimensions.some(d =>
    (d.status === 'target-unspecified') !== (d.target === null) ||
    (d.basis === 'unknown' ? d.source !== null || d.citations.length !== 0 : d.source === null || d.citations.length !== 1) ||
    (d.status === 'exact-recorded' && (d.basis !== 'recorded' || !equalRecordedCondition(d.target, d.source))) ||
    (d.status === 'source-not-recorded' && d.basis !== 'unknown') ||
    (d.status === 'context-only' && (d.basis === 'recorded' || d.basis === 'unknown'))))
    ctx.addIssue({ code: 'custom', message: 'Transfer classifications must retain known/unknown provenance and complete dimensions' });
});
export const TransferDataSchema = z.strictObject({ analysisVersion: z.literal('condition-transfer-v1'), environment: EnvironmentSchema,
  targetConditions: TargetConditionsSchema, records: z.array(TransferRecordSchema).min(1).max(4), coverage: CoverageSchema,
  scope: z.literal('condition-comparison-not-safety-prediction') });
export const TransferResponseSchema = envelope(TransferDataSchema);
export const IntelligenceRequestSchema = RankRequestSchema.extend({ environment: EnvironmentSchema.default('custom'), limit: z.number().int().min(1).max(4).default(4) });
export const IntelligenceResponseSchema = envelope(z.strictObject({ intelligenceVersion: z.literal('scientific-intelligence-v1'),
  producer: z.literal('deterministic-source-templates-no-model'),
  ranking: RankResponseSchema.shape.data, summary: AskResponseSchema.shape.data,
  transfer: TransferDataSchema.nullable(), transferNote: TextSchema,
  scope: z.literal('research-support-not-operational-fire-safety-advice')
}));
export type TransferRequest = z.infer<typeof TransferRequestSchema>;
export type TransferRecord = z.infer<typeof TransferRecordSchema>;
