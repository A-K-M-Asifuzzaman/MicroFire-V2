import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { partSpecs } from '../../../../game/contract/parts';
import { BayTour } from '../../../../game/ui/bay-tour';

// Visitor tour of the BASS-II training bay. Illustrative: no session, no server state, nothing recorded.
// The mission itself (gameplay, qualification, Passport entries) stays gated until its server integration is approved.
export const dynamicParams = false;
export function generateStaticParams() { return [{ id: 'bass-assembly' }]; }
export const metadata: Metadata = { title: 'BASS-II training bay · illustrative tour', description: 'Tour MicroFire’s 3D training bay around a schematic model of the BASS-II flow duct. Illustrative; records nothing.' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if ((await params).id !== 'bass-assembly') notFound();
  return <>
    <div className="wrap page" style={{ paddingBottom: 0 }}>
      <nav aria-label="Breadcrumb" className="crumbs"><Link href="/missions">Mission map</Link> / <Link href="/missions/bass-assembly">Mission 02</Link> / Training bay</nav>
      <header className="page-head reveal tour-head">
        <p className="eyebrow">Mission 02 · BASS-II training bay · illustrative tour</p>
        <h1>Step inside the training bay.</h1>
        <div className="status-line"><span className="badge" data-state="preview">Illustrative preview</span><p>Look around the bay and inspect each part. The mission&apos;s gameplay opens after its server integration is approved; this tour records nothing.</p></div>
      </header>
    </div>
    <BayTour parts={partSpecs()} />
    <div className="wrap" style={{ paddingBottom: 64 }}>
      <div className="actions">
        <Link className="btn btn-primary btn-sm" href="/experiments/bass2-b20">Inspect the B20 record</Link>
        <Link className="btn btn-quiet btn-sm" href="/missions/bass-assembly">Mission briefing</Link>
        <Link className="btn btn-quiet btn-sm" href="/missions">Back to the map</Link>
      </div>
    </div>
  </>;
}
