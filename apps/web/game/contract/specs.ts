import { equipmentCopy, equipmentDefinitions } from './equipment-copy';
import type { PartSpec } from '../contract';

/** The frozen equipment language as plain props (labels, anchors, dependencies, source notes). */
export const toPartSpecs = (): PartSpec[] => equipmentDefinitions.map((p) => ({
  id: p.id, label: p.label, anchorId: p.anchorId, anchorLabel: p.anchorLabel, requires: [...p.requires],
  sourceNote: p.sourceNote, reversedRepair: (equipmentCopy[p.id] as { reversed?: { repair: string } }).reversed?.repair ?? null
}));
