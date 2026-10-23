'use client';
import Link from 'next/link';
import { useRef } from 'react';

/** Design A navigation: an engraved bar; the wordmark is the only uppercase type on the page. */
export function ABar({ current }: { current: 'home' | 'lab' | 'b20' }) {
  const links = [['home', '/design/a', 'Observatory'], ['lab', '/design/a/lab', 'Training bay'], ['b20', '/design/a/b20', 'B20 record']] as const;
  return <header className="da-bar">
    <Link className="da-mark" href="/design/a" aria-label="MicroFire observatory, home"><span>MICROFIRE</span><small>Living Science Observatory</small></Link>
    <nav aria-label="Main">{links.map(([k, href, label]) => <Link key={k} href={href} aria-current={k === current ? 'page' : undefined}>{label}</Link>)}
      <Link href="/ask">Ask PIX</Link></nav>
  </header>;
}

const A0 = -135, A1 = 135;
/** Rotary gravity control (0–1 g), an instrument rather than a form slider. Illustrative only. */
export function Dial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const set = (v: number) => onChange(Math.round(Math.min(1, Math.max(0, v)) * 100) / 100);
  const fromPointer = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const deg = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
    set((Math.min(A1, Math.max(A0, deg)) - A0) / (A1 - A0));
  };
  const angle = A0 + value * (A1 - A0);
  const arc = (from: number, to: number, r: number) => {
    const p = (a: number) => [60 + r * Math.sin((a * Math.PI) / 180), 60 - r * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = p(from), [x1, y1] = p(to);
    return `M${x0} ${y0} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const label = value <= 0.15 ? 'still-air microgravity' : value >= 0.85 ? 'Earth gravity' : 'teaching blend';
  return <div className="da-dial">
    <svg ref={ref} viewBox="0 0 120 120" role="slider" tabIndex={0} aria-label="Gravity, illustration" aria-valuemin={0} aria-valuemax={1} aria-valuenow={value}
      aria-valuetext={`${value.toFixed(2)} g, ${label}`}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e); }}
      onPointerMove={(e) => { if (e.buttons) fromPointer(e); }}
      onKeyDown={(e) => {
        const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.25, PageDown: -0.25 }[e.key];
        if (step !== undefined) { e.preventDefault(); set(value + step); }
        if (e.key === 'Home') { e.preventDefault(); set(0); } if (e.key === 'End') { e.preventDefault(); set(1); }
      }}>
      <defs>
        <radialGradient id="da-knob" cx="40%" cy="32%" r="75%"><stop offset="0" stopColor="#5d666e" /><stop offset=".55" stopColor="#2b3035" /><stop offset="1" stopColor="#15181b" /></radialGradient>
      </defs>
      {Array.from({ length: 21 }, (_, i) => { const a = A0 + (i * (A1 - A0)) / 20, major = i % 10 === 0; const r0 = major ? 47 : 50;
        return <line key={i} x1={60 + r0 * Math.sin((a * Math.PI) / 180)} y1={60 - r0 * Math.cos((a * Math.PI) / 180)} x2={60 + 55 * Math.sin((a * Math.PI) / 180)} y2={60 - 55 * Math.cos((a * Math.PI) / 180)} className={major ? 'tick major' : 'tick'} />; })}
      <path d={arc(A0, A1, 42)} className="track" />
      {value > 0.005 && <path d={arc(A0, angle, 42)} className="fill" />}
      <circle cx="60" cy="60" r="34" fill="url(#da-knob)" className="knob" />
      {Array.from({ length: 48 }, (_, i) => <line key={i} x1={60 + 31 * Math.sin((i * 7.5 * Math.PI) / 180)} y1={60 - 31 * Math.cos((i * 7.5 * Math.PI) / 180)} x2={60 + 34 * Math.sin((i * 7.5 * Math.PI) / 180)} y2={60 - 34 * Math.cos((i * 7.5 * Math.PI) / 180)} className="knurl" />)}
      <g transform={`rotate(${angle} 60 60)`}><rect x="58.6" y="30" width="2.8" height="14" rx="1.4" className="pointer" /></g>
    </svg>
    <div className="da-dial-read">
      <span className="da-dial-name">Gravity</span>
      <output className="da-mono">{value.toFixed(2)} g</output>
      <span className="da-dial-state">{label[0]!.toUpperCase() + label.slice(1)}</span>
      <div className="da-detents"><button type="button" onClick={() => set(0)} aria-pressed={value === 0}>0 g</button><button type="button" onClick={() => set(1)} aria-pressed={value === 1}>1 g</button></div>
    </div>
  </div>;
}
