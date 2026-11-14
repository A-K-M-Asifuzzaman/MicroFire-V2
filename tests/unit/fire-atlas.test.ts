import { describe, expect, it } from 'vitest';
import { compare, investigations, rank, score, sources } from '../../apps/web/lib/fire-atlas';

describe('Fire-Safety Investigation Atlas', () => {
  it('cites a NASA or challenge source for every investigation, and only BASS-II carries an admitted record', () => {
    expect(investigations.length).toBeGreaterThanOrEqual(14);
    for (const i of investigations) { expect(sources).toHaveProperty(i.source); expect(i.nasa.length).toBeGreaterThan(30); }
    expect(investigations.filter((i) => i.admitted).map((i) => i.id)).toEqual(['bass-ii']);
  });
  it('explains every point of every score', () => {
    for (const i of investigations) { const s = score(i, 'lunar'); expect(s.total).toBe(s.reasons.reduce((a, r) => a + r.points, 0)); expect(s.reasons.length).toBeGreaterThan(0); }
  });
  it('ranks the lunar-gravity flammability test first for a lunar base, and fire-safety work above fundamental studies', () => {
    const lunar = rank('lunar');
    expect(lunar[0]!.inv.id).toBe('fm2');
    const worstSafety = Math.min(...lunar.filter((x) => x.inv.pillars.some((p) => p !== 'fundamental')).map((x) => x.total));
    const bestFundamental = Math.max(...lunar.filter((x) => x.inv.pillars.every((p) => p === 'fundamental')).map((x) => x.total));
    expect(worstSafety).toBeGreaterThan(bestFundamental);
  });
  it('compares two investigations field by field', () => {
    const [a, b] = [investigations.find((i) => i.id === 'bass')!, investigations.find((i) => i.id === 'flex')!];
    const rows = compare(a, b); expect(rows.find((r) => r.field === 'Where it ran')!.same).toBe(true); expect(rows.find((r) => r.field === 'Fuel')!.same).toBe(false);
  });
});
