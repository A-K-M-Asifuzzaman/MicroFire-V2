import { describe, expect, it } from 'vitest';
import { toyFlame } from '../../apps/web/components/flame-lab';

// The Flame Lab is an authored toy model: these tests pin only the DIRECTION of each effect it illustrates.
describe('Flame Lab toy model', () => {
  const base = { g: 0.5, flow: 5, o2: 20 };
  it('stretches the flame as gravity (buoyancy) increases', () => {
    expect(toyFlame({ ...base, g: 1 }).stretch).toBeGreaterThan(toyFlame({ ...base, g: 0 }).stretch);
  });
  it('makes the flame bluer and rounder without buoyancy', () => {
    expect(toyFlame({ ...base, g: 0 }).blue).toBeGreaterThan(toyFlame({ ...base, g: 1 }).blue);
  });
  it('leans the flame more with stronger opposed airflow, and not at all with none', () => {
    expect(toyFlame({ ...base, flow: 0 }).lean).toBe(0);
    expect(toyFlame({ ...base, flow: 15 }).lean).toBeGreaterThan(toyFlame({ ...base, flow: 5 }).lean);
  });
  it('enlarges and brightens the flame with more oxygen, within bounds', () => {
    const lo = toyFlame({ ...base, o2: 15 }), hi = toyFlame({ ...base, o2: 25 });
    expect(hi.size).toBeGreaterThan(lo.size); expect(hi.brightness).toBeGreaterThan(lo.brightness);
    expect(hi.size).toBeLessThanOrEqual(1.25); expect(lo.brightness).toBeGreaterThanOrEqual(0.4);
  });
});
