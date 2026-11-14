'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { PixGuide } from './pix-guide';

const sections = [
  { label: 'Discover', href: '/', match: ['/', '/judge-guide', '/proof', '/roadmap', '/impact', '/assets'] },
  { label: 'Evidence', href: '/dashboard', match: ['/dashboard', '/ask', '/gaps', '/investigations', '/compare', '/sources', '/methodology'] },
  { label: 'Experiments', href: '/atlas', match: ['/atlas', '/experiments'] },
  { label: 'Flame Lab', href: '/lab', match: ['/lab'] },
  { label: 'Missions', href: '/missions', match: ['/missions', '/passport', '/adventure'] }
] as const;
const evidenceTools = [
  ['/dashboard', 'Workstation'], ['/ask', 'Ask PIX'], ['/gaps', 'Frontier'], ['/investigations', 'Library'], ['/compare', 'Compare'], ['/sources', 'Sources'], ['/methodology', 'Methodology']
] as const;
const missionTools = [['/missions', 'Mission map'], ['/adventure', 'ISS Adventure (3D)'], ['/missions/bass-assembly/tour', 'Training bay'], ['/passport', 'Evidence Passport']] as const;
/** Unfinished destinations say so before arrival (state straight from the shared registry). */


const inSection = (path: string, prefixes: readonly string[]) => prefixes.some((p) => p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`));

export function BrandMark() {
  return <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 2c7 7 10 12 10 17a10 10 0 0 1-20 0c0-5 3-10 10-17z" fill="#ffb020" stroke="#15153d" strokeWidth="2.5" />
    <path d="M16 14c3 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1-4 4-7z" fill="#ff5a5f" />
  </svg>;
}

/** `tags` (computed on the server from the shared registry) marks destinations with no working tool yet. */
export function Shell({ children, tags = {} }: { children: React.ReactNode; tags?: Record<string, string> }) {
  const path = usePathname() ?? '/';
  // After client-side navigation (including from the mobile menu), move focus to the new page's main heading
  // so keyboard and screen-reader users land on the destination instead of on <body>.
  const lastHeading = useRef<Element | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; lastHeading.current = document.querySelector('main h1'); return; }
    // The new route may commit a frame or two after the path changes; wait for its own heading, not the old one.
    let frames = 0, raf = 0;
    const attempt = () => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      if ((!h1 || h1 === lastHeading.current) && frames++ < 60) { raf = requestAnimationFrame(attempt); return; }
      const target = h1 ?? document.getElementById('main');
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      lastHeading.current = h1;
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [path]);
  const current = sections.find((s) => inSection(path, s.match));
  const links = sections.map((s) => { const tag = tags[s.href]; return <Link key={s.href} className="nav-link" href={s.href} aria-current={s === current ? 'page' : undefined}>
    {s.label}{tag && <span className="nav-tag">{tag}</span>}</Link>; });
  // Design-review prototypes (/design/…) bring their own navigation and identity; the shell steps aside.
  if (path === '/design' || path.startsWith('/design/')) return <><a className="skip" href="#main">Skip to content</a><main id="main" tabIndex={-1}>{children}</main></>;
  return <div className="surface" data-home={path === '/' ? 'true' : undefined}>
    <a className="skip" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="MicroFire, the Living Science Observatory — home">
          <BrandMark /><span className="brand-text" aria-hidden="true"><b>MicroFire</b><small>The Living Science Observatory</small></span>
        </Link>
        <nav className="primary-nav" aria-label="Main">{links}</nav>
        <Link className="btn btn-primary btn-sm header-cta" href="/judge-guide">Start Here · Judges</Link>
        {/* Keyed by path so client navigation closes the menu. Works without JavaScript. */}
        <details className="mobile-nav" key={path}>
          <summary>Menu <span aria-hidden="true">☰</span></summary>
          <nav aria-label="Main">{links}
            <p className="menu-group">Start here</p>
            <Link className="nav-link sub" href="/judge-guide">Guided judge tour</Link>
            <Link className="nav-link sub" href="/proof">60-second proof</Link>
            <p className="menu-group">Evidence tools</p>
            {evidenceTools.map(([href, label]) => <Link key={href} className="nav-link sub" href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}
            <p className="menu-group">Missions</p>
            <Link className="nav-link sub" href="/missions/bass-assembly/tour" aria-current={path === '/missions/bass-assembly/tour' ? 'page' : undefined}>Training bay tour</Link>
            <p className="menu-group">Your record</p>
            <Link className="nav-link sub" href="/passport" aria-current={path === '/passport' ? 'page' : undefined}>Passport</Link>
          </nav>
        </details>
      </div>
    </header>
    {current?.label === 'Evidence' && <nav className="subnav" aria-label="Evidence tools">
      <div className="wrap">{evidenceTools.map(([href, label]) => <Link key={href} className="nav-link" href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</div>
    </nav>}
    {current?.label === 'Missions' && <nav className="subnav" aria-label="Mission tools">
      <div className="wrap">{missionTools.map(([href, label]) => <Link key={href} className="nav-link" href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</div>
    </nav>}
    <PixGuide />
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      <div className="wrap">
        <p>Independent educational research project. No NASA endorsement and no operational fire-safety certification.</p>
        <nav aria-label="Project">
          <Link href="/sources">Sources &amp; rights</Link><Link href="/methodology">Methodology</Link><Link href="/roadmap">Progress</Link>
        </nav>
      </div>
    </footer>
  </div>;
}
