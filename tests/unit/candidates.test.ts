import { expect, it } from 'vitest';
import { CandidateReviewSchema, candidateReview, candidateReviews, catalog, assertNoQuarantinedRecords, isQuarantinedId, searchExperiments, answerQuestion, analyzeTransfer, scientificIntelligence } from '@microfire/science';
it('keeps new primary-source candidates quarantined, including after an experiment ID is renamed', () => {
  expect(catalog.experiments).toHaveLength(1);
  for (const c of candidateReviews.flatMap(r => r.records)) {
    expect(isQuarantinedId(c.id)).toBe(true); expect(searchExperiments({ q: c.id })).toEqual([]);
    const dataset = structuredClone(catalog), record = structuredClone(dataset.experiments[0]!);
    record.id = c.id; dataset.experiments.push(record); expect(() => assertNoQuarantinedRecords(dataset)).toThrow();
    if (c.testId) { record.id = 'renamed-candidate'; record.testId = c.testId; expect(() => assertNoQuarantinedRecords(dataset)).toThrow(); }
  }
  expect(answerQuestion({ question: 'What happened in FLEX-062?', targetConditions: {} }).abstained).toBe(true);
});
it('retains new Saffire raw uncertainty and refuses all prepared records as admitted evidence', () => {
  const review = candidateReviews[1]!;
  expect(review.status).toBe('quarantined-pending-independent-review');
  expect(review.records).toHaveLength(3);
  expect(review.records[0]!.raw).toMatchObject({ thicknessMm: 0.37, oxygenSourceText: '21.7 to 21.5', burnLengthSourceText: '~84 cm' });
  expect(review.records[1]!.raw).toMatchObject({ lengthSourceText: '~10 cm', oxygenSourceText: '~21.5' });
  expect(review.records[2]!.raw).toMatchObject({ burnDurationSourceText: 'Insignificant', spreadRateSourceText: 'n/a' });
  for (const r of review.records) {
    expect(r.locators[0]!.page).toBe(29);
    expect(() => analyzeTransfer({ environment: 'custom', experimentIds: [r.id], targetConditions: { oxygenPct: 21.7 } })).toThrow();
    const response = scientificIntelligence({ question: r.id, targetConditions: {}, environment: 'custom', limit: 4 });
    expect(response.ranking.items).toEqual([]);
    expect(response.summary.abstained).toBe(true);
    expect(answerQuestion({ question: `What happened with silicone in Saffire test ${r.testId}?`, targetConditions: {} }).abstained).toBe(true);
  }
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
