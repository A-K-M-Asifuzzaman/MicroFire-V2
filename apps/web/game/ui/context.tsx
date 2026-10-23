'use client';
import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import type { PartId, PartSpec } from '../contract';
import type { B20Data } from '../contract/b20';
import type { ControllerState, GameController } from '../controller';

export type GameData = { parts: PartSpec[]; b20: B20Data };
/** Local, unconfirmed UI intent shared by the 2D schematic and the 3D bench. Never progress. */
export type Selection = { partId: PartId | null; anchorId: string | null; orientation: 'correct' | 'reversed' };
type Ctx = { c: GameController; data: GameData; selection: Selection; select: (s: Partial<Selection>) => void };
const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ controller, data, children }: { controller: GameController; data: GameData; children: React.ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ partId: null, anchorId: null, orientation: 'correct' });
  const select = (s: Partial<Selection>) => setSelection((cur) => ({ ...cur, ...s }));
  return <GameCtx.Provider value={{ c: controller, data, selection, select }}>{children}</GameCtx.Provider>;
}
export function useGame(): Ctx & { s: ControllerState } {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame outside GameProvider');
  const s = useSyncExternalStore(ctx.c.subscribe, ctx.c.getState, ctx.c.getState);
  return { ...ctx, s };
}
export const partLabel = (data: GameData, id: string) => data.parts.find((p) => p.id === id)?.label ?? id;
export const anchorLabel = (data: GameData, id: string) => data.parts.find((p) => p.anchorId === id)?.anchorLabel ?? id;
