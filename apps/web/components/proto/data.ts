import 'server-only';
import { catalog, coverage } from '@microfire/science';
import { b20Data } from '../../game/contract/b20';
import { partSpecs } from '../../game/contract/parts';
import { citationHref } from '../evidence-ui';
import { sources } from '../page-kit';

/** Real site content for both art-direction prototypes. PIX lines are fixed copy; counts come from the catalog. */
export type ProtoStation = { title: string; href: string; what: string; pix: string; tone: 'guide' | 'cite' | 'gap' };
export type ProtoCondition = { key: string; label: string; value: string | null; basis: 'recorded' | 'derived' | 'unknown'; note: string; href: string | null; where: string | null };
export type ProtoB20 = { id: string; testId: string; title: string; claim: string; claimHref: string | null; source: string; where: string;
  conditions: ProtoCondition[]; rawFlow: string[]; limitations: string[]; admitted: number; quarantined: number };

export function protoStations(): ProtoStation[] {
  const cov = coverage(), e = catalog.experiments[0]!;
  return [
    { title: 'Experiment Atlas', href: '/atlas', what: 'Browse real flame experiments', tone: 'guide', pix: `Only checked records count here: ${cov.validatedExperiments} admitted, ${cov.quarantinedCandidates} still in quarantine.` },
    { title: `${e.testId} dossier`, href: `/experiments/${e.id}`, what: 'Every value with its NASA page', tone: 'cite', pix: `${e.testId} is a real NASA test. Every value in its dossier links to the page it came from.` },
    { title: 'Evidence Workstation', href: '/dashboard', what: 'Trace a question to where confidence ends', tone: 'guide', pix: 'Bring me a question and we will trace it, step by step, to where the evidence ends.' },
    { title: 'Ask PIX', href: '/ask', what: 'Cited answers, or an honest “not known”', tone: 'cite', pix: 'I answer only from admitted records, with the page, or I say it is not known.' },
    { title: 'Research Frontier', href: '/gaps', what: 'What this catalog does not document', tone: 'gap', pix: 'This is where the records stop. I mark the gaps instead of guessing.' },
    { title: 'Missions', href: '/missions', what: 'Five missions, none playable yet', tone: 'guide', pix: 'Five missions are on the map. None is playable yet; the training bay is open for a tour.' }
  ];
}

export function protoB20(): ProtoB20 {
  const b = b20Data(), cov = coverage();
  const cite = b.claim.citations[0]!;
  const loc = cite.locator;
  const where = loc.kind === 'pdf' ? `${loc.section}, PDF page ${loc.page} (printed ${loc.printedPage})` : loc.section;
  return {
    id: b.id, testId: b.testId, title: b.title.replace(/^B20 — /, ''), claim: b.claim.text, claimHref: citationHref(cite, sources),
    source: sources.find((s) => s.id === cite.sourceId)?.title ?? cite.sourceId, where,
    conditions: b.rows.map((r) => ({ key: r.key, label: r.label, value: r.value, basis: r.basis as ProtoCondition['basis'], note: r.note,
      href: r.citation ? citationHref(r.citation, sources) : null,
      where: r.citation && r.citation.locator.kind === 'pdf' ? `PDF page ${r.citation.locator.page}` : null })),
    rawFlow: b.rawFlow.split(',').map((x) => x.trim()), limitations: b.limitations, admitted: cov.validatedExperiments, quarantined: cov.quarantinedCandidates
  };
}

export const protoParts = partSpecs;
