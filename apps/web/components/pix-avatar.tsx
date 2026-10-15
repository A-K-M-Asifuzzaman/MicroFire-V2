// PIX: MicroFire's original research companion. Server-safe SVG; states are CSS-driven interface states only.
export type PixState = 'idle' | 'searching' | 'cited' | 'abstained' | 'error';

export function PixAvatar({ state = 'idle', className = '' }: { state?: PixState; className?: string }) {
  return <svg className={`pix-avatar ${className}`} data-state={state} viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <clipPath id="pix-visor"><rect x="30" y="42" width="60" height="30" rx="15" /></clipPath>
      <radialGradient id="pix-halo"><stop offset="0" stopColor="#7fd6d1" stopOpacity=".55" /><stop offset="1" stopColor="#7fd6d1" stopOpacity="0" /></radialGradient>
      <linearGradient id="pix-shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c4157" /><stop offset="1" stopColor="#152230" /></linearGradient>
    </defs>
    <circle className="halo" cx="60" cy="60" r="58" fill="url(#pix-halo)" />
    <ellipse cx="60" cy="108" rx="28" ry="5" fill="none" stroke="#73bbd9" strokeOpacity=".45" />
    <path d="M60 26V12" stroke="#73bbd9" strokeWidth="2.5" strokeLinecap="round" />
    <path className="ant-flame" d="M60 2c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z" fill="#ff8738" />
    <rect x="18" y="26" width="84" height="64" rx="28" fill="url(#pix-shell)" stroke="#73bbd9" strokeWidth="2" />
    <rect className="visor" x="30" y="42" width="60" height="30" rx="15" fill="#05080d" />
    <g clipPath="url(#pix-visor)">
      <rect className="scan" x="30" y="42" width="60" height="6" fill="#73bbd9" opacity=".35" />
      <ellipse className="eye" cx="48" cy="57" rx="5.5" ry="6.5" fill="#9fe3e3" />
      <ellipse className="eye" cx="72" cy="57" rx="5.5" ry="6.5" fill="#9fe3e3" />
    </g>
    <circle cx="22" cy="60" r="3.5" fill="#ff8738" opacity=".85" /><circle cx="98" cy="60" r="3.5" fill="#ff8738" opacity=".85" />
    <path d="M44 98h32" stroke="#73bbd9" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
