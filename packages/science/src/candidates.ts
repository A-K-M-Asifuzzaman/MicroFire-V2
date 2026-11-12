import { z } from 'zod';
import { HttpsUrlSchema, IdSchema } from '@microfire/shared';
import review from '../../../data/candidates/review-20261112.json';
import november13Review from '../../../data/candidates/review-20261113.json';
const source = z.strictObject({ id: IdSchema, url: HttpsUrlSchema.refine(s => new URL(s).hostname === 'ntrs.nasa.gov'), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive().max(60000000), inspectedAt: z.iso.date(), inspection: z.string().min(1) });
export const CandidateReviewSchema = z.strictObject({
  schemaVersion: z.literal(1), status: z.literal('quarantined-pending-independent-review'), sources: z.array(source).min(1),
  records: z.array(z.strictObject({ id: IdSchema, program: z.string().min(1), testId: z.string().min(1).nullable(), kind: z.enum(['experiment-candidate', 'source-lead']), sourceId: IdSchema,
    locators: z.array(z.strictObject({ page: z.number().int().positive(), printedPage: z.string().min(1), section: z.string().min(1) })).min(1),
    raw: z.record(z.string(), z.union([z.string(), z.number(), z.null()])), statement: z.string().min(1), missing: z.array(z.string()).min(1), issues: z.array(z.string()).min(1)
  })).min(1), psiDiscovery: z.strictObject({ url: HttpsUrlSchema, result: z.string().min(1) })
}).superRefine((r, ctx) => {
  if (new Set(r.sources.map(s => s.id)).size !== r.sources.length || new Set(r.records.map(c => c.id)).size !== r.records.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate candidate/source identity' });
  for (const c of r.records) if (!r.sources.some(s => s.id === c.sourceId) || (c.kind === 'experiment-candidate' && c.testId === null))
    ctx.addIssue({ code: 'custom', message: 'Candidate requires a source and experiment identity' });
});
export const candidateReview = CandidateReviewSchema.parse(review);
export const candidateReviews = [candidateReview, CandidateReviewSchema.parse(november13Review)];
