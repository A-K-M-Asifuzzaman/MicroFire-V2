import type { Catalog, Citation, Coverage, EvidenceLevel, Experiment, Source, TargetConditions } from '@microfire/shared';
import { catalog, catalogSha256, citationUrl } from './catalog';
import { quarantineLedger, isQuarantinedId } from './quarantine';

export const RANKING_VERSION = 'p1-conditions-lexical-v1';
/** Retrieval tolerances decide relevance only. They do not assert scientific equivalence of conditions. */
export const NUMERIC_TOLERANCE = { oxygenPct: 0.5, pressureKpa: 2, flowCmS: 1 } as const;
export const TARGET_FIELDS = ['gravity', 'material', 'geometry', 'oxygenPct', 'pressureKpa', 'flowCmS'] as const;
type TargetField = typeof TARGET_FIELDS[number];
type ConditionKey = keyof Experiment['conditions'];
const CONDITION_KEYS = ['gravity', 'material', 'geometry', 'flowDirection', 'oxygenPct', 'pressureKpa', 'flowCmS', 'thicknessMm'] as const satisfies readonly ConditionKey[];

// ---------- text ----------
const STOP = new Set(('a an and are as at be been being but by can could did do does doing for from had has have how i if in into is it its ' +
  'me my of on or our so than that the their them then there these they this those to was we were what when where which while who why will with would you your ' +
  'about any all also just only some such very tell show say said says establish established find found know known record records recorded ' +
  'experiment experiments test tests data study studies evidence nasa result results report reported happen happened please explain describe'
).split(' '));
const SYNONYMS: Record<string, string> = { airflow: 'flow', air: 'flow', velocity: 'flow', o2: 'oxygen', acrylic: 'pmma', plexiglas: 'pmma', plexiglass: 'pmma', thick: 'thickness', polymethylmethacrylate: 'pmma' };
const stem = (t: string) => t.length > 5 && t.endsWith('ing') ? t.slice(0, -3) : t.length > 4 && t.endsWith('ed') ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
export function tokenize(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().replace(/µ/g, 'u').split(/[^a-z0-9.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, '')).filter((t) => t && !STOP.has(t)).map((t) => stem(SYNONYMS[t] ?? t));
}
export const contentTokens = (text: string) => [...new Set(tokenize(text))];

// ---------- record index ----------
const FIELD_WORDS: Record<ConditionKey, string> = {
  gravity: 'gravity microgravity acceleration', material: 'material', geometry: 'geometry width', flowDirection: 'direction',
  oxygenPct: 'oxygen', pressureKpa: 'pressure', flowCmS: 'flow', thicknessMm: 'thickness'
};
export const FIELD_LABELS: Record<ConditionKey, string> = {
  gravity: 'Gravity', material: 'Material', geometry: 'Geometry', flowDirection: 'Flow direction',
  oxygenPct: 'Oxygen', pressureKpa: 'Pressure', flowCmS: 'Initial airflow', thicknessMm: 'Thickness'
};
type Index = { vocab: Set<string>; fieldTokens: Map<string, ConditionKey[]> };
const indexes = new WeakMap<Experiment, Index>();
export function indexExperiment(e: Experiment): Index {
  const cached = indexes.get(e);
  if (cached) return cached;
  const vocab = new Set(contentTokens([e.program, e.testId, e.title, e.rawFlow, ...e.claims.map((c) => c.text)].join(' ')));
  const fieldTokens = new Map<string, ConditionKey[]>();
  for (const key of CONDITION_KEYS) {
    const c = e.conditions[key];
    for (const t of contentTokens(FIELD_WORDS[key])) fieldTokens.set(t, [...(fieldTokens.get(t) ?? []), key]);
    if (c.status === 'known') for (const t of contentTokens(`${FIELD_WORDS[key]} ${c.value}`)) vocab.add(t);
  }
  const index = { vocab, fieldTokens };
  indexes.set(e, index);
  return index;
}

export function formatCondition(e: Experiment, key: ConditionKey): string {
  const c = e.conditions[key];
  if (c.status === 'unknown') return `${FIELD_LABELS[key]}: unknown (${c.reason})`;
  return `${FIELD_LABELS[key]}: ${c.value}${'unit' in c ? ` ${c.unit}` : ''}`;
}

type Match = { result: 'match' | 'mismatch' | 'missing'; detail: string };
export function matchTarget(e: Experiment, field: TargetField, target: string | number): Match {
  const c = e.conditions[field];
  if (c.status === 'unknown') return { result: 'missing', detail: `${field}: not recorded (${c.reason})` };
  if (typeof target === 'number' && typeof c.value === 'number' && field in NUMERIC_TOLERANCE) {
    const tolerance = NUMERIC_TOLERANCE[field as keyof typeof NUMERIC_TOLERANCE];
    const unit = 'unit' in c ? c.unit : '';
    const detail = `${field}: target ${target} ${unit}, recorded ${c.value} ${unit} (tolerance ±${tolerance}; ${c.note})`;
    return { result: Math.abs(c.value - target) <= tolerance ? 'match' : 'mismatch', detail };
  }
  const want = contentTokens(String(target)), have = new Set(contentTokens(String(c.value)));
  const ok = want.length > 0 && want.every((t) => have.has(t));
  const displayedTarget = String(target).length > 200 ? `${String(target).slice(0, 200)}… (truncated for display)` : String(target);
  return { result: ok ? 'match' : 'mismatch', detail: `${field}: target "${displayedTarget}", recorded "${c.value}"` };
}

// ---------- coverage / search ----------
export function coverage(dataset: Catalog = catalog): Coverage {
  const n = dataset.experiments.length, q = quarantineLedger.records.length;
  return {
    datasetVersion: dataset.datasetVersion, validatedExperiments: n, validatedSources: dataset.sources.length, quarantinedCandidates: q,
    statement: `${n} validated experiment${n === 1 ? '' : 's'} from ${dataset.sources.length} source${dataset.sources.length === 1 ? '' : 's'}. ${q} legacy candidate rows are quarantined pending primary-source review and are excluded. Absence from this catalog is not evidence that a condition was never studied.`
  };
}

const eqi = (a: string, b: string) => a.normalize('NFKC').toLowerCase() === b.normalize('NFKC').toLowerCase();
export function searchExperiments(query: { q?: string | undefined; program?: string | undefined; material?: string | undefined; flowDirection?: string | undefined }, dataset: Catalog = catalog): Experiment[] {
  const terms = query.q ? contentTokens(query.q) : [];
  const known = (c: Experiment['conditions'][ConditionKey], v: string) => c.status === 'known' && eqi(String(c.value), v);
  return dataset.experiments.filter((e) =>
    (!query.program || eqi(e.program, query.program)) &&
    (!query.material || known(e.conditions.material, query.material)) &&
    (!query.flowDirection || known(e.conditions.flowDirection, query.flowDirection)) &&
    terms.every((t) => indexExperiment(e).vocab.has(t)));
}

// ---------- ranking ----------
export function rankEvidence(request: { question: string; targetConditions: TargetConditions; limit: number }, dataset: Catalog = catalog) {
  const question = contentTokens(request.question);
  const requested = TARGET_FIELDS.filter((f) => request.targetConditions[f] !== undefined);
  const items = dataset.experiments.map((e) => {
    const hits = question.filter((t) => indexExperiment(e).vocab.has(t));
    const lexical = question.length ? hits.length / question.length : 0;
    const matchedFields: string[] = [], mismatches: string[] = [], missingFields: string[] = [], reasons: string[] = [];
    for (const field of requested) {
      const m = matchTarget(e, field, request.targetConditions[field]!);
      if (m.result === 'match') { matchedFields.push(field); reasons.push(`Matches ${m.detail}`); }
      else (m.result === 'mismatch' ? mismatches : missingFields).push(m.detail);
    }
    const conditionShare = requested.length ? matchedFields.length / requested.length : 0;
    const relevanceScore = Math.round((requested.length ? 0.7 * conditionShare + 0.3 * lexical : lexical) * 1000) / 1000;
    const evidenceLevel: EvidenceLevel = requested.length
      ? matchedFields.length === requested.length ? 'direct' : matchedFields.length ? 'analogous' : 'gap'
      : lexical > 0 ? 'analogous' : 'gap';
    if (hits.length) reasons.push(`Question terms found in the record: ${hits.join(', ')}`);
    reasons.push(requested.length
      ? `Score = 0.7 × ${matchedFields.length}/${requested.length} conditions matched + 0.3 × ${hits.length}/${question.length || 0} question terms (${RANKING_VERSION}).`
      : `No target conditions given; score = ${hits.length}/${question.length || 0} question terms found, so applicability cannot exceed analogous (${RANKING_VERSION}).`);
    const limitations = [...e.limitations, 'Score is retrieval relevance, not fire risk, safety or scientific confidence.'];
    if (dataset.experiments.length < 2) limitations.push(`Ranked within a validated catalog of ${dataset.experiments.length} experiment; ordering across studies is not yet meaningful.`);
    return { experimentId: e.id, evidenceLevel, relevanceScore, matchedFields, mismatches, missingFields, reasons, limitations };
  }).filter((i) => i.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || a.experimentId.localeCompare(b.experimentId))
    .slice(0, request.limit);
  return { items, rankingVersion: RANKING_VERSION, datasetVersion: dataset.datasetVersion, scoreMeaning: 'retrieval-relevance-not-fire-risk' as const, coverage: coverage(dataset) };
}

// ---------- gaps ----------
export function classifyGaps(target: TargetConditions, dataset: Catalog = catalog) {
  const fields = TARGET_FIELDS.filter((f) => target[f] !== undefined).map((field) => {
    const results = dataset.experiments.map((e) => ({ e, m: matchTarget(e, field, target[field]!) }));
    const ids = (r: 'match' | 'mismatch' | 'missing') => results.filter((x) => x.m.result === r).map((x) => x.e.id);
    if (!dataset.experiments.length) return { field, status: 'not-in-catalog' as const, experimentIds: [], note: 'The validated catalog holds no records.' };
    if (ids('match').length) return { field, status: 'covered' as const, experimentIds: ids('match'), note: results.filter((x) => x.m.result === 'match').map((x) => x.m.detail).join('; ') };
    if (ids('mismatch').length) return { field, status: 'conditions-differ' as const, experimentIds: ids('mismatch'), note: results.filter((x) => x.m.result === 'mismatch').map((x) => x.m.detail).join('; ') };
    return { field, status: 'not-recorded' as const, experimentIds: ids('missing'), note: results.map((x) => x.m.detail).join('; ') };
  });
  return {
    fields,
    statements: [
      'Covered means at least one validated record matches within retrieval tolerance; it does not mean the scientific question is answered or that conditions are equivalent.',
      'Not found in our validated catalog is not the same as never studied globally.',
      `${quarantineLedger.records.length} legacy candidate rows are quarantined pending source review and were not consulted.`
    ],
    coverage: coverage(dataset)
  };
}

// ---------- citations ----------
export function sameCitation(a: Citation, b: Citation): boolean {
  if (a.sourceId !== b.sourceId || a.locator.kind !== b.locator.kind || a.locator.section !== b.locator.section) return false;
  return a.locator.kind === 'section' || (b.locator.kind === 'pdf' && a.locator.page === b.locator.page && a.locator.printedPage === b.locator.printedPage);
}
export function catalogCitations(dataset: Catalog = catalog): Citation[] {
  return dataset.experiments.flatMap((e) => [...e.claims.flatMap((c) => c.citations), ...CONDITION_KEYS.flatMap((k) => { const c = e.conditions[k]; return c.status === 'known' ? [c.citation] : []; })]);
}
export const isCatalogCitation = (c: Citation, dataset: Catalog = catalog) => catalogCitations(dataset).some((x) => sameCitation(x, c));
export const resolveCitationUrl = (c: Citation, dataset: Catalog = catalog) => citationUrl(c.sourceId, c.locator.kind === 'pdf' ? c.locator.page : undefined, dataset);

type VerifySubject = { type: 'claim'; claimId: string; kind?: string | undefined } | { type: 'condition'; experimentId: string; field: ConditionKey };
export function verifyCitations(request: { subject: VerifySubject; citations: Citation[] }, dataset: Catalog = catalog) {
  const scope = 'citation-lineage-only-not-scientific-truth' as const;
  const subject = request.subject;
  let expected: Citation[];
  const issues: string[] = [];
  if (!request.citations.length) issues.push('At least one recorded citation is required.');
  if (subject.type === 'claim') {
    const claim = dataset.experiments.flatMap((e) => e.claims).find((c) => c.id === subject.claimId);
    if (!claim) return { verdict: 'unknown-subject' as const, issues: [isQuarantinedId(subject.claimId) ? 'Claim belongs to a quarantined legacy record.' : 'Claim is not in the validated catalog.'], resolvedUrls: [], scope };
    if (subject.kind && subject.kind !== claim.kind) issues.push(`Claim is classified as ${claim.kind}, not ${subject.kind}.`);
    expected = claim.citations;
  } else {
    const e = dataset.experiments.find((x) => x.id === subject.experimentId);
    if (!e) return { verdict: 'unknown-subject' as const, issues: [isQuarantinedId(subject.experimentId) ? 'Experiment is a quarantined legacy record.' : 'Experiment is not in the validated catalog.'], resolvedUrls: [], scope };
    const c = e.conditions[subject.field];
    if (c.status === 'unknown') { issues.push(`${subject.field} is unknown for ${e.id}; no source value exists to cite (${c.reason}).`); expected = []; }
    else expected = [c.citation];
  }
  const resolvedUrls: string[] = [];
  for (const c of request.citations) {
    if (!dataset.sources.some((s) => s.id === c.sourceId)) issues.push(`Unknown source ${c.sourceId}.`);
    else if (!expected.some((x) => sameCitation(x, c))) issues.push(`Locator ${c.locator.section} does not match the recorded locator for this subject.`);
    else resolvedUrls.push(resolveCitationUrl(c, dataset));
  }
  return { verdict: issues.length ? 'lineage-mismatch' as const : 'lineage-verified' as const, issues, resolvedUrls: [...new Set(resolvedUrls)], scope };
}

// ---------- compare ----------
export function compareExperiments(ids: string[], dataset: Catalog = catalog) {
  const records = ids.map((id) => dataset.experiments.find((e) => e.id === id));
  const unknownIds = ids.filter((_, i) => !records[i]);
  if (unknownIds.length) return { ok: false as const, unknownIds, quarantinedIds: unknownIds.filter(isQuarantinedId) };
  const exps = records as Experiment[];
  const differences: string[] = [], missingFields: string[] = [];
  for (const key of CONDITION_KEYS) {
    const unknown = exps.filter((e) => e.conditions[key].status === 'unknown');
    if (unknown.length) { missingFields.push(`${key}: unknown for ${unknown.map((e) => e.id).join(', ')}`); continue; }
    if (new Set(exps.map((e) => String(e.conditions[key].value).toLowerCase())).size > 1)
      differences.push(`${key}: ${exps.map((e) => `${formatCondition(e, key).split(': ')[1]} (${e.id})`).join(' vs ')}`);
  }
  if (new Set(exps.map((e) => e.rawFlow)).size > 1) differences.push(`Recorded air display sequence: ${exps.map((e) => `"${e.rawFlow}" (${e.id})`).join(' vs ')}`);
  if (new Set(exps.map((e) => e.program)).size > 1) differences.push(`Program: ${exps.map((e) => `${e.program} (${e.id})`).join(' vs ')}`);
  const citations: Citation[] = [];
  for (const c of exps.flatMap((e) => [...e.claims.flatMap((x) => x.citations), ...CONDITION_KEYS.flatMap((k) => { const v = e.conditions[k]; return v.status === 'known' ? [v.citation] : []; })]))
    if (!citations.some((x) => sameCitation(x, c))) citations.push(c);
  return {
    ok: true as const,
    data: {
      experimentIds: ids,
      // ponytail: 'controlled' is never emitted until the schema captures full setup (flow restrictor, sample, procedure); see B16/B19 review.
      comparability: missingFields.length ? 'insufficient-data' as const : 'confounded' as const,
      differences, missingFields,
      limitations: [
        'Only fields captured in the validated schema were compared; unextracted setup differences (flow restrictor, sample number, procedure) may exist.',
        'A difference in recorded outcome between records does not establish which condition caused it.',
        ...new Set(exps.flatMap((e) => e.limitations))
      ],
      citations
    }
  };
}

// ---------- sources / export ----------
export function sourceDetail(id: string, dataset: Catalog = catalog) {
  const source = dataset.sources.find((s) => s.id === id);
  if (!source) return null;
  const citedBy = dataset.experiments.filter((e) => e.sourceIds.includes(id)).map((e) => ({
    experimentId: e.id,
    claimIds: e.claims.filter((c) => c.citations.some((x) => x.sourceId === id)).map((c) => c.id),
    conditionFields: CONDITION_KEYS.filter((k) => { const c = e.conditions[k]; return c.status === 'known' && c.citation.sourceId === id; })
  }));
  return { source, citedBy };
}

export function exportEvidence(ids: string[], dataset: Catalog = catalog, sha256: string = catalogSha256) {
  const unique = [...new Set(ids)];
  const unknownIds = unique.filter((id) => !dataset.experiments.some((e) => e.id === id));
  if (unknownIds.length) return { ok: false as const, unknownIds };
  const records = unique.map((id) => {
    const experiment = dataset.experiments.find((e) => e.id === id)!;
    const sources: Source[] = dataset.sources.filter((s) => experiment.sourceIds.includes(s.id));
    const links = new Map<string, { sourceId: string; page: number | null; url: string }>();
    for (const s of sources) links.set(`${s.id}#`, { sourceId: s.id, page: null, url: s.url });
    for (const c of [...experiment.claims.flatMap((x) => x.citations), ...CONDITION_KEYS.flatMap((k) => { const v = experiment.conditions[k]; return v.status === 'known' ? [v.citation] : []; })]) {
      const page = c.locator.kind === 'pdf' ? c.locator.page : null;
      links.set(`${c.sourceId}#${page}`, { sourceId: c.sourceId, page, url: resolveCitationUrl(c, dataset) });
    }
    return { experiment, sources, citationLinks: [...links.values()] };
  });
  return {
    ok: true as const,
    data: {
      exportVersion: 1 as const, datasetVersion: dataset.datasetVersion, catalogSha256: sha256, records,
      disclaimer: 'Educational research export of source-checked transcriptions. Not a NASA product, not endorsed by NASA, and not fire-safety guidance. Verify values against the cited primary source before reuse; NASA source rights apply (facts-only reuse).'
    }
  };
}
