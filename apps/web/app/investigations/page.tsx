import Link from 'next/link';
import { coverage, INVESTIGATION_LIBRARY_VERSION, investigationLibrary } from '@microfire/science';
import { CoverageNote } from '../../components/evidence-ui';
import { PageHero, Sheet } from '../../components/page-kit';

export const metadata = { title: 'NASA Investigation Library' };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
// Server-rendered from the same investigation-library-v1 function GET /api/investigations serves (Codex, e45f35a).
export default async function Page({ searchParams }: Props) {
  const raw = (await searchParams).q, q = typeof raw === 'string' ? raw.trim().slice(0, 200) : '';
  // Same construction as GET /api/investigations (apps/web/lib/api.ts).
  const lib = { libraryVersion: INVESTIGATION_LIBRARY_VERSION, items: investigationLibrary(q || undefined), coverage: coverage() };
  return <>
    <PageHero compact eyebrow="NASA Investigation Library" title="Which NASA fire investigations are here?"
      lede="Source descriptions of NASA microgravity combustion investigations, each linked to its report. Only admitted runs can be used as evidence; a description is not a measured result." />
    <Sheet>
      <form className="library-search" role="search" aria-label="Investigation search" action="/investigations" method="get">
        <div className="field"><label htmlFor="lib-q">Search investigations</label><input id="lib-q" name="q" type="search" maxLength={200} defaultValue={q} placeholder="e.g. droplet, flame spread, BASS-II" /></div>
        <button className="btn btn-primary" type="submit">Search</button>{q && <Link className="btn btn-quiet" href="/investigations">Clear</Link>}
      </form>
      <p className="results-meta" aria-live="polite"><span>{lib.items.length} investigation description{lib.items.length === 1 ? '' : 's'}{q ? ` match “${q}”` : ''} · library {lib.libraryVersion}</span>
        <span>{lib.items.reduce((n, i) => n + i.admittedExperimentIds.length, 0)} admitted run{lib.items.reduce((n, i) => n + i.admittedExperimentIds.length, 0) === 1 ? '' : 's'} usable as evidence</span></p>
      <ul className="library-grid">{lib.items.map((i) => <li key={i.id}>
        <Link className="library-card" href={`/investigations/${i.id}`} data-admitted={i.admittedExperimentIds.length > 0}>
          <span className="library-program">{i.program}</span>
          <b>{i.focus}</b>
          <span className="meta">{i.platformContext} · {i.fuelPhase.replace('-', ' ')} fuel</span>
          <span className="library-status">{i.admittedExperimentIds.length ? `${i.admittedExperimentIds.length} admitted run: ${i.admittedExperimentIds.join(', ')}` : 'Description only · no admitted runs'}</span>
          <span className="meta">{i.dataset ? `Dataset: ${i.dataset.id} v${i.dataset.version}` : 'No dataset link yet'}</span>
        </Link>
      </li>)}</ul>
      {lib.items.length === 0 && <div className="notice" data-tone="info"><p>No investigation description matches. The library is deliberately small; absence here is not evidence a topic was never studied.</p></div>}
      <div style={{ marginTop: 24 }}><CoverageNote coverage={lib.coverage} /></div>
    </Sheet>
  </>;
}
