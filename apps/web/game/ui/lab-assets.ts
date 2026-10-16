import { FLOOR, type EnvOptions } from './bench-environment';
// Accepted Meshy assets for the artistic training bay (see data/asset-rights.json and docs/meshy-credit-ledger.md).
// Decoration only: the apparatus, mounts and every gameplay outcome stay procedural and server-decided.
// Heights are scene units (10 cm). The desk's work surface is at 42% of the bench model's height (measured from
// its upward-facing triangles), so a 21.4-unit model puts the surface at 0.9 m, exactly under the apparatus.
// The model sits 5 cm low: its desk top undulates, and the apparatus's work mat must always lie on top of it.
// Meshy made the desk 3.3 m wide; footprint 0.55 gives a realistic 1.8 × 0.85 m bench so the true-scale apparatus isn't dwarfed.
const M = '/models/lab';
export const LAB_ENVIRONMENT: Omit<EnvOptions, 'lite'> | null = {
  manifest: [
    { url: `${M}/bench/bench.gltf`, height: 21.4, position: [0, FLOOR - 0.5, -1.5], tint: 0.2, footprint: 0.55, detail: 'lite' },
    { url: `${M}/wall/wall.gltf`, height: 30, position: [0, FLOOR, -12.5], tint: 0.3, detail: 'lite' },
    { url: `${M}/wall/wall.gltf`, height: 30, position: [19.6, FLOOR, -12.5], tint: 0.3, detail: 'full' },
    { url: `${M}/cabinet/cabinet.gltf`, height: 20, position: [17, FLOOR, -4], rotationY: -0.7, detail: 'full' },
    { url: `${M}/cart/cart.gltf`, height: 11, position: [13, FLOOR, 5], rotationY: -1.1, detail: 'full' }
  ],
  astronaut: {
    url: '/models/astronaut/astronaut.gltf',
    clips: { idle: 'Idle', wave: 'Wave_One_Hand', look: 'Short_Breathe_and_Look_Around', cheer: 'Victory_Fist_Pump' }
  }
};
