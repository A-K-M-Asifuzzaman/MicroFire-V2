// Flame Lab engine. Two layers, never mixed:
//  1. An AUTHORED, QUALITATIVE toy model (toyFlame, regime, sweep) that shows the DIRECTION of well-known effects
//     (buoyancy stretches a flame, opposed airflow feeds and leans it, more oxygen brightens it). It computes no
//     measurement, predicts no test and is never NASA data.
//  2. The real evidence engine (analyzeTransfer over the admitted catalog) that compares the visitor's settings with
//     what NASA recorded for BASS-II test B20, condition by condition, and refuses what the record cannot support.
import { analyzeTransfer, answerQuestion } from '@microfire/science';
import type { TargetConditions } from '@microfire/shared';

export type Gravity = 'orbit' | 'moon' | 'mars' | 'earth';
export const GRAVITY: Record<Gravity, { g: number; label: string; target: string; environment: 'spacecraft' | 'moon' | 'mars' | 'earth' }> = {
  orbit: { g: 0, label: 'Microgravity (orbit)', target: 'microgravity', environment: 'spacecraft' },
  moon: { g: 0.17, label: 'Moon (0.17 g)', target: 'lunar', environment: 'moon' },
  mars: { g: 0.38, label: 'Mars (0.38 g)', target: 'martian', environment: 'mars' },
  earth: { g: 1, label: 'Earth (1 g)', target: 'earth gravity', environment: 'earth' },
};
export type Settings = { gravity: Gravity; o2: number; flow: number; pressure: number | null };
export const DEFAULTS: Settings = { gravity: 'earth', o2: 21, flow: 0, pressure: 101.3 };
/** B20's recorded values where the catalog has them; pressure and run gravity stay unset because the source does not report them. */
export const B20_SETTINGS: Settings = { gravity: 'orbit', o2: 17.4, flow: 5, pressure: null };

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Toy-model outline: pure art direction from the settings. Exported for the unit tests (directions only). */
export function toyFlame({ g, flow, o2, pressure = 101.3 }: { g: number; flow: number; o2: number; pressure?: number | null }) {
  const p = clamp((pressure ?? 101.3) / 101.3, 0.3, 1.2);
  const size = clamp(0.75 + (o2 - 15) * 0.045, 0.6, 1.25) * (0.85 + 0.15 * p); // more oxygen → bigger
  const stretch = 1 + g * 1.6;                                                // buoyancy stretches upward
  const lean = clamp(flow / 20, 0, 1) * 0.55;                                 // opposed flow leans it downstream
  const blue = clamp(1 - g * 1.3 + (flow > 0 ? 0.05 : 0), 0, 1);              // weak buoyancy → bluer, soot-free look
  const brightness = clamp((0.55 + (o2 - 15) * 0.05) * (0.8 + 0.2 * p), 0.4, 1);
  return { size, stretch, lean, blue, brightness };
}

export type Regime = { id: 'buoyant' | 'partial' | 'flow-fed' | 'diffusion' | 'starved' | 'pushed'; label: string; note: string };
/** Qualitative regime of the TOY illustration (directions of effect, not a prediction for any real test). */
export function regime(s: Settings): Regime {
  const g = GRAVITY[s.gravity].g;
  if (g === 0 && s.flow < 1 && s.o2 < 18) return { id: 'starved', label: 'Dimming toward going out', note: 'With no buoyancy and no airflow, fresh oxygen reaches the toy flame only by slow diffusion; at low oxygen it fades.' };
  if (s.flow >= 15 && s.o2 < 19) return { id: 'pushed', label: 'Pushed hard by the airflow', note: 'A strong opposed airflow at modest oxygen can push a flame back from the sample; the toy flame flattens and leans.' };
  if (g === 0 && s.flow < 1) return { id: 'diffusion', label: 'Rounded and dim', note: 'Without buoyancy nothing carries hot gas away, so the toy flame stays round, small and blue.' };
  if (g === 0) return { id: 'flow-fed', label: 'Fed by the airflow', note: 'The opposed airflow brings the oxygen that buoyancy would bring on Earth; the toy flame leans into it.' };
  if (g < 0.5) return { id: 'partial', label: 'Weak buoyancy', note: 'Partial gravity gives a little buoyant flow, so the toy flame stretches only slightly.' };
  return { id: 'buoyant', label: 'Tall teardrop', note: 'Earth-like buoyancy carries hot gas upward and stretches the toy flame into a teardrop.' };
}

export const SHAPES = [['teardrop', 'Tall teardrop'], ['rounded', 'Round and dim'], ['leaning', 'Leaning into the airflow'], ['fading', 'Fading or pushed off']] as const;
export type Shape = (typeof SHAPES)[number][0];
const SHAPE_OF: Record<Regime['id'], Shape> = { buoyant: 'teardrop', partial: 'teardrop', 'flow-fed': 'leaning', diffusion: 'rounded', starved: 'fading', pushed: 'fading' };
export const shapeOf = (s: Settings): Shape => SHAPE_OF[regime(s).id];

/** Toy sweep across gravity at the current oxygen and airflow, for the "direction of effect" chart. */
export function sweep(s: Settings) {
  return Array.from({ length: 11 }, (_, i) => { const g = i / 10, t = toyFlame({ g, flow: s.flow, o2: s.o2, pressure: s.pressure }); return { g, height: t.size * t.stretch, width: t.size, blue: t.blue }; });
}

/** Protocol steps of a BASS-II-style run (the order follows NASA's description of the hardware; timings are for display). */
export const PROTOCOL = [
  { id: 'configure', label: 'Configure', ms: 0, say: 'Choose the gravity, oxygen, airflow and pressure for this run.' },
  { id: 'atmosphere', label: 'Atmosphere', ms: 1500, say: 'Bringing the chamber to the chosen oxygen level.' },
  { id: 'airflow', label: 'Airflow', ms: 1300, say: 'The fan sets the opposed airflow through the duct.' },
  { id: 'ignite', label: 'Ignite', ms: 1100, say: 'The hot-wire igniter heats the edge of the PMMA sample.' },
  { id: 'observe', label: 'Observe', ms: 3800, say: 'Watch the illustrated flame: shape, colour and lean.' },
  { id: 'record', label: 'Record', ms: 0, say: 'Compare your prediction, the toy illustration and the NASA record.' },
] as const;
export type Phase = (typeof PROTOCOL)[number]['id'];

/** The real comparison with BASS-II test B20 (admitted catalog, deterministic engine). */
export function evidence(s: Settings) {
  const target: TargetConditions = { gravity: GRAVITY[s.gravity].target, material: 'PMMA', oxygenPct: s.o2, flowCmS: s.flow, ...(s.pressure !== null ? { pressureKpa: s.pressure } : {}) };
  const rec = analyzeTransfer({ environment: GRAVITY[s.gravity].environment, experimentIds: ['bass2-b20'], targetConditions: target }).records[0]!;
  const safety = answerQuestion({ question: 'Is a habitat at these conditions fire-safe?', targetConditions: target });
  const rows = rec.dimensions.filter((d) => d.status !== 'target-unspecified');
  return { conclusion: rec.conclusion, rows, limitations: rec.limitations, safety, matches: rows.filter((d) => d.status === 'exact-recorded').length };
}

export type Run = { n: number; at: string; settings: Settings; prediction: Shape | null; toy: Shape; regime: string; conclusion: string; matches: number; asked: number };
export function toCsv(runs: Run[]) {
  const head = 'run,time,gravity,oxygen_vol_pct,airflow_cm_s,pressure_kpa,your_prediction,toy_illustration,regime,b20_comparison,conditions_matching_b20';
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [head, ...runs.map((r) => [r.n, r.at, r.settings.gravity, r.settings.o2, r.settings.flow, r.settings.pressure ?? 'not set', r.prediction ?? 'none', r.toy, r.regime, r.conclusion, `${r.matches}/${r.asked}`].map(q).join(','))].join('\n')
    + '\n"note","Toy-model illustrations are qualitative directions of effect, not measurements. Only BASS-II test B20 is NASA evidence here."\n';
}
