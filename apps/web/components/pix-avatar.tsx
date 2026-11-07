// PIX, MicroFire's research companion, drawn in Design B: a large, expressive illustrated character. Server-safe SVG.
// `state` is the interface state (Ask PIX, panels); `mood` is the gesture (wave, look, hold up a page tag, shrug, point).
// Both are presentation only.
export type PixState = 'idle' | 'searching' | 'cited' | 'abstained' | 'error';
export type PixMood = 'greet' | 'look' | 'cite' | 'gap' | 'bay';
const moodFor: Record<PixState, PixMood> = { idle: 'greet', searching: 'look', cited: 'cite', abstained: 'gap', error: 'gap' };

export function PixAvatar({ state = 'idle', mood, className = '' }: { state?: PixState; mood?: PixMood; className?: string }) {
  return <svg className={`pix-avatar ${className}`} data-state={state} data-mood={mood ?? moodFor[state]} viewBox="0 0 240 280" aria-hidden="true">
    <ellipse className="shadow" cx="120" cy="268" rx="54" ry="8" />
    <g className="pix-float">
      <path d="M120 58 V30" className="ink-line" />
      <g className="ant"><path d="M120 4 c9 10 13 16 13 22 a13 13 0 0 1-26 0 c0-6 4-12 13-22z" className="flame-o" /><path d="M120 16 c4 5 6 8 6 11 a6 6 0 0 1-12 0 c0-3 2-6 6-11z" className="flame-y" /></g>
      <g className="pix-arm pix-arm-l"><rect x="38" y="150" width="22" height="56" rx="11" className="shell" /><circle cx="49" cy="208" r="12" className="hand" /></g>
      <g className="pix-arm pix-arm-r"><rect x="180" y="150" width="22" height="56" rx="11" className="shell" /><circle cx="191" cy="208" r="12" className="hand" />
        <g className="pix-card"><rect x="172" y="168" width="46" height="34" rx="5" className="card" /><path d="M180 180 h30 M180 188 h22" className="card-line" /><text x="195" y="198" textAnchor="middle" className="card-t">p.112</text></g></g>
      <rect x="64" y="140" width="112" height="98" rx="40" className="shell" />
      <circle cx="120" cy="190" r="12" className="core" />
      <g className="pix-head">
        <rect x="40" y="56" width="160" height="106" rx="48" className="shell" />
        <rect x="58" y="76" width="124" height="66" rx="32" className="visor" />
        <g className="pix-eyes">
          <g className="eye"><ellipse cx="96" cy="109" rx="11" ry="14" className="iris" /><circle cx="100" cy="103" r="4" className="glint" /></g>
          <g className="eye"><ellipse cx="144" cy="109" rx="11" ry="14" className="iris" /><circle cx="148" cy="103" r="4" className="glint" /></g>
          <path d="M84 112 q12 -12 24 0 M132 112 q12 -12 24 0" className="happy" />
          <path d="M86 110 h20 M134 110 h20" className="flat" />
          <path d="M84 104 q12 12 24 0 M132 104 q12 12 24 0" className="worry" />
        </g>
        <circle cx="64" cy="132" r="7" className="blush" /><circle cx="176" cy="132" r="7" className="blush" />
      </g>
      <g className="pix-lens"><circle cx="214" cy="70" r="15" className="lens-dot" /><path d="M224 81 l12 12" className="ink-line" /></g>
      <g className="pix-q"><circle cx="212" cy="58" r="18" className="q-bubble" /><text x="212" y="66" textAnchor="middle" className="q-t">?</text></g>
    </g>
  </svg>;
}
