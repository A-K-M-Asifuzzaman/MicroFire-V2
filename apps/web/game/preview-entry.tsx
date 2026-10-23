'use client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { GameData } from './ui/context';

// N8: the public mission page ships only this tiny check. The gameplay chunk (and later the 3D chunk) loads only when
// the learner explicitly selects the local training preview. Loading a module never grants access.
const PreviewApp = dynamic(() => import('./ui/preview-app'), { ssr: false, loading: () => <p className="meta">Loading the local training preview…</p> });
export const PREVIEW_ID = 'bass-b20-training-v1';

export function PreviewEntry({ data }: { data: GameData }) {
  const params = useSearchParams();
  if (params.get('preview') !== PREVIEW_ID) return null;
  return <section aria-label="Local training preview" className="m2-entry"><PreviewApp data={data} /></section>;
}
