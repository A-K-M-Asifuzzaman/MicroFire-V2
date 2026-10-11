import { describe, expect, it } from 'vitest';
import { createGameState, loadProgress, saveKey, saveProgress, transition, type SaveStorage } from '@microfire/game-core';
import { GameStateSchema } from '@microfire/shared';
const at = '2026-10-11T09:00:00Z';
const initial = () => createGameState('p0-bass-b20-v1', 'normal', at);
function memory(): SaveStorage { const data = new Map<string, string>(); return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } }; }
describe('P0 state and save foundation', () => {
  it('inspects only real records, idempotently, without inventing earned proof', () => {
    const event = { type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' };
    const first = transition(initial(), event, ['bass2-b20'], at);
    const second = transition(first.state, event, ['bass2-b20'], at);
    expect(second.state.inspectedExperimentIds).toEqual(['bass2-b20']);
    expect(second.state.passport.entries).toEqual([]);
    expect(transition(initial(), event, [], at).ok).toBe(false);
  });
  it('blocks URL-style mission skipping and fabricated completion', () => {
    expect(transition(initial(), { type: 'START_MISSION', missionId: 'lunar-habitat' }, [], at)).toMatchObject({ ok: false, code: 'UNAVAILABLE' });
    expect(transition(initial(), { type: 'COMPLETE_MISSION', missionId: 'station-arrival' }, [], at)).toMatchObject({ ok: false, code: 'NOT_IMPLEMENTED' });
    expect(GameStateSchema.safeParse({ ...initial(), completedMissions: ['lunar-habitat'] }).success).toBe(false);
    expect(GameStateSchema.safeParse({ ...initial(), setup: { revision: 2, qualifiedRevision: 1, installedParts: [] } }).success).toBe(false);
  });
  it('round-trips normal and demo saves independently', () => {
    const storage = memory(); expect(saveProgress(storage, initial()).ok).toBe(true);
    expect(saveProgress(storage, createGameState('p0-bass-b20-v1', 'demo', at)).ok).toBe(true);
    expect(loadProgress(storage, 'normal', 'p0-bass-b20-v1')).toEqual({ status: 'loaded', state: initial() });
    expect(storage.getItem(saveKey('demo'))).not.toBe(storage.getItem(saveKey('normal')));
  });
  it.each(['{broken', '{"schemaVersion":2}', 'null'])('preserves unrecognized save %s instead of overwriting', (raw) => {
    const storage = memory(); storage.setItem(saveKey('normal'), raw);
    expect(saveProgress(storage, initial()).ok).toBe(false);
    expect(storage.getItem(saveKey('normal'))).toBe(raw);
  });
  it('fails safely on unavailable storage and stale datasets', () => {
    const storage = memory(); saveProgress(storage, initial());
    expect(loadProgress(storage, 'normal', 'next-catalog').status).toBe('dataset-mismatch');
    const broken = { getItem() { throw Error('disabled'); }, setItem() { throw Error('quota'); } };
    expect(loadProgress(broken, 'normal', 'p0-bass-b20-v1').status).toBe('storage-unavailable');
    expect(saveProgress(broken, initial()).ok).toBe(false);
    const quota = { getItem: () => null, setItem() { throw Error('quota'); } };
    expect(saveProgress(quota, initial())).toEqual({ ok: false, reason: 'storage-unavailable' });
  });
});
