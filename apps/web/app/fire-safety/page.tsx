import type { Metadata } from 'next';
import Link from 'next/link';
import { FireAtlas } from '../../components/fire-atlas';

export const metadata: Metadata = { title: 'Fire-Safety Atlas', description: 'NASA microgravity combustion investigations summarised, ranked for spacecraft, stations, Moon and Mars bases and rovers, compared, and linked to fire safety on Earth.' };

export default function Page() {
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link> / <Link href="/dashboard">Evidence</Link> / Fire-Safety Atlas</nav>
    <header className="page-head">
      <p className="eyebrow">Fire-Safety Atlas · NASA combustion investigations</p>
      <h1>Which space fire research protects which crew?</h1>
      <p className="lede">NASA&apos;s microgravity combustion investigations, summarised from NASA&apos;s own pages, sorted into prevention, detection and suppression, ranked for the crew environment you choose, and linked to fire safety on Earth.</p>
    </header>
    <FireAtlas />
  </div>;
}
