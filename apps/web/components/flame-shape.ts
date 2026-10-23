// Shared illustrative flame outline (art direction, not computed): used by the Gravity Lens and the home comparison.
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f = (n: number) => n.toFixed(1);

/** Illustrative outline: a near-sphere at 0 g stretching to a buoyant teardrop at 1 g. Shape is art direction, not computed. */
export function flamePath(g: number, scale = 1, lift = 0) {
  const cx = 200, r = lerp(62, 42, g) * scale;
  const mid = lerp(215, 245, g) - lift, tip = lerp(215 - 62 * scale, 70 + (1 - scale) * 120, g) - lift, base = lerp(215 + 62 * scale, 285 - (1 - scale) * 30, g) - lift;
  const k = lerp(0.55, 0.08, g), up = (mid - tip) * 0.38, down = (base - mid) * 0.55;
  return `M${cx} ${f(tip)} C${f(cx + r * k)} ${f(tip + up * 0.2)} ${f(cx + r)} ${f(mid - up)} ${f(cx + r)} ${f(mid)} C${f(cx + r)} ${f(mid + down)} ${f(cx + r * 0.55)} ${f(base)} ${cx} ${f(base)} C${f(cx - r * 0.55)} ${f(base)} ${f(cx - r)} ${f(mid + down)} ${f(cx - r)} ${f(mid)} C${f(cx - r)} ${f(mid - up)} ${f(cx - r * k)} ${f(tip + up * 0.2)} ${cx} ${f(tip)}Z`;
}

