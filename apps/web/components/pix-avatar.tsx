// PIX: MicroFire's original research companion. Server-safe SVG; states are CSS-driven interface states only.
// The same drawing (without halo, scan and hover ring) is the concept image for the Meshy PIX model.
export type PixState = 'idle' | 'searching' | 'cited' | 'abstained' | 'error';

export function PixAvatar({ state = 'idle', className = '' }: { state?: PixState; className?: string }) {
  return <svg className={`pix-avatar ${className}`} data-state={state} viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="pix-halo"><stop offset="0" stopColor="#7fd6d1" stopOpacity=".5" /><stop offset="1" stopColor="#7fd6d1" stopOpacity="0" /></radialGradient>
      <radialGradient id="pix-shell" cx=".35" cy=".25" r=".9"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#dfe6ec" /><stop offset="1" stopColor="#8fa2b4" /></radialGradient>
      <linearGradient id="pix-visor-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10243a" /><stop offset="1" stopColor="#03070c" /></linearGradient>
      <radialGradient id="pix-eye" cx=".45" cy=".4"><stop offset="0" stopColor="#f0ffff" /><stop offset=".45" stopColor="#8ff0f6" /><stop offset="1" stopColor="#2bb3d6" /></radialGradient>
      <radialGradient id="pix-flame" cx=".5" cy=".7"><stop offset="0" stopColor="#fff2cf" /><stop offset=".5" stopColor="#ffb257" /><stop offset="1" stopColor="#ff6a1a" /></radialGradient>
      <clipPath id="pix-visor"><rect x="46" y="56" width="108" height="58" rx="29" /></clipPath>
    </defs>
    <circle className="halo" cx="100" cy="100" r="98" fill="url(#pix-halo)" />
    <ellipse className="hover" cx="100" cy="194" rx="30" ry="4" fill="none" stroke="#73bbd9" strokeWidth="2" />
    <g className="pix-float">
      <path d="M100 36V18" stroke="#9fb0c0" strokeWidth="3" strokeLinecap="round" />
      <path className="ant-flame" d="M100 0c6 6 9 10 9 14a9 9 0 0 1-18 0c0-4 3-8 9-14z" fill="url(#pix-flame)" />
      <rect x="22" y="66" width="16" height="36" rx="8" fill="#22344a" /><circle cx="30" cy="84" r="4" fill="#ff8738" />
      <rect x="162" y="66" width="16" height="36" rx="8" fill="#22344a" /><circle cx="170" cy="84" r="4" fill="#ff8738" />
      <rect x="32" y="34" width="136" height="100" rx="48" fill="url(#pix-shell)" />
      <rect className="visor" x="46" y="56" width="108" height="58" rx="29" fill="url(#pix-visor-g)" />
      <g clipPath="url(#pix-visor)">
        <rect className="scan" x="46" y="56" width="108" height="10" fill="#73bbd9" opacity=".35" />
        <ellipse className="eye" cx="78" cy="83" rx="10" ry="13" fill="url(#pix-eye)" />
        <ellipse className="eye" cx="122" cy="83" rx="10" ry="13" fill="url(#pix-eye)" />
        <circle cx="82" cy="77" r="3" fill="#fff" /><circle cx="126" cy="77" r="3" fill="#fff" />
        <path className="mouth mouth-smile" d="M90 101q10 7 20 0" stroke="#8ff0f6" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path className="mouth mouth-flat" d="M91 103h18" stroke="#f0c35a" strokeWidth="3" strokeLinecap="round" />
        <path className="mouth mouth-frown" d="M91 105q9-6 18 0" stroke="#ff8a80" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
      <path d="M60 62q22-8 50-6" stroke="#fff" strokeOpacity=".3" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M62 150q-16 6-18 24q13-4 22-15z" fill="#22344a" /><path d="M138 150q16 6 18 24q-13-4-22-15z" fill="#22344a" />
      <path d="M70 146Q100 138 130 146Q134 172 100 188Q66 172 70 146Z" fill="url(#pix-shell)" />
      <circle className="core" cx="100" cy="160" r="6" fill="#ff8738" />
    </g>
  </svg>;
}
