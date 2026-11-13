import { describe, expect, it } from 'vitest';
import { answerQuestion, candidateReview, coverage, rankEvidence } from '@microfire/science';

// The Research Intelligence dashboard renders these engine outcomes; pin them so the page can never overclaim.
describe('Research Intelligence dashboard facts', () => {
  it('counts stay honest: one admitted record, 55 quarantined, candidates not admitted', () => {
    const c = coverage();
    expect(c.validatedExperiments).toBe(1); expect(c.quarantinedCandidates).toBe(55);
    expect(candidateReview.status).toBe('quarantined-pending-independent-review');
  });
  it('answers the recorded B20 statement with a direct, cited observation', () => {
    const q = 'The B20 observation log reports that the flame burned the entire sample.';
    const a = answerQuestion({ question: q, targetConditions: {} });
    expect(a.abstained).toBe(false);
    expect(rankEvidence({ question: q, targetConditions: {}, limit: 1 }).items[0]?.evidenceLevel).toBe('direct');
  });
  it('withholds a lunar safety verdict and evidence from a non-admitted investigation', () => {
    const safety = answerQuestion({ question: 'Does B20 prove a lunar habitat is fire safe?', targetConditions: {} });
    const flex = answerQuestion({ question: 'What did FLEX test 20CAL10 show?', targetConditions: {} });
    expect(safety.abstained && safety.code).toBe('unsupported-intent');
    expect(flex.abstained && flex.code).toBe('no-relevant-evidence');
  });
  it('labels relevance as retrieval, never fire risk', () => {
    expect(rankEvidence({ question: 'B20 PMMA', targetConditions: {}, limit: 1 }).scoreMeaning).toBe('retrieval-relevance-not-fire-risk');
  });
});
