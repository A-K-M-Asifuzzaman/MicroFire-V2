import { PixAvatar, type PixMood, type PixState } from './pix-avatar';

/** PIX in a layout slot. Design B's PIX is an illustration, so no 3D engine loads for it. */
export function PixStage({ state = 'idle', mood, className = '' }: { state?: PixState; mood?: PixMood; className?: string }) {
  return <div className={`pix-stage ${className}`} data-state={state}><PixAvatar state={state} {...(mood ? { mood } : {})} /></div>;
}
