import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { IntelligenceRequestSchema, IntelligenceResponseSchema } from '@microfire/shared';
import { scientificIntelligence, catalog, catalogSha256, investigationLibrary, verifyAnswerStatements } from '@microfire/science';
import gold from '../data/evals/intelligence-gold.json';

const cases = gold.cases.map(c => {
  const request = IntelligenceRequestSchema.parse(c.request);
  const run = () => IntelligenceResponseSchema.parse({ apiVersion: '1', data: scientificIntelligence(request) }).data;
  const result = run(), record = result.transfer?.records[0];
  const actual = { abstained: result.summary.abstained, topExperimentId: result.ranking.items[0]?.experimentId ?? null,
    transferConclusion: record?.conclusion ?? null, oxygenStatus: record?.dimensions.find(d => d.field === 'oxygenPct')?.status ?? null,
    gravityStatus: record?.dimensions.find(d => d.field === 'gravity')?.status ?? null,
    abstentionCode: result.summary.abstained ? result.summary.code : null,
    answerIncludes: c.expect.answerIncludes === null ? null : !result.summary.abstained && result.summary.answer.includes(c.expect.answerIncludes) };
  const expected = { ...c.expect, answerIncludes: c.expect.answerIncludes === null ? null : true };
  const repeatable = isDeepStrictEqual(result, run());
  const lineageValid = result.summary.abstained || verifyAnswerStatements(result.summary.statements);
  return { id: c.id, expected, actual, repeatable, lineageValid, passed: isDeepStrictEqual(actual, expected) && repeatable && lineageValid };
});
const admissionUnchanged = catalog.experiments.length === 1 && catalog.experiments[0]!.conditions.oxygenPct.value === 17.4 &&
  investigationLibrary().flatMap(i => i.admittedExperimentIds).join(',') === 'bass2-b20';
const report = { evaluationVersion: 'intelligence-regression-v1', datasetVersion: catalog.datasetVersion, catalogSha256,
  labels: gold.labelledBy, scope: gold.scope, independentScientificAcceptance: false,
  admissionUnchanged, cases, passed: cases.filter(c => c.passed).length, total: cases.length };
writeFileSync('docs/evals/intelligence-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Intelligence regressions: ${report.passed}/${report.total}; admission unchanged: ${admissionUnchanged}. Author-labelled checks, not independent scientific evaluation.`);
if (!admissionUnchanged || cases.some(c => !c.passed)) process.exitCode = 1;
