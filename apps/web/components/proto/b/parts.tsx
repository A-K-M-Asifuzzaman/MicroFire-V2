'use client';
import Link from 'next/link';

/** Design B navigation: a bold wordmark and a pill bar. */
export function BBar({ current }: { current: 'home' | 'lab' | 'b20' }) {
  const links = [['home', '/design/b', 'Home'], ['lab', '/design/b/lab', 'Training bay'], ['b20', '/design/b/b20', 'B20 record']] as const;
  return <header className="db-bar">
    <Link className="db-mark" href="/design/b" aria-label="MicroFire, home"><FlameMark />MicroFire</Link>
    <nav aria-label="Main">{links.map(([k, href, label]) => <Link key={k} href={href} aria-current={k === current ? 'page' : undefined}>{label}</Link>)}<Link href="/ask">Ask PIX</Link></nav>
  </header>;
}
const FlameMark = () => <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2c7 7 10 12 10 17a10 10 0 0 1-20 0c0-5 3-10 10-17z" fill="#ffb020" stroke="#15153d" strokeWidth="2.5" /><path d="M16 14c3 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1-4 4-7z" fill="#ff5a5f" /></svg>;

/** The illustrated sky: sparkle stars, an orbit line and Earth's curve (original flat illustration). */
export function Sky() {
  const stars = [[6, 18, 1], [14, 62, .7], [22, 30, 1.2], [31, 80, .8], [44, 12, .9], [52, 46, .6], [61, 22, 1.1], [68, 70, .7], [77, 10, .9], [86, 40, 1.3], [93, 66, .8], [39, 90, .7]];
  return <div className="db-sky" aria-hidden="true">
    {stars.map(([x, y, s], i) => <svg key={i} className="db-star" style={{ left: `${x}%`, top: `${y}%`, ['--s' as string]: s, ['--d' as string]: `${(i % 5) * 0.7}s` }} viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" /></svg>)}
    <svg className="db-earth" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice">
      <defs><clipPath id="db-earth-clip"><circle cx="1050" cy="1500" r="1180" /></clipPath></defs>
      <circle cx="1050" cy="1500" r="1196" className="atmo" />
      <g clipPath="url(#db-earth-clip)">
        <circle cx="1050" cy="1500" r="1180" className="ocean" />
        <path d="M380 470 C 470 380, 620 360, 700 410 C 780 460, 900 420, 960 470 C 1010 520, 900 600, 760 600 L 380 600 Z" className="land" />
        <path d="M1150 360 C 1240 330, 1380 350, 1470 400 C 1540 440, 1600 470, 1600 520 L 1600 600 L 1240 600 C 1200 540, 1260 500, 1210 460 C 1170 430, 1100 400, 1150 360 Z" className="land" />
        <g className="clouds"><path d="M300 430 q60 -30 120 0 t120 0 t120 -6" /><path d="M980 330 q70 -24 140 0 t140 4" /><path d="M1240 480 q50 -20 100 0 t100 0" /></g>
      </g>
    </svg>
  </div>;
}
