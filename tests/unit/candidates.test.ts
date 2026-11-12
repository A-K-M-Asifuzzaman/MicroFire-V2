import { expect, it } from 'vitest';
import { CandidateReviewSchema, candidateReview, catalog, assertNoQuarantinedRecords, isQuarantinedId, searchExperiments, answerQuestion } from '@microfire/science';
it('keeps new primary-source candidates quarantined, including after an experiment ID is renamed', () => {
  expect(catalog.experiments).toHaveLength(1);
  for (const c of candidateReview.records) {
    expect(isQuarantinedId(c.id)).toBe(true); expect(searchExperiments({ q: c.id })).toEqual([]);
    const dataset = structuredClone(catalog), record = structuredClone(dataset.experiments[0]!);
    record.id = c.id; dataset.experiments.push(record); expect(() => assertNoQuarantinedRecords(dataset)).toThrow();
    if (c.testId) { record.id = 'renamed-candidate'; record.testId = c.testId; expect(() => assertNoQuarantinedRecords(dataset)).toThrow(); }
  }
  expect(answerQuestion({ question: 'What happened in FLEX-062?', targetConditions: {} }).abstained).toBe(true);
});
it('preserves units, uncertain values, exact locators and the source review gate', () => {
  const byId = (id: string) => candidateReview.records.find(r => r.id === id)!;
  expect(byId('candidate-flex-062').raw).toMatchObject({ oxygenMoleFraction: 0.17, pressureAtm: 1, DcoolApproxUnconfirmedUnit: '~1.6' });
  expect(byId('candidate-saffire-v-2').raw).toMatchObject({ oxygenMolPct: 26.2, ambientPressureKpa: 70.7 });
  expect(byId('candidate-saffire-v-2').locators[0]!.page).toBe(3);
  expect(byId('candidate-acme-overview')).toMatchObject({ kind: 'source-lead', testId: null });
  expect(CandidateReviewSchema.safeParse({ ...candidateReview, status: 'approved' }).success).toBe(false);
  expect(CandidateReviewSchema.safeParse({ ...candidateReview, sources: [{ ...candidateReview.sources[0], url: 'https://evil.example/report.pdf' }] }).success).toBe(false);
});
