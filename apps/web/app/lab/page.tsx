import type { Metadata } from 'next';
import Link from 'next/link';
import { LabConsole } from '../../components/lab/lab-console';
import { NasaArchive } from '../../components/lab/nasa-archive';
import { b20Facts, investigations, nasaMedia } from '../../lib/lab-nasa';
import '../../components/lab/lab.css';

export const metadata: Metadata = { title: 'Flame Lab', description: 'Run an illustrated BASS-II-style flame experiment in four gravity levels, check every run against what NASA recorded for test B20, and explore real NASA space-fire photos and video.' };

export default function Page() {
  const b20 = b20Facts();
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link> / Flame Lab</nav>
    <header className="page-head reveal">
      <p className="eyebrow">Flame Lab · experiment console</p>
      <h1>Change a condition. Then check the record.</h1>
      <p className="lede">Set gravity, oxygen, airflow and pressure, predict what the flame will do, then run a BASS-II-style sequence in the illustrated chamber. Every run is checked against what NASA actually recorded for test B20. The drawing shows the <b>direction</b> of each effect; real values come only from the cited record.</p>
    </header>
    <LabConsole b20={b20} />
    <NasaArchive b20={b20} media={nasaMedia()} programs={investigations()} />
    <div className="actions" style={{ marginTop: 28 }}>
      <Link className="btn btn-primary" href="/experiments/bass2-b20">Open the full B20 dossier</Link>
      <Link className="btn btn-quiet" href="/dashboard">Ask the Evidence Workstation</Link>
      <Link className="btn btn-quiet" href="/missions/bass-assembly/tour">Tour the BASS-II hardware</Link>
    </div>
  </div>;
}
