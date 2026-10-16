import type { BenchEnvironment } from './bench-scene';
import { FLOOR } from './bench-environment';
// Accepted Meshy assets for the artistic training bay (see data/asset-rights.json and docs/meshy-credit-ledger.md).
// Decoration only: the apparatus, mounts and every gameplay outcome stay procedural and server-decided.
// Heights are scene units (10 cm). The desk's work surface is at 42% of the bench model's height (measured from
// its upward-facing triangles), so a 21.4-unit model puts the surface at 0.9 m, exactly under the apparatus.
const M = '/models/lab';
export const LAB_ENVIRONMENT: Omit<NonNullable<BenchEnvironment>, 'onReady' | 'lite'> | null = {
  manifest: [
    { url: `${M}/bench/bench.gltf`, height: 21.4, position: [0, FLOOR, -4], tint: 0.35, detail: 'lite' },
    { url: `${M}/wall/wall.gltf`, height: 30, position: [0, FLOOR, -16], tint: 0.55, detail: 'lite' },
    { url: `${M}/wall/wall.gltf`, height: 30, position: [-19.6, FLOOR, -16], tint: 0.55, detail: 'full' },
    { url: `${M}/wall/wall.gltf`, height: 30, position: [19.6, FLOOR, -16], tint: 0.55, detail: 'full' },
    { url: `${M}/cabinet/cabinet.gltf`, height: 20, position: [28, FLOOR, -5], rotationY: -0.7, detail: 'full' },
    { url: `${M}/cart/cart.gltf`, height: 11, position: [23, FLOOR, 9], rotationY: -1.1, detail: 'full' }
  ],
  astronaut: {
    url: '/models/astronaut/astronaut.gltf',
    clips: { idle: 'Idle', wave: 'Wave_One_Hand', look: 'Short_Breathe_and_Look_Around', cheer: 'Victory_Fist_Pump' }
  }
};
