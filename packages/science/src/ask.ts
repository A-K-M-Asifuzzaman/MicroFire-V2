import type { AnswerStatement, Catalog, Citation, Experiment, TargetConditions } from '@microfire/shared';
import { catalog } from './catalog';
import { FIELD_LABELS, TARGET_FIELDS, contentTokens, tokenize, sameCitation, coverage, formatCondition, indexExperiment, isCatalogCitation, matchTarget, rankEvidence } from './evidence';
import { isQuarantinedTestId } from './quarantine';

export const RETRIEVAL_VERSION = 'p1-grounded-template-v1';

/**
 * Deterministic grounded answering. No language model or provider is called: answers are assembled only from
 * validated catalog statements and their recorded citations, then every citation is re-verified before release.
 * The question is treated as untrusted data; nothing in it can alter rules, sources or output format.
 */
const UNSUPPORTED: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(ignore|disregard|forget)\b.{0,40}\b(instruction|rule|prompt|previous|above)s?\b|\bsystem prompt\b|\byou are now\b|\bjailbreak\b/i,
    reason: 'The question contains instructions aimed at the assistant. PIX only answers research questions from the validated catalog.' },
  { pattern: /\b(safe|safety|unsafe|certif\w*|guarantee\w*|approv\w*|compliant|hazard\w*|danger\w*)\b/i,
    reason: 'The validated catalog cannot assess or certify fire safety. It records experiment conditions and observations only; no safety judgement is supported.' },
  { pattern: /\b(lunar|moon|mars|martian|habitat|regolith|exploration atmosphere)\b/i,
    reason: 'No validated record measured lunar or Martian gravity or atmospheres. Orbital (ISS) observations cannot be applied directly to those environments.' },
  { pattern: /\b(probabilit\w*|likelihood|chance of|risk score|percent chance|forecast\w*|predict\w*|will (it|the flame))\b/i,
    reason: 'The catalog supports no probabilistic or predictive fire-risk model. Recorded observations are not forecasts.' },
  { pattern: /\b(should (we|i|astronauts|crew)|recommend\w*|how (do|to|can) (i |we )?(put out|extinguish|prevent|suppress))\b/i,
    reason: 'Operational fire-safety recommendations are outside scope; consult official NASA or agency procedures.' }
];
const CAUSAL = /\b(caus\w*|because|effect of|affect\w*|impact\w*|faster|slower|higher|lower|more|less|increas\w*|decreas\w*|reduc\w*|trend|compar\w*|versus|vs)\b/i;
// Generic combustion words cannot by themselves make a record relevant (e.g. "how did cotton burn?" must not return PMMA evidence).
// ponytail: fixed word list, replace with an evaluated material/program vocabulary when the corpus grows.
const GENERIC = new Set(contentTokens('flame flames fire fires burn burned burning combustion sample samples spread ignite ignition extinguish extinction'));
const TEST_ID = /\b([bf]\d{1,2}|gmt\d{2,3}-t\d{1,2}[ab]?)\b/gi;

type Abstain = { abstained: true; code: 'unsupported-intent' | 'no-relevant-evidence' | 'quarantined-record' | 'citation-verification-failed'; reason: string; citations: Citation[]; datasetVersion: string; retrievalVersion: string };
type Answered = { abstained: false; answer: string; statements: AnswerStatement[]; claimIds: string[]; citations: Citation[]; limitations: string[]; datasetVersion: string; retrievalVersion: string };

export function verifyAnswerStatements(statements: AnswerStatement[], dataset: Catalog = catalog): boolean {
  const claims = dataset.experiments.flatMap((e) => e.claims);
  return statements.every((s) => (s.category === 'unknown-or-gap' || s.citations.length > 0) &&
    s.citations.every((c) => isCatalogCitation(c, dataset)) &&
    (s.claimId === null || claims.some((c) => c.id === s.claimId && s.citations.every((x) => c.citations.some((y) => sameCitation(y, x))))));
}

export function answerQuestion(request: { question: string; targetConditions: TargetConditions }, dataset: Catalog = catalog, compose: (e: Experiment[], question: string, t: TargetConditions) => AnswerStatement[] = composeStatements): Abstain | Answered {
  const base = { datasetVersion: dataset.datasetVersion, retrievalVersion: RETRIEVAL_VERSION };
  const abstain = (code: Abstain['code'], reason: string): Abstain => ({ abstained: true, code, reason, citations: [], ...base });
  const question = request.question;
  for (const rule of UNSUPPORTED) if (rule.pattern.test(question)) return abstain('unsupported-intent', rule.reason);

  const mentioned = [...question.matchAll(TEST_ID)].map((m) => m[1]!.toLowerCase());
  const unknownTests = mentioned.filter((t) => !dataset.experiments.some((e) => e.testId.toLowerCase() === t));
  if (unknownTests.some(isQuarantinedTestId))
    return abstain('quarantined-record', `${unknownTests.filter(isQuarantinedTestId).map((t) => t.toUpperCase()).join(', ')} is a legacy candidate quarantined pending primary-source review; it is not validated evidence and is not used in answers.`);
  if (unknownTests.length) return abstain('no-relevant-evidence', `${unknownTests.map((t) => t.toUpperCase()).join(', ')} is not in the validated catalog. Not found here is not the same as never studied.`);

  const terms = contentTokens(question);
  const ranked = rankEvidence({ question, targetConditions: request.targetConditions, limit: 3 }, dataset);
  const relevant = ranked.items
    .filter((i) => i.matchedFields.length > 0 || terms.some((t) => !GENERIC.has(t) && indexExperiment(dataset.experiments.find((e) => e.id === i.experimentId)!).vocab.has(t)))
    .map((i) => dataset.experiments.find((e) => e.id === i.experimentId)!);
  const named = relevant.filter((e) => mentioned.includes(e.testId.toLowerCase()));
  const records = named.length ? named : relevant;
  if (!records.length) return abstain('no-relevant-evidence', 'No validated record matches this question or its target conditions. Not found in our catalog is not the same as never studied.');

  const statements = compose(records, question, request.targetConditions);
  if (CAUSAL.test(question))
    statements.push({ category: 'unknown-or-gap', text: `This asks about a relationship or trend. ${dataset.experiments.length < 2 ? 'One validated record' : 'These records'} cannot establish causation or a trend; that requires a controlled comparison the catalog does not yet support.`, claimId: null, citations: [] });
  if (!verifyAnswerStatements(statements, dataset))
    return abstain('citation-verification-failed', 'A drafted statement cited a locator that does not resolve to the validated catalog, so no answer was released.');
  const claimIds = [...new Set(statements.flatMap((s) => (s.claimId ? [s.claimId] : [])))];
  if (!claimIds.length) return abstain('no-relevant-evidence', 'No source-backed observation could be cited for this question.');
  const citations: Citation[] = [];
  for (const c of statements.flatMap((s) => s.citations)) if (!citations.some((x) => sameCitation(x, c))) citations.push(c);
  const headings: Record<AnswerStatement['category'], string> = {
    'direct-observation': 'Direct observation', 'supported-derivation': 'Supported derivation', 'scientific-interpretation': 'Scientific interpretation',
    'analogous-or-mechanistic': 'Analogous or mechanistic evidence', 'unknown-or-gap': 'Unknown or research gap'
  };
  return {
    abstained: false, statements, claimIds, citations,
    answer: statements.map((s) => `${headings[s.category]}: ${s.text}`).join('\n'),
    limitations: [...new Set([...records.flatMap((e) => e.limitations), coverage(dataset).statement, 'Generated from a fixed template over validated records; no language model wrote this answer.'])],
    ...base
  };
}

function composeStatements(records: Experiment[], question: string, target: TargetConditions): AnswerStatement[] {
  const out: AnswerStatement[] = [];
  const terms = contentTokens(question);
  // Report gaps in the asker's own words, not stems; causal words are covered by the causation statement.
  const surface = new Map<string, string>();
  for (const word of question.toLowerCase().match(/[a-z0-9.µ]+/g) ?? []) { const t = tokenize(word)[0]; if (t && !surface.has(t) && !CAUSAL.test(word)) surface.set(t, word); }
  const unmatched = new Set(terms);
  for (const e of records) {
    const index = indexExperiment(e);
    for (const t of terms) if (index.vocab.has(t)) unmatched.delete(t);
    for (const claim of e.claims) {
      const category = claim.kind === 'observed' ? 'direct-observation' : claim.kind === 'derived' ? 'supported-derivation' : claim.kind === 'interpretation' ? 'scientific-interpretation' : 'unknown-or-gap';
      out.push({ category, text: `${e.testId}: ${claim.text}`, claimId: claim.id, citations: claim.citations });
    }
    const asked = new Set([...terms.flatMap((t) => index.fieldTokens.get(t) ?? []), ...TARGET_FIELDS.filter((f) => target[f] !== undefined)]);
    for (const key of asked) {
      const c = e.conditions[key];
      for (const t of terms) if ((index.fieldTokens.get(t) ?? []).includes(key)) unmatched.delete(t);
      if (c.status === 'unknown') out.push({ category: 'unknown-or-gap', text: `${e.testId} ${formatCondition(e, key)}`, claimId: null, citations: [] });
      else out.push({ category: c.basis === 'derived' ? 'supported-derivation' : 'direct-observation', text: `${e.testId} ${formatCondition(e, key)} — ${c.note}`, claimId: null, citations: [c.citation] });
    }
    const requested = TARGET_FIELDS.filter((f) => target[f] !== undefined);
    if (requested.length) {
      const matched = requested.filter((f) => matchTarget(e, f, target[f]!).result === 'match');
      if (matched.length && matched.length < requested.length) {
        const cites = matched.flatMap((f) => { const c = e.conditions[f]; return c.status === 'known' ? [c.citation] : []; });
        out.push({ category: 'analogous-or-mechanistic', text: `${e.testId} is analogous, not direct, evidence for your target: it matches ${matched.map((f) => FIELD_LABELS[f].toLowerCase()).join(', ')} but not ${requested.filter((f) => !matched.includes(f)).map((f) => FIELD_LABELS[f].toLowerCase()).join(', ')}.`, claimId: null, citations: cites.slice(0, 1) });
      }
    }
  }
  for (const t of unmatched) if (!surface.has(t)) unmatched.delete(t);
  if (unmatched.size) out.push({ category: 'unknown-or-gap', text: `Not reported in the validated record${records.length > 1 ? 's' : ''}: ${[...unmatched].map((t) => surface.get(t)).join(', ')}. Not found in our catalog is not the same as never studied.`, claimId: null, citations: [] });
  return out;
}
