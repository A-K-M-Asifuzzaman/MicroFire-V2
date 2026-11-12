import Link from 'next/link';
import { notFound } from 'next/navigation';
import { investigationLibrary } from '@microfire/science';
import { CitationChecker } from '../../../components/citation-checker';
import { CitationList, Limitations, type SourceRef } from '../../../components/evidence-ui';
import { PageHero, Sheet } from '../../../components/page-kit';

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const i = investigationLibrary().find((x) => x.id === id);
  return { title: i ? `${i.program} · Investigation Library` : 'Investigation not found' };
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  const i = investigationLibrary().find((x) => x.id === id);
  if (!i) notFound();
  const sources: SourceRef[] = [{ id: i.source.id, title: i.source.title, url: i.source.url, documentUrl: i.source.documentUrl },
    ...(i.dataset ? [{ id: i.dataset.id, title: `${i.program} dataset ${i.dataset.version}`, url: i.dataset.url, documentUrl: i.dataset.url }] : [])];
  const declared = [{ label: 'Report: experiment description', citation: i.citation }, { label: 'NTRS title and abstract', citation: i.contextCitation },
    ...(i.dataset ? [{ label: 'Dataset metadata', citation: i.dataset.citation }] : [])];
  return <>
    <PageHero compact eyebrow={`NASA Investigation Library · ${i.program}`} title={i.title} lede={i.focus}
      crumbs={<><Link href="/investigations">Investigation Library</Link> / {i.program}</>} />
    <Sheet>
      <div className="library-detail">
        <div className="stack">
          <p className="library-scope" data-testid="library-scope"><b>Source description, not run evidence.</b> {i.admittedExperimentIds.length
            ? <>Evidence comes only from its admitted run{i.admittedExperimentIds.length === 1 ? '' : 's'}: {i.admittedExperimentIds.map((e, n) => <span key={e}>{n ? ', ' : ''}<Link href={`/experiments/${e}`}>{e}</Link></span>)}.</>
            : <>No run from this investigation is admitted yet, so nothing here can answer a scientific question.</>}</p>
          <dl className="facts">
            <div><dt>Platform</dt><dd>{i.platformContext}</dd></div>
            <div><dt>Fuel</dt><dd>{i.fuelPhase.replace('-', ' ')}</dd></div>
            <div><dt>Report</dt><dd><a href={i.source.url} rel="noopener noreferrer" target="_blank">{i.source.title} (NASA NTRS)<span aria-hidden="true"> ↗</span></a> · <a href={i.source.documentUrl} rel="noopener noreferrer" target="_blank">PDF<span aria-hidden="true"> ↗</span></a></dd></div>
            <div><dt>Rights</dt><dd>{i.source.rightsDetermination}</dd></div>
            <div><dt>File SHA-256</dt><dd className="mono" style={{ overflowWrap: 'anywhere' }}>{i.source.sha256}</dd></div>
            <div><dt>Dataset</dt><dd>{i.dataset ? <><a href={i.dataset.url} rel="noopener noreferrer" target="_blank">{i.dataset.id} version {i.dataset.version}<span aria-hidden="true"> ↗</span></a> · DOI {i.dataset.doi}<br /><span className="meta">{i.dataset.rightsStatement}</span></> : 'Not linked'}</dd></div>
          </dl>
          <p className="meta">{i.datasetNote}</p>
          <div><p className="eyebrow" style={{ margin: 0 }}>Declared source locators</p><CitationList citations={declared.map((d) => d.citation)} sources={sources} /></div>
          <Limitations items={i.limitations} />
        </div>
        <CitationChecker investigationId={i.id} declared={declared} sources={sources} />
      </div>
    </Sheet>
  </>;
}
