import { describe, expect, it } from 'vitest';
import { recordedActions } from '../../apps/web/game/campaign/view-adapter';
import type { PublicView } from '../../apps/web/game/campaign/public-transport';

// The Passport's "what you did" lines come only from server-confirmed view fields.
const base = { completedMissions: [], installedPartIds: [], sourceReviewed: false, prediction: null, explanation: null, appraisals: {}, habitat: null,
  decision: null, proposalCount: 0, trialStatements: [] } as unknown as PublicView;
describe('Passport recorded actions', () => {
  it('says nothing the server has not confirmed', () => { expect(recordedActions(base)).toEqual({}); });
  it('describes each mission from its own server fields, so no two entries match', () => {
    const v = { ...base, sourceReviewed: true, completedMissions: ['bass-assembly'], installedPartIds: Array(10).fill('fan'), prediction: 'Some of the sample may remain.',
      explanation: { correct: true, reasons: [] }, appraisals: { a: { correct: true, reasons: [] }, b: { correct: false, reasons: ['x'] } }, trialStatements: [{}, {}, {}, {}],
      habitat: { correct: true, reasons: [] }, decision: 'insufficient-evidence', proposalCount: 1 } as unknown as PublicView;
    const r = recordedActions(v), lines = Object.values(r);
    expect(Object.keys(r).sort()).toEqual(['bass-assembly', 'claim-trial', 'flame-detective', 'lunar-habitat', 'station-arrival']);
    expect(new Set(lines).size).toBe(5);
    expect(r['flame-detective']).toContain('“Some of the sample may remain.”');
    expect(r['claim-trial']).toContain('1 of 4');
    expect(r['lunar-habitat']).toContain('refuses any fire-safety certification');
  });
});
