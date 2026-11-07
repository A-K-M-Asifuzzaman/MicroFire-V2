// Server-safe schematic glyph (no hooks), drawn in Design B on the exhibit's ink window.
export function FilmGlyph() {
  return <svg viewBox="0 0 200 125" width="100%" aria-hidden="true">
    <rect x="30" y="57" width="140" height="10" rx="3" fill="#4a4a7a" stroke="#c9cdff" strokeWidth="2" />
    <rect x="96" y="57" width="74" height="10" rx="3" fill="#fff" stroke="#c9cdff" strokeWidth="2" />
    <path d="M96 62c-12-3-22-11-24-25 9 6 16 8 24 7z" fill="#ffb020" stroke="#fff" strokeWidth="1.5" />
    <path d="M96 62c-12 3-22 11-24 25 9-6 16-8 24-7z" fill="#ff5a5f" stroke="#fff" strokeWidth="1.5" />
    <g stroke="#2ee6a6" strokeWidth="3.5" fill="none" strokeLinecap="round"><path d="M182 30h-40m7-6-7 6 7 6" /><path d="M182 94h-40m7-6-7 6 7 6" /></g>
    <text x="100" y="118" textAnchor="middle" fill="#c9cdff" fontFamily="var(--f-atkinson), sans-serif" fontWeight="700" fontSize="10">Schematic · opposed flow</text>
  </svg>;
}
