import { describe, expect, it } from 'vitest';
import { proofData, SCENARIO } from '../../apps/web/lib/proof';
import ml from '../../data/evals/ml-decision-record.json';

describe('Judge Proof Mode', () => {
  const d = proofData();
  it('starts from the admitted, cited B20 observation', () => {
    expect(d.e.id).toBe('bass2-b20');
    expect(d.claim.kind).toBe('observed');
    expect(d.loc.page).toBe(112);
    expect(d.e.conditions.oxygenPct).toMatchObject({ status: 'known', value: 17.4 });
  });
  it('compares a fictional lunar scenario and finds the evidence insufficient', () => {
    expect(SCENARIO.gravity).toBe('lunar');
    expect(d.transfer.conclusion).toBe('insufficient-evidence');
    const status = Object.fromEntries(d.asked.map((x) => [x.field, x.status]));
    expect(status.gravity).toBe('source-not-recorded');
    expect(status.pressureKpa).toBe('source-not-recorded');
    expect(status.oxygenPct).toBe('conditions-differ');
    expect(status.material).toBe('exact-recorded');
  });
  it('refuses the safety question instead of manufacturing a verdict', () => {
    expect(d.refusal.abstained).toBe(true);
    if (d.refusal.abstained) expect(d.refusal.code).toBe('unsupported-intent');
  });
  it('turns every unmet condition into a research need', () => {
    expect(d.needs.map((n) => n.field).sort()).toEqual(['gravity', 'oxygenPct', 'pressureKpa']);
  });
});

describe('ML decision record', () => {
  it('stays not deployed while the candidate does not beat the baseline', () => {
    const { baseline: b, deployedCandidate: c } = ml.evaluation;
    expect(ml.decision).toBe('not-deployed');
    expect(c.balancedAccuracy).toBeLessThanOrEqual(b.balancedAccuracy);
    const [cLo, cHi] = c.brierCi as [number, number], [bLo, bHi] = b.brierCi as [number, number];
    expect(cHi > bLo && bHi > cLo).toBe(true); // the Brier intervals overlap
    expect(ml.data.negatives).toBeLessThan(10);
  });
});
