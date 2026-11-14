import { describe, expect, it } from 'vitest';
import { B20_SETTINGS, DEFAULTS, evidence, PROTOCOL, regime, shapeOf, sweep, toCsv, type Run } from '../../apps/web/lib/lab-engine';
import { b20Facts, investigations, nasaMedia } from '../../apps/web/lib/lab-nasa';

describe('Flame Lab engine', () => {
  it('compares B20 settings with the real record: three conditions match, gravity stays unreported, never a safety verdict', () => {
    const e = evidence(B20_SETTINGS);
    expect(Object.fromEntries(e.rows.map((r) => [r.field, r.status]))).toEqual({ gravity: 'source-not-recorded', material: 'exact-recorded', oxygenPct: 'exact-recorded', flowCmS: 'exact-recorded' });
    expect(e.conclusion).toBe('insufficient-evidence');
    expect(e.safety.abstained).toBe(true);
  });
  it('keeps pressure unknown for B20 when the visitor sets one, and never fills it in', () => {
    const p = evidence({ ...DEFAULTS, pressure: 55 }).rows.find((r) => r.field === 'pressureKpa')!;
    expect(p.status).toBe('source-not-recorded'); expect(p.source).toBeNull();
  });
  it('labels toy regimes by direction of effect', () => {
    expect(regime({ gravity: 'earth', o2: 21, flow: 0, pressure: 101.3 }).id).toBe('buoyant');
    expect(regime({ gravity: 'orbit', o2: 21, flow: 0, pressure: 101.3 }).id).toBe('diffusion');
    expect(regime({ gravity: 'orbit', o2: 21, flow: 5, pressure: 101.3 }).id).toBe('flow-fed');
    expect(regime({ gravity: 'orbit', o2: 16, flow: 0, pressure: 101.3 }).id).toBe('starved');
    expect(shapeOf(B20_SETTINGS)).toBe('leaning');
  });
  it('sweeps gravity from 0 to 1 g with a taller toy flame at higher gravity', () => {
    const s = sweep(DEFAULTS); expect(s).toHaveLength(11); expect(s.at(-1)!.height).toBeGreaterThan(s[0]!.height);
  });
  it('has a six-step run sequence and a notebook CSV that says illustrations are not data', () => {
    expect(PROTOCOL.map((p) => p.id)).toEqual(['configure', 'atmosphere', 'airflow', 'ignite', 'observe', 'record']);
    const run: Run = { n: 1, at: '2026-11-14 12:00:00', settings: B20_SETTINGS, prediction: 'leaning', toy: 'leaning', regime: 'Fed by the airflow', conclusion: 'insufficient evidence', matches: 3, asked: 4 };
    const csv = toCsv([run]);
    expect(csv.split('\n')[1]).toContain('"not set"'); expect(csv).toMatch(/not measurements/);
  });
});

describe('Flame Lab NASA material', () => {
  it('uses only the admitted B20 values, NASA media with captions and the four investigation descriptions', () => {
    const b = b20Facts();
    expect(b.conditions.find((c) => c.label === 'Calibrated oxygen')?.value).toMatch(/17\.4/);
    expect(b.conditions.find((c) => c.label === 'Pressure')?.known).toBe(false);
    const m = nasaMedia(); expect(m.map((x) => x.slug)).toEqual(['bass-cassidy-2013', 'bass2-reduced-o2-gmt213', 'saffire-vi-pmma', 'saffire-v-ribs']);
    for (const x of m) { expect(x.page).toMatch(/^https:\/\/images\.nasa\.gov\//); expect(x.caption.length).toBeGreaterThan(40); }
    const inv = investigations(); expect(inv.map((i) => i.program)).toEqual(['BASS-II', 'FLEX', 'ACME', 'Saffire IV/V']);
    expect(inv.find((i) => i.program === 'BASS-II')!.admitted).toBe(1); expect(inv.filter((i) => i.admitted > 0)).toHaveLength(1);
  });
});
