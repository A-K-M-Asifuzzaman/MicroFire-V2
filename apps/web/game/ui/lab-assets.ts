import { FLOOR, type EnvOptions } from './bench-environment';
// Accepted Meshy assets for the artistic training bay (see data/asset-rights.json and docs/meshy-credit-ledger.md).
// Decoration only: the apparatus, mounts and every gameplay outcome stay procedural and server-decided.
// The hero workstation and the window wall are procedural; the Meshy workstation serves as a side console.
// Heights are scene units (10 cm). Its desk surface is at 42% of the model's height (measured from upward-facing
// triangles), so 21.4 units gives a 0.9 m desk; footprint 0.55 turns Meshy's 3.3 m desk into a realistic 1.8 m one.
const M = '/models/lab';
export const LAB_ENVIRONMENT: Omit<EnvOptions, 'lite'> | null = {
  manifest: [
    { url: `${M}/bench/bench.gltf`, height: 21.4, position: [-27, FLOOR, -0.5], rotationY: Math.PI / 2, tint: 0.35, footprint: 0.55, detail: 'full' },
    { url: `${M}/cabinet/cabinet.gltf`, height: 20, position: [24, FLOOR, -2.5], rotationY: -0.6, tint: 0.55, detail: 'full' },
    { url: `${M}/cart/cart.gltf`, height: 11, position: [15, FLOOR, 6], rotationY: -1.0, tint: 0.65, detail: 'full' }
  ],
  astronaut: {
    url: '/models/astronaut/astronaut.gltf',
    clips: { idle: 'Idle', wave: 'Wave_One_Hand', look: 'Short_Breathe_and_Look_Around', cheer: 'Victory_Fist_Pump' }
  }
};
