'use client';
import { useEffect, useState } from 'react';
import { contractRuntime } from '../contract';
import { createController, type GameController } from '../controller';
import { createHttpTransport } from '../transport';
import { GameProvider, type GameData } from './context';
import { MissionShell } from './shell';

/**
 * The real local training preview. It talks only to the local preview API through Sol's shared schemas and
 * canonical identity. Without them (this branch, before integration) it reports exactly that and sends nothing.
 */
function liveController(): GameController {
  if (!contractRuntime) {
    const unavailable = { kind: 'failure' as const, status: 503, failure: null, retryAfterMs: null };
    const none = async () => unavailable;
    return createController({ transport: { capability: none, authorize: none, revoke: none, start: none, action: none, resume: none, session: none },
      identify: async () => { throw new Error('contract runtime not integrated'); }, seed: { link: { status: 'unavailable', reason: 'runtime-missing' } } });
  }
  return createController({ transport: createHttpTransport(contractRuntime), identify: contractRuntime.identify });
}

export default function PreviewApp({ data }: { data: GameData }) {
  const [c] = useState(liveController);
  useEffect(() => { if (contractRuntime) void c.boot(); }, [c]);
  return <GameProvider controller={c} data={data}><MissionShell /></GameProvider>;
}
