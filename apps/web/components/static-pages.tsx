// Server pages. The only client island is the opt-in local training preview entry on the two BASS-II mission pages.
import { Suspense } from 'react';
import { b20Data } from '../game/contract/b20';
import { partSpecs } from '../game/contract/parts';
import { PreviewEntry } from '../game/preview-entry';
import Link from 'next/link';
import { featureLabels, features, missionDefinitions, type Feature } from '@microfire/shared';
import { catalog, coverage, quarantineLedger, sourceDetail } from '@microfire/science';
import { CoverageNote, Kind } from './evidence-ui';
import { BAY_TOUR, BayTeaser } from './home-sections';
import { feature, PageHero, Sheet } from './page-kit';

export function SourcesPage() {
  const cov = coverage();
  const byStatus = quarantineLedger.records.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  return <>
    <PageHero eyebrow="Sources & provenance" title="Every claim starts on a page you can open." lede="The admitted source, how it was checked, what it is cited for, and what is deliberately held back." status={{ feature: feature('/sources')! }} />
    <Sheet>
      {catalog.sources.map((s) => {
        const detail = sourceDetail(s.id);
        return <article key={s.id} className="panel stack frame" style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ margin: 0 }}>{s.institution} · NTRS {s.documentId}</p>
          <h2 style={{ fontSize: 'var(--step-2)', margin: 0 }}>{s.title}</h2>
          <div className="actions">
            <a className="btn btn-quiet btn-sm" href={s.url} rel="noopener noreferrer" target="_blank">NASA NTRS record <span aria-hidden="true">↗</span></a>
            <a className="btn btn-quiet btn-sm" href={s.documentUrl} rel="noopener noreferrer" target="_blank">Report PDF <span aria-hidden="true">↗</span></a>
          </div>
          <p><strong>How it was checked:</strong> {s.verification.notes}</p>
          <p><strong>Rights ({s.rights.reuse}):</strong> {s.rights.statement} {s.rights.notes}</p>
          {detail && <p><strong>Cited by:</strong> {detail.citedBy.map((c) => <span key={c.experimentId}><Link href={`/experiments/${c.experimentId}`}>{c.experimentId}</Link> ({c.claimIds.length} claim{c.claimIds.length === 1 ? '' : 's'}; condition fields: {c.conditionFields.join(', ')})</span>)}</p>}
          <p className="meta" style={{ overflowWrap: 'anywhere' }}>Accessed {s.accessedAt.slice(0, 10)} · verified {s.verification.verifiedAt.slice(0, 10)} · SHA-256 <span className="mono">{s.sha256}</span></p>
        </article>;
      })}
      <section aria-labelledby="coverage-title" className="prose">
        <h2 id="coverage-title">Research coverage</h2>
        <CoverageNote coverage={cov} />
        <p style={{ marginTop: 16 }}>The quarantine ledger holds {quarantineLedger.records.length} legacy rows: {Object.entries(byStatus).map(([k, n]) => `${n} ${k.replaceAll('-', ' ')}`).join(', ')}. Quarantined rows are never searchable, answerable, comparable or exportable. Their legacy page locators are unverified.</p>
      </section>
    </Sheet>
  </>;
}

export function MethodologyPage() {
  return <>
    <PageHero eyebrow="Methodology" title="How a page becomes evidence." lede="The path from a NASA document to what MicroFire shows you, and every place that path can stop." status={{ feature: feature('/methodology')! }} />
    <Sheet>
      <ol className="steps" aria-label="Evidence pipeline">
        <li><b>Source</b><span>A NASA document, hashed and inspected page by page.</span></li>
        <li><b>Record</b><span>Table cells copied with field-level page locators; unknowns stay unknown.</span></li>
        <li><b>Claim</b><span>Each statement is typed: observed, derived, interpretation, hypothesis or unknown.</span></li>
        <li><b>Limitation</b><span>Canonical caveats travel with every answer and export.</span></li>
      </ol>
      <div className="prose">
        <h2>Five kinds of statement</h2>
        <div className="categories">
          <div><Kind kind="direct-observation" /><p>Recorded in a cited source for the stated conditions. Only this level can be called direct evidence.</p></div>
          <div><Kind kind="supported-derivation" /><p>Computed from recorded values, such as a unit conversion, with the source it was derived from.</p></div>
          <div><Kind kind="scientific-interpretation" /><p>A reading of the evidence that needs its own citation and can be wrong.</p></div>
          <div><Kind kind="analogous-or-mechanistic" /><p>Evidence from different conditions or general mechanisms. Useful for reasoning, never a measurement of your case.</p></div>
          <div><Kind kind="unknown-or-gap" /><p>Not recorded in the admitted catalog. Not found here is not the same as never studied.</p></div>
        </div>
        <h2>Ranking, Ask and evaluation</h2>
        <p>One record cannot support controlled comparison or demonstrate retrieval quality. Backend ranking and fixed-template Ask APIs have a small author-labelled regression set; no AI model is used. Independent scientific evaluation and performance acceptance are pending.</p>
        <p>A retrieval score measures how well a record matches your words and conditions. It is not fire risk, safety or scientific confidence. A record only supports an outcome when an exact cited claim does.</p>
        <h2>Verification boundaries</h2>
        <p>Citation checks confirm that a statement points at the page it came from (lineage), not that the statement is scientifically true. The admitted B20 record was checked against the original PDF, including its table columns; it has not yet had an independent human scientific review.</p>
        <h2>Illustrations</h2>
        <p>The observatory scene, flame and apparatus drawings are original artwork for teaching. They are not NASA footage, a combustion simulation or a dimensioned reconstruction; where a drawing uses a sourced dimension, it says so and cites the page.</p>
        <h2>Offline and privacy</h2>
        <p>The app reads its bundled catalog without external requests. Offline here means an already-running local server with the internet disconnected; this is not an installable offline app. Questions you ask are not sent to any AI provider.</p>
      </div>
    </Sheet>
  </>;
}

const briefs: Record<string, { scene: string; action: string; carries: string; glyph: React.ReactNode }> = {
  'station-arrival': { scene: 'A small orbital research module and its observatory window.', action: 'Find your way around, inspect a real research question in its source, and learn the controls with PIX.', carries: 'Your mission objective and a first cited question.', glyph: <><ellipse cx="0" cy="-4" rx="18" ry="12" fill="none" stroke="var(--ultra)" strokeWidth="3" /><path d="M-22 14h44" stroke="var(--coral)" strokeWidth="3" /></> },
  'bass-assembly': { scene: 'An instrument bench with an engineering cutaway of the BASS-II flow duct.', action: 'Fit named parts in a workable order and repair a seeded but recoverable configuration fault.', carries: 'A qualified instrument and its correction log.', glyph: <><rect x="-22" y="-14" width="44" height="28" rx="6" fill="none" stroke="var(--coral)" strokeWidth="3" /><circle cx="-8" cy="0" r="4" fill="var(--mint)" /><circle cx="8" cy="0" r="4" fill="var(--mint)" /></> },
  'flame-detective': { scene: 'An investigation room built around source-specified evidence.', action: 'Make a falsifiable prediction, then reconcile it with the documented result and its uncertainty.', carries: 'Your prediction beside the recorded result, with citation.', glyph: <path d="M0-22c8 9 12 16 12 22a12 12 0 0 1-24 0c0-6 4-13 12-22z" fill="var(--sun)" stroke="var(--ink)" strokeWidth="3" /> },
  'claim-trial': { scene: 'A forensic evidence chamber.', action: 'Classify statements by evidence level, find missing controls and reject an unjustified claim.', carries: 'A reasoned evidence-level classification.', glyph: <g stroke="var(--ultra)" strokeWidth="3"><path d="M-18-10h36M-18 0h36M-18 10h36" /></g> },
  'lunar-habitat': { scene: 'A fictional lunar research setting with incomplete direct evidence.', action: 'Weigh what is documented, extrapolated and unknown, then write a provisional recommendation. Never a safety verdict.', carries: 'A Passport case report with its limitations.', glyph: <path d="M-12-14a18 18 0 1 0 24 24 14 14 0 1 1-24-24z" fill="none" stroke="var(--ultra)" strokeWidth="3" /> }
};
/** Missions with an illustrative diorama still (rendered from a QA-approved Meshy model; see data/asset-rights.json). */
const MISSION_ART = new Set<string>(['station-arrival', 'bass-assembly', 'flame-detective', 'claim-trial', 'lunar-habitat']);
function MissionArt({ id, glyph }: { id: string; glyph: React.ReactNode }) {
  const has = MISSION_ART.has(id);
  return <span className="mission-art" data-art={id} data-has-art={has || undefined} style={has ? { backgroundImage: `url(/media/missions/${id}.webp), radial-gradient(circle at 50% 62%, #fff 0, #dfe3ff 72%)` } : undefined} aria-hidden="true">
    <svg viewBox="-40 -40 80 80">{glyph}</svg><span className="mission-art-tag">Illustration</span>
  </span>;
}

export function MissionsPage({ playable = false }: { playable?: boolean }) {
  const missions = missionDefinitions.map((m, i) => ({ ...m, n: i + 1, feature: feature(`/missions/${m.id}`)! }));
  return <div className="wrap page">
    <header className="page-head reveal">
      <p className="eyebrow">{playable ? 'Mission map · five-mission campaign' : 'Mission map · preview, none playable yet'}</p>
      <h1>Five places. One scientific mystery.</h1>
      <p className="lede">{playable ? 'Explore the research station, follow the evidence and earn source-linked Passport entries. Progress is saved on the server for this browser.' : 'An interactive research station is being built. Every decision will leave an evidence trail in your Passport.'}</p>
      {playable && <Link className="button" href="/missions/play">Enter or resume the campaign</Link>}
    </header>
    {!playable && <StatusBlock f={feature('/missions')!} />}
    <ol className="mission-route" aria-label={playable ? 'Mission briefs: five missions in campaign order' : 'Mission map: five missions in order, none playable yet'}>{missions.map((m) => <li key={m.id}>
      <Link className="mission-card" href={`/missions/${m.id}`} data-mission={m.id}>
        <MissionArt id={m.id} glyph={briefs[m.id]!.glyph} />
        <span className="sticker-num" aria-hidden="true">{m.n}</span>
        <span className="mission-card-state">Mission 0{m.n} · {playable ? 'Mission brief' : featureLabels[m.feature.state]}</span>
        <b>{m.feature.title}</b>
        <span>{briefs[m.id]!.action}</span>
        {m.id === 'bass-assembly' && <em>3D bay tour open now</em>}
      </Link>
    </li>)}</ol>
    <div style={{ marginTop: 48 }}><BayTeaser compact /></div>
    <div style={{ marginTop: 32 }}>
      <p className="eyebrow">Evidence Passport / persists between missions</p>
      <p className="path-steps">{['Explore', 'Assemble', 'Observe', 'Verify', 'Decide'].flatMap((s, i) => i ? [<span key={`a${i}`} aria-hidden="true">→</span>, <span key={s}>{s}</span>] : [<span key={s}>{s}</span>])}</p>
      {playable ? <p className="meta">Complete missions in order in the <Link href="/missions/play">campaign</Link>. Open your earned Passport there to review citations and export the case report. Clearing this browser’s session cookie loses access to its anonymous campaign.</p> : <p className="meta">No mission is playable yet. Mission rules exist and are tested. The BASS-II training bay is built and can be <Link href={BAY_TOUR}>toured now</Link>; its gameplay opens after server integration. <Link href="/passport">See how the Passport will work</Link>.</p>}
    </div>
  </div>;
}
function StatusBlock({ f }: { f: Feature }) {
  return <div className="status-line"><span className="badge" data-state={f.state}>{featureLabels[f.state]}</span><p>{f.reason}</p></div>;
}
export const missionIds = missionDefinitions.map((m) => m.id);
/** The two missions the local BASS-II training preview spans. Public state is unchanged: without ?preview=… nothing loads. */
const previewMissions = new Set(['station-arrival', 'bass-assembly']);
export function MissionPage({ id, playable = false }: { id: string; playable?: boolean }) {
  const index = missionDefinitions.findIndex((m) => m.id === id);
  const m = missionDefinitions[index]!, f = feature(`/missions/${id}`)!, brief = briefs[id]!;
  const prev = m.prerequisite ? feature(`/missions/${m.prerequisite}`) : null;
  const b20 = catalog.experiments[0]!;
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="crumbs"><Link href="/missions">Mission map</Link> / Mission 0{index + 1}</nav>
    <header className="page-head reveal">
      <p className="eyebrow">Mission 0{index + 1} · {m.mechanic.replaceAll('-', ' ')}</p>
      <h1>{f.title}</h1>
    </header>
    {playable
      ? <div className="status-line"><span className="badge" data-state="available">Playable</span><p>Play this mission in the five-mission campaign. The MicroFire server checks every step.</p></div>
      : <StatusBlock f={f} />}
    <div className="mission-brief">
      <div className="stack">
      <figure className="mission-figure"><MissionArt id={id} glyph={brief.glyph} /><figcaption>{playable ? 'Illustrative concept of the scene, made for MicroFire. Not NASA imagery and not a measurement.' : 'Illustrative concept of the planned scene, made for MicroFire. Not NASA imagery, not a measurement and not a playable level.'}</figcaption></figure>
      <dl className="brief-dl">
        <div><dt>Scene</dt><dd>{brief.scene}</dd></div>
        <div><dt>What you will do</dt><dd>{brief.action}</dd></div>
        <div><dt>Carries forward</dt><dd>{brief.carries}</dd></div>
        <div><dt>Unlocks after</dt><dd>{prev ? prev.title : playable ? 'Available as the first mission' : 'Available as the first mission once released'}</dd></div>
      </dl>
      </div>
      {playable ? <div className="panel stack frame">
        <p className="eyebrow" style={{ margin: 0 }}>Playable now</p>
        <p style={{ margin: 0 }}>Missions run in order in one campaign. Each accepted step is saved on the MicroFire server and earns a source-linked Passport entry. Your case lasts 24 hours in this browser; there is no account.</p>
        <div className="actions"><Link className="btn btn-primary" href="/missions/play">Play the campaign</Link><Link className="btn btn-quiet btn-sm" href="/missions">Back to the map</Link><Link className="btn btn-quiet btn-sm" href={`/experiments/${b20.id}`}>Inspect the {b20.testId} record</Link></div>
      </div> : <div className="panel stack frame">
        <p className="eyebrow" style={{ margin: 0 }}>Not playable yet</p>
        {previewMissions.has(id)
          ? <p style={{ margin: 0 }}>This mission&apos;s rules are implemented and tested, and its 3D training bay is built. Gameplay, training qualification and Passport entries open only after the mission&apos;s server integration is approved. The tour below is illustrative and records nothing.</p>
          : <p style={{ margin: 0 }}>This mission&apos;s rules are implemented and tested, but its scene and controls are still being built. Nothing here is simulated gameplay.</p>}
        <button className="btn btn-quiet" disabled>{featureLabels[f.state]}</button>
        <div className="actions"><Link className="btn btn-quiet btn-sm" href="/missions">Back to the map</Link><Link className="btn btn-primary btn-sm" href={`/experiments/${b20.id}`}>Inspect the {b20.testId} record</Link></div>
      </div>}
    </div>
    {previewMissions.has(id) && <BayTeaser compact />}
    {previewMissions.has(id) && <Suspense fallback={null}><PreviewEntry data={{ parts: partSpecs(), b20: b20Data() }} /></Suspense>}
  </div>;
}

export function RoadmapPage() {
  const order = ['available', 'preview', 'coming_soon', 'locked', 'blocked'] as const;
  return <>
    <PageHero eyebrow="Product progress" title="What works today, and what does not." lede="Every route's real release status, straight from the feature registry. No dates are promised." status={{ feature: feature('/roadmap')! }} />
    <Sheet>
      <div className="notice" data-tone="info" style={{ marginBottom: 24 }}><p>Interfaces built for review (Evidence Workstation, Ask PIX, Research Frontier) keep their registry status until an independent review changes it.</p></div>
      <div className="status-groups">{order.map((state) => {
        const group = features.filter((f) => f.state === state);
        if (!group.length) return null;
        return <section key={state} aria-labelledby={`st-${state}`}>
          <h2 id={`st-${state}`} style={{ fontSize: 'var(--step-2)' }}>{featureLabels[state]} <span className="meta">({group.length})</span></h2>
          {group.map((f) => <div className="status-row" key={f.id}>
            <h3>{f.route.includes('[') ? f.title : <Link href={f.route}>{f.title}</Link>}</h3>
            <span className="badge" data-state={f.state}>{featureLabels[f.state]}</span>
            <p>{f.reason}</p>
          </div>)}
        </section>;
      })}</div>
    </Sheet>
  </>;
}

export function StatusPage({ f }: { f: Feature }) {
  return <div className="wrap page">
    <header className="page-head reveal"><p className="eyebrow">{featureLabels[f.state]}</p><h1>{f.title}</h1></header>
    <StatusBlock f={f} />
    <div className="actions"><button className="btn btn-quiet" disabled>{featureLabels[f.state]}</button><Link className="btn btn-primary" href="/atlas">Explore the admitted evidence</Link></div>
  </div>;
}
