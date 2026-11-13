import type { Metadata } from 'next';
import Link from 'next/link';
import { catalog } from '@microfire/science';
import { FlameLab, type B20Facts } from '../../components/flame-lab';
import { conditionLabels, locatorText, value } from '../../components/page-kit';
import '../../components/flame-lab.css';

export const metadata: Metadata = { title: 'Flame Lab', description: 'Change gravity, airflow and oxygen in an illustrated flame, then compare with what NASA actually recorded for BASS-II test B20.' };

export default function Page() {
  const e = catalog.experiments[0]!, claim = e.claims.find((c) => c.id === 'bass2-b20-burned-entire-sample') ?? e.claims[0]!;
  const source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const keys = ['material', 'thicknessMm', 'oxygenPct', 'flowCmS', 'flowDirection', 'pressureKpa', 'gravity'] as const;
  const b20: B20Facts = {
    observation: claim.text, citation: `${source.title} · ${locatorText(e)}`, href: source.documentUrl,
    conditions: keys.map((k) => { const v = value(e, k); return { label: conditionLabels[k] ?? k, value: v ?? 'Not reported for this run', known: v !== null }; }),
  };
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link> / Flame Lab</nav>
    <header className="page-head reveal">
      <p className="eyebrow">Flame Lab · interactive illustration</p>
      <h1>Change a condition. Then check the record.</h1>
      <p className="lede">Move gravity, airflow and oxygen to see the <b>direction</b> each one pushes a flame in an authored toy model. Then compare it with what NASA actually recorded for BASS-II test B20. The drawing never becomes data: real values come only from the cited record.</p>
    </header>
    <FlameLab b20={b20} />
    <div className="actions" style={{ marginTop: 24 }}>
      <Link className="btn btn-primary" href={`/experiments/${e.id}`}>Open the full B20 dossier</Link>
      <Link className="btn btn-quiet" href="/dashboard">Ask the Evidence Workstation</Link>
      <Link className="btn btn-quiet" href="/missions/bass-assembly/tour">Tour the BASS-II hardware</Link>
    </div>
  </div>;
}
