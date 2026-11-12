import type { Citation } from './science';
import type { PartId } from './game';
import { equipmentCopy } from './equipment';

/** Hardware description used to justify the part list and placements. Placement order is an educational model, not a NASA procedure. */
export const BASS_HARDWARE_CITATION: Citation = {
  sourceId: 'nasa-bass-ii-20210011385',
  locator: { kind: 'pdf', page: 12, printedPage: '4', section: 'Section 1.2 Experiment Description, BASS–II hardware' }
};
export type PartDefinition = { id: PartId; anchorId: string; requires: readonly PartId[]; orientationFault: { message: string; repair: string } | null; sourceNote: string; label:string; anchorLabel:string };
const definitions = [
  { id: 'flow-duct', anchorId: 'msg-work-volume-mount', requires: [], orientationFault: null, sourceNote: '7.6 × 7.6 × 17 cm rectangular flow duct installed in the Microgravity Science Glovebox.' },
  { id: 'fan', anchorId: 'duct-inlet', requires: ['flow-duct'], orientationFault: { message: 'The fan is reversed, so it would not blow flow through the duct toward the test section.', repair: 'Remove the fan and reinstall it at the duct inlet facing into the duct.' }, sourceNote: 'Flow was blown through the duct by a variable-speed fan.' },
  { id: 'flow-straightener', anchorId: 'duct-honeycomb-slot', requires: ['flow-duct'], orientationFault: null, sourceNote: 'Flow passed through a honeycomb flow straightener and inlet screen to reduce swirl.' },
  { id: 'nitrogen-nozzle', anchorId: 'test-section-n2-port', requires: ['flow-duct'], orientationFault: null, sourceNote: 'A nozzle for N2 flow was inside the test section.' },
  { id: 'sample-holder', anchorId: 'top-mounting-rail', requires: ['flow-duct'], orientationFault: { message: 'The sample is mounted for concurrent flow, but the documented B20 run is opposed flow; its observation would not apply.', repair: 'Remove the sample holder and remount it in the opposed-flow orientation.' }, sourceNote: 'The top window was replaced by a mounting rail for solid samples; samples could be mounted for opposed or concurrent flow.' },
  { id: 'igniter', anchorId: 'front-window-igniter-lever', requires: ['sample-holder'], orientationFault: null, sourceNote: 'A hot-wire igniter coil was moved into position with a deployment lever; sample and igniter were changed through the front window.' },
  { id: 'still-camera', anchorId: 'top-window', requires: ['sample-holder'], orientationFault: { message: 'The still camera faces away from the top window, so the sample is out of view.', repair: 'Remove the still camera and reinstall it looking through the top window.' }, sourceNote: 'A still camera with a 60-mm lens used the top window.' },
  { id: 'video-camera', anchorId: 'front-window-mirror', requires: ['sample-holder'], orientationFault: { message: 'The video camera faces away from the turning mirror, so it cannot see the front window.', repair: 'Remove the video camera and reinstall it facing the turning mirror at the front window.' }, sourceNote: 'A color video camera with a turning mirror looked in the front window.' },
  { id: 'radiometer', anchorId: 'downstream-top-back-corner', requires: ['flow-duct'], orientationFault: { message: 'The radiometer faces downstream, but it must view the upstream direction where the flame is.', repair: 'Remove the radiometer and reinstall it in the downstream corner viewing upstream.' }, sourceNote: 'A thermopile detector sat in the downstream top back corner viewing upstream; its signal was not calibrated.' },
  { id: 'exit-plate', anchorId: 'duct-exit', requires: ['flow-duct'], orientationFault: null, sourceNote: 'The duct exit contained a perforated copper plate followed by a brass screen.' }
] satisfies readonly Omit<PartDefinition,'label'|'anchorLabel'>[];
export const partDefinitions:readonly PartDefinition[]=definitions.map(p=>({...p,label:equipmentCopy[p.id].label,anchorLabel:equipmentCopy[p.id].anchorLabel}));
export const equipmentDefinitions=partDefinitions;
