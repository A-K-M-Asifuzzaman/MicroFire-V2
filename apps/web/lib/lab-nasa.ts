// NASA material for the Flame Lab, assembled on the server. Three tiers, always labelled:
//  - the admitted observation (BASS-II test B20, cell-checked against the primary source);
//  - investigation DESCRIPTIONS from NASA reports (what each program studied; not observations);
//  - NASA media (images.nasa.gov) with NASA's own captions, rights recorded in data/asset-rights.json.
import { catalog, investigationLibrary } from '@microfire/science';
import media from '../data/media.json';
import { conditionLabels, locatorText, value } from '../components/page-kit';

export type B20Facts = { observation: string; citation: string; href: string; conditions: { label: string; value: string; known: boolean }[] };
export type NasaMedia = { slug: string; kind: 'video' | 'image'; title: string; date: string; caption: string; page: string; src: string; poster: string | null; width: number; height: number };
export type Investigation = { id: string; program: string; title: string; focus: string; fuelPhase: string; platform: string; href: string; admitted: number };

export function b20Facts(): B20Facts {
  const e = catalog.experiments[0]!, claim = e.claims.find((c) => c.id === 'bass2-b20-burned-entire-sample') ?? e.claims[0]!;
  const source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const keys = ['material', 'thicknessMm', 'oxygenPct', 'flowCmS', 'flowDirection', 'pressureKpa', 'gravity'] as const;
  return {
    observation: claim.text, citation: `${source.title} · ${locatorText(e)}`, href: source.documentUrl,
    conditions: keys.map((k) => { const v = value(e, k); return { label: conditionLabels[k] ?? k, value: v ?? 'Not reported for this run', known: v !== null }; }),
  };
}

type RawMedia = { slug: string; kind: string; title: string; description: string; date_created: string; page_url: string; width: number; height: number };
/** Order: the two ISS photos of the BASS hardware first, then the two Saffire spacecraft-fire videos. */
const ORDER = ['bass-cassidy-2013', 'bass2-reduced-o2-gmt213', 'saffire-vi-pmma', 'saffire-v-ribs'];
export function nasaMedia(): NasaMedia[] {
  return (media as RawMedia[]).filter((m) => ORDER.includes(m.slug)).sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug)).map((m) => ({
    slug: m.slug, kind: m.kind === 'video' ? 'video' : 'image', title: m.title.replace(/ - with text$/, ''), date: m.date_created,
    caption: m.description.replace(/\s+/g, ' ').trim(), page: m.page_url,
    src: `/media/${m.slug}/${m.kind === 'video' ? 'video.mp4' : 'image.jpg'}`, poster: m.kind === 'video' ? `/media/${m.slug}/poster.jpg` : null,
    width: m.width, height: m.height,
  }));
}

export function investigations(): Investigation[] {
  return investigationLibrary('').map((r) => {
    const src = catalog.sources.find((s) => s.id === r.citation.sourceId);
    return { id: r.id, program: r.program, title: r.title.replace(/\s+/g, ' '), focus: r.focus, fuelPhase: r.fuelPhase, platform: r.platformContext,
      href: src?.url ?? r.source.url, admitted: r.admittedExperimentIds.length };
  });
}
