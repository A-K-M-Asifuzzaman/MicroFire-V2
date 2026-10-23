'use client';
import { useEffect, useRef, useState } from 'react';
import { PixAvatar, type PixState } from './pix-avatar';
import type { PixApi } from './pix-scene';

/**
 * PIX with a 3D upgrade: the SVG avatar renders first (and stays as the fallback and for no-JS / no-WebGL);
 * once visible and idle, three.js and the PIX model load and take over. Paused offscreen and under reduced motion.
 */
export function PixStage({ state = 'idle', className = '' }: { state?: PixState; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<PixApi | null>(null);
  const stateRef = useRef(state);
  const [mode, setMode] = useState<'svg' | '3d'>('svg');
  useEffect(() => { stateRef.current = state; api.current?.setState(state); }, [state]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, started = false, cancelled = false;
    const motion = () => visible && !reduce.matches && !document.hidden;
    const sync = () => api.current?.setMotion(motion());
    const start = () => {
      started = true;
      import('./pix-scene').then(async ({ startPix }) => {
        if (cancelled) return;
        const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
        el.appendChild(canvas);
        const a = await startPix(canvas, el, stateRef.current, motion(), () => { setMode('svg'); canvas.remove(); api.current = null; });
        if (cancelled) { a?.stop(); return; }
        if (!a) { canvas.remove(); return; }
        api.current = a; setMode('3d');
      }).catch(() => undefined);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && !started) setTimeout(start, 200);
      sync();
    }, { rootMargin: '120px' });
    io.observe(el);
    const onResize = () => api.current?.resize();
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('resize', onResize);
    return () => {
      cancelled = true; io.disconnect();
      reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      api.current?.stop(); api.current = null; el.querySelector('canvas')?.remove();
    };
  }, []);
  return <div ref={host} className={`pix-stage ${className}`} data-mode={mode} data-state={state}>
    <PixAvatar state={state} />
  </div>;
}
