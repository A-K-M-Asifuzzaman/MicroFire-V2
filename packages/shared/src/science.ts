import { z } from 'zod';

export const IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const TextSchema = z.string().trim().min(1).max(4000);
export const HttpsUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'A credential-free HTTPS URL is required');
export const CitationSchema = z.strictObject({
  sourceId: IdSchema,
  locator: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('pdf'), page: z.number().int().positive(), printedPage: TextSchema, section: TextSchema }),
    z.strictObject({ kind: z.literal('section'), section: TextSchema })
  ])
});
export const SourceSchema = z.strictObject({
  id: IdSchema, title: TextSchema, institution: TextSchema, documentId: TextSchema,
  url: HttpsUrlSchema, documentUrl: HttpsUrlSchema, accessedAt: z.iso.datetime(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rights: z.strictObject({ statement: TextSchema, reuse: z.enum(['facts-only', 'permission-reviewed', 'blocked']), notes: TextSchema }),
  verification: z.strictObject({ method: z.literal('primary-source-inspection'), verifiedAt: z.iso.datetime(), notes: TextSchema })
});
export const EvidenceLevelSchema = z.enum(['direct', 'analogous', 'mechanistic', 'gap']);
export const StatementTypeSchema = z.enum(['observed', 'derived', 'interpretation', 'hypothesis', 'unknown']);
export const ContentOriginSchema = z.enum(['research', 'authored-tutorial', 'fictional-scenario']);
const UnknownSchema = z.strictObject({ status: z.literal('unknown'), value: z.null(), reason: TextSchema });
const numeric = (value: z.ZodNumber, unit: string) => z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('known'), value, unit: z.literal(unit), basis: z.enum(['recorded', 'series', 'derived']), citation: CitationSchema, note: TextSchema }),
  UnknownSchema
]);
const categorical = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('known'), value: TextSchema, basis: z.enum(['recorded', 'series']), citation: CitationSchema, note: TextSchema }), UnknownSchema
]);
export const ConditionsSchema = z.strictObject({
  gravity: categorical, material: categorical, geometry: categorical, flowDirection: categorical,
  oxygenPct: numeric(z.number().min(0).max(100), 'vol%'),
  pressureKpa: numeric(z.number().positive(), 'kPa'),
  flowCmS: numeric(z.number().nonnegative(), 'cm/s'),
  thicknessMm: numeric(z.number().positive(), 'mm')
});
export const ClaimSchema = z.strictObject({
  id: IdSchema, text: TextSchema, kind: StatementTypeSchema, origin: ContentOriginSchema,
  citations: z.array(CitationSchema).max(20), limitations: z.array(TextSchema).min(1).max(20)
}).superRefine((claim, ctx) => {
  if (['observed', 'derived', 'interpretation'].includes(claim.kind) && !claim.citations.length)
    ctx.addIssue({ code: 'custom', message: 'Evidence-bearing statements need source locators' });
  if (claim.kind === 'observed' && claim.origin !== 'research')
    ctx.addIssue({ code: 'custom', message: 'Fiction and tutorials cannot create observations' });
});
export const ExperimentSchema = z.strictObject({
  id: IdSchema, program: TextSchema, testId: TextSchema, title: TextSchema,
  origin: z.literal('research'), sourceIds: z.array(IdSchema).min(1).max(20),
  conditions: ConditionsSchema, rawFlow: TextSchema,
  claims: z.array(ClaimSchema).min(1).max(100), limitations: z.array(TextSchema).min(1).max(20),
  provenance: z.strictObject({
    upstreamRepository: HttpsUrlSchema, upstreamCommit: z.string().regex(/^[a-f0-9]{40}$/),
    upstreamPath: TextSchema, upstreamRecordId: TextSchema,
    upstreamFileSha256: z.string().regex(/^[a-f0-9]{64}$/),
    validation: z.literal('primary-source-checked'), corrections: z.array(TextSchema)
  })
});
export const CatalogSchema = z.strictObject({
  schemaVersion: z.literal(1), datasetVersion: IdSchema,
  sources: z.array(SourceSchema).min(1), experiments: z.array(ExperimentSchema).min(1)
}).superRefine((catalog, ctx) => {
  const sources = new Set(catalog.sources.map((source) => source.id));
  const unique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: `Duplicate ${label}` });
  };
  unique(catalog.sources.map((s) => s.id), 'source IDs');
  unique(catalog.experiments.map((e) => e.id), 'experiment IDs');
  unique(catalog.experiments.flatMap((e) => e.claims.map((c) => c.id)), 'claim IDs');
  for (const experiment of catalog.experiments) {
    const citations = [...experiment.claims.flatMap((c) => c.citations),
      ...Object.values(experiment.conditions).flatMap((c) => c.status === 'known' ? [c.citation] : [])];
    for (const id of [...experiment.sourceIds, ...citations.map((c) => c.sourceId)]) {
      if (!sources.has(id) || !experiment.sourceIds.includes(id))
        ctx.addIssue({ code: 'custom', message: `Unresolved source ${id} in ${experiment.id}` });
    }
  }
});
export type Catalog = z.infer<typeof CatalogSchema>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type StatementType = z.infer<typeof StatementTypeSchema>;
