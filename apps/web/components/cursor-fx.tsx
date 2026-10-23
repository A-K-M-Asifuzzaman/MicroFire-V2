'use client';
import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, summary, label, select, input[type="range"], input[type="radio"], [role="button"]';

/**
 * Observatory cursor: a flame reticle (CSS cursor, so the real pointer stays), a lagging ring that swells over
 * controls, and a short ember trail. Mouse/trackpad only; nothing runs for touch or under reduced motion.
 */
export function CursorFx({ enabled }: { enabled: boolean }) {
  const ring = useRef<HTMLDivElement>(null);
  const embers = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = matchMedia('(pointer: fine)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
    // Observatory only: research and reading pages keep the native cursor.
    if (!enabled || !fine.matches || reduce.matches || !ring.current || !embers.current) return;
    const root = document.documentElement, r = ring.current, pool = Array.from(embers.current.children) as HTMLElement[];
    root.dataset.cursor = 'fx';
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0, next = 0, last = 0;
    const follow = () => {
      rx += (x - rx) * 0.22; ry += (y - ry) * 0.22;
      r.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY; r.dataset.on = 'true';
      r.dataset.hot = String(!!(e.target as Element | null)?.closest?.(INTERACTIVE));
      if (!raf) raf = requestAnimationFrame(follow);
      const now = performance.now();
      if (now - last < 28) return;
      last = now;
      const p = pool[next++ % pool.length]!;
      p.style.left = `${x}px`; p.style.top = `${y}px`;
      p.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
        { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 24}px), calc(-50% - ${14 + Math.random() * 20}px)) scale(.2)`, opacity: 0 }],
        { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
    };
    const leave = () => { r.dataset.on = 'false'; };
    const down = () => r.dataset.press = 'true', up = () => r.dataset.press = 'false';
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up);
    return () => {
      cancelAnimationFrame(raf); delete root.dataset.cursor;
      window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up);
    };
  }, [enabled]);
  if (!enabled) return null;
  return <div className="cursor-fx" aria-hidden="true">
    <div ref={ring} className="cursor-ring" />
    <div ref={embers}>{Array.from({ length: 16 }, (_, i) => <span key={i} className="ember" data-c={i % 3} />)}</div>
  </div>;
}
