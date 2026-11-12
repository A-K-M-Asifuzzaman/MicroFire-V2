import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { IntelligenceRequestSchema, IntelligenceResponseSchema } from '@microfire/shared';
import { scientificIntelligence, catalog, catalogSha256, investigationLibrary, verifyAnswerStatements, verifyCitations } from '@microfire/science';
import gold from '../data/evals/intelligence-gold.json';

const cases = gold.cases.map(c => {
  const request = IntelligenceRequestSchema.parse(c.request);
  const run = () => IntelligenceResponseSchema.parse({ apiVersion: '1', data: scientificIntelligence(request) }).data;
  const result = run(), record = result.transfer?.records[0];
  const actual = { abstained: result.summary.abstained, topExperimentId: result.ranking.items[0]?.experimentId ?? null,
    transferConclusion: record?.conclusion ?? null,
    dimensionStatuses: record ? Object.fromEntries(record.dimensions.map(d => [d.field, d.status])) : null,
    abstentionCode: result.summary.abstained ? result.summary.code : null,
    answerIncludes: c.expect.answerIncludes === null ? null : !result.summary.abstained && result.summary.answer.includes(c.expect.answerIncludes) };
  const expected = { ...c.expect, answerIncludes: c.expect.answerIncludes === null ? null : true };
  const repeatable = isDeepStrictEqual(result, run());
  const lineageValid = result.summary.abstained || verifyAnswerStatements(result.summary.statements);
  return { id: c.id, expected, actual, repeatable, lineageValid, passed: isDeepStrictEqual(actual, expected) && repeatable && lineageValid };
});
const claim = catalog.experiments[0]!.claims[0]!, citation = claim.citations[0]!;
const alteredLocator = structuredClone(citation);
if (alteredLocator.locator.kind === 'pdf') alteredLocator.locator.page++;
const citationCases = [
  { id: 'exact-observation-citation', subject: { type: 'claim' as const, claimId: claim.id }, citations: [citation], expected: 'lineage-verified' },
  { id: 'wrong-page', subject: { type: 'claim' as const, claimId: claim.id }, citations: [alteredLocator], expected: 'lineage-mismatch' },
  { id: 'unknown-source', subject: { type: 'claim' as const, claimId: claim.id }, citations: [{ ...citation, sourceId: 'not-a-nasa-source' }], expected: 'lineage-mismatch' },
  { id: 'missing-citation', subject: { type: 'claim' as const, claimId: claim.id }, citations: [], expected: 'lineage-mismatch' },
  { id: 'observation-cannot-cite-unknown-pressure', subject: { type: 'condition' as const, experimentId: 'bass2-b20', field: 'pressureKpa' as const }, citations: [citation], expected: 'lineage-mismatch' }
].map(c => {
  const actual = verifyCitations(c).verdict;
  return { id: c.id, expected: c.expected, actual, passed: actual === c.expected };
});
const admissionUnchanged = catalog.experiments.length === 1 && catalog.experiments[0]!.conditions.oxygenPct.value === 17.4 &&
  investigationLibrary().flatMap(i => i.admittedExperimentIds).join(',') === 'bass2-b20';
const report = { evaluationVersion: 'intelligence-regression-v2', datasetVersion: catalog.datasetVersion, catalogSha256,
  labels: gold.labelledBy, scope: gold.scope, independentScientificAcceptance: false,
  admissionUnchanged, cases, passed: cases.filter(c => c.passed).length, total: cases.length,
  citationCases, citationsPassed: citationCases.filter(c => c.passed).length, citationsTotal: citationCases.length };
writeFileSync('docs/evals/intelligence-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Intelligence regressions: ${report.passed}/${report.total}; citation regressions: ${report.citationsPassed}/${report.citationsTotal}; admission unchanged: ${admissionUnchanged}. Author-labelled checks, not independent scientific evaluation.`);
if (!admissionUnchanged || cases.some(c => !c.passed) || citationCases.some(c => !c.passed)) process.exitCode = 1;
