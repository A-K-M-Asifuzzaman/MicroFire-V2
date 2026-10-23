// Server-safe schematic glyph (no hooks).
export function FilmGlyph() {
  return <svg viewBox="0 0 200 125" width="100%" aria-hidden="true">
    <rect x="30" y="58" width="140" height="8" rx="2" fill="#2a3d52" />
    <rect x="96" y="58" width="74" height="8" rx="2" fill="#c9d4dd" />
    <path d="M96 62c-10-3-20-10-22-24 9 6 15 8 22 6z" fill="#ff8738" opacity=".9" />
    <path d="M96 62c-10 3-20 10-22 24 9-6 15-8 22-6z" fill="#ff8738" opacity=".55" />
    <g stroke="#73bbd9" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M182 30h-40m6-5-6 5 6 5" /><path d="M182 94h-40m6-5-6 5 6 5" /></g>
    <text x="100" y="116" textAnchor="middle" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1">SCHEMATIC · OPPOSED FLOW</text>
  </svg>;
}
