import { FLOOR, type EnvOptions } from './bench-environment';
// Accepted Meshy assets for the artistic training bay (see data/asset-rights.json and docs/meshy-credit-ledger.md).
// Decoration only: the apparatus, mounts and every gameplay outcome stay procedural and server-decided.
// The hero workstation and the window wall are procedural; the Meshy workstation serves as a side console.
// Heights are scene units (10 cm). Its desk surface is at 42% of the model's height (measured from upward-facing
// triangles), so 21.4 units gives a 0.9 m desk; footprint 0.55 turns Meshy's 3.3 m desk into a realistic 1.8 m one.
const M = '/models/lab';
// Chamber housing (Meshy pilot): an open gantry frame scaled 2× (3.8 × 2.76 × 3.1 units) so its pillars clear the
// apparatus and its view cones. Its own pedestal (top at 10.75% of height, measured) is sunk just under the instrument
// plate (y −0.664), so the apparatus is never moved or covered: 2.76 × 0.1075 = 0.297 below the plate, less 1 cm.
export const LAB_ENVIRONMENT: Omit<EnvOptions, 'lite'> | null = {
  manifest: [
    { url: `${M}/chamber/chamber.gltf`, height: 2.76, position: [0, -0.971, 0], detail: 'full' }, // desktop only: on phones the pulled-back camera puts its truss across the view
    { url: `${M}/bench/bench.gltf`, height: 21.4, position: [-27, FLOOR, -0.5], rotationY: Math.PI / 2, tint: 0.35, footprint: 0.55, detail: 'full' },
    { url: `${M}/cabinet/cabinet.gltf`, height: 20, position: [24, FLOOR, -2.5], rotationY: -0.6, tint: 0.55, detail: 'full' },
    { url: `${M}/cart/cart.gltf`, height: 11, position: [15, FLOOR, 6], rotationY: -1.0, tint: 0.65, detail: 'full' }
  ],
  // Design A's re-textured suit (navy panels, orange accents; M4 retexture, 10 credits) on the same rigged, animated body.
  astronaut: {
    url: '/models/astronaut-suit/astronaut.gltf', tint: '#ffffff',
    clips: { idle: 'Idle', wave: 'Wave_One_Hand', look: 'Short_Breathe_and_Look_Around', cheer: 'Victory_Fist_Pump' }
  }
};
