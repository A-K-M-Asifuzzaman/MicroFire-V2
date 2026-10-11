import { GameActionSchema, GameStateSchema, features, resolveFeature, type GameState, type SessionMode } from '@microfire/shared';

export function createGameState(datasetVersion: string, mode: SessionMode, at: string): GameState {
  return GameStateSchema.parse({ schemaVersion: 1, datasetVersion, mode, guidance: 'guided', activeMission: null,
    completedMissions: [], inspectedExperimentIds: [], setup: { revision: 0, installedParts: [], qualifiedRevision: null },
    passport: { schemaVersion: 1, purpose: 'educational-research-record', entries: [] }, updatedAt: at });
}
export type TransitionResult = { ok: true; state: GameState } | { ok: false; state: GameState; code: 'INVALID_ACTION' | 'UNAVAILABLE' | 'NOT_IMPLEMENTED' | 'UNKNOWN_EXPERIMENT' };
export function transition(state: GameState, input: unknown, experimentIds: readonly string[], at: string): TransitionResult {
  GameStateSchema.parse(state);
  const action = GameActionSchema.safeParse(input);
  if (!action.success) return { ok: false, state, code: 'INVALID_ACTION' };
  if (action.data.type === 'START_MISSION') {
    const missionId = action.data.missionId;
    const feature = features.find((f) => f.id === missionId);
    if (!feature || resolveFeature(feature, state.completedMissions).state !== 'available')
      return { ok: false, state, code: 'UNAVAILABLE' };
  }
  if (action.data.type === 'INSPECT_EVIDENCE') {
    const id = action.data.experimentId;
    if (!experimentIds.includes(id)) return { ok: false, state, code: 'UNKNOWN_EXPERIMENT' };
    return { ok: true, state: GameStateSchema.parse({ ...state, inspectedExperimentIds: [...new Set([...state.inspectedExperimentIds, id])], updatedAt: at }) };
  }
  return { ok: false, state, code: 'NOT_IMPLEMENTED' };
}

export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const saveKey = (mode: SessionMode) => `microfire-v2:save:v1:${mode}`;
export type LoadResult = { status: 'loaded'; state: GameState } | { status: 'empty' | 'corrupt' | 'unsupported-version' | 'dataset-mismatch' | 'storage-unavailable' };
export function loadProgress(storage: SaveStorage, mode: SessionMode, datasetVersion: string): LoadResult {
  let raw: string | null;
  try { raw = storage.getItem(saveKey(mode)); } catch { return { status: 'storage-unavailable' }; }
  if (raw === null) return { status: 'empty' };
  if (raw.length > 500_000) return { status: 'corrupt' };
  try {
    const input: unknown = JSON.parse(raw);
    if (typeof input === 'object' && input !== null && 'schemaVersion' in input && input.schemaVersion !== 1)
      return { status: 'unsupported-version' };
    const result = GameStateSchema.safeParse(input);
    if (!result.success || result.data.mode !== mode) return { status: 'corrupt' };
    if (result.data.datasetVersion !== datasetVersion) return { status: 'dataset-mismatch' };
    return { status: 'loaded', state: result.data };
  } catch { return { status: 'corrupt' }; }
}
export function saveProgress(storage: SaveStorage, state: GameState): { ok: boolean; reason?: 'invalid-state' | 'storage-unavailable' | 'existing-save-needs-review' } {
  const parsed = GameStateSchema.safeParse(state);
  if (!parsed.success) return { ok: false, reason: 'invalid-state' };
  const existing = loadProgress(storage, state.mode, state.datasetVersion);
  if (!['loaded', 'empty'].includes(existing.status)) return { ok: false, reason: 'existing-save-needs-review' };
  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > 500_000) return { ok: false, reason: 'invalid-state' };
  try { storage.setItem(saveKey(state.mode), serialized); return { ok: true }; }
  catch { return { ok: false, reason: 'storage-unavailable' }; }
}
