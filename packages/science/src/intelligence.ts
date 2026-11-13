import { InvestigationSchema, TransferResponseSchema, equalRecordedCondition, type TransferRequest, type TransferRecord, type Catalog, type Citation, type TargetConditions } from '@microfire/shared';
import descriptions from '../../../data/investigations/library-v1.json';
import { catalog } from './catalog';
import { coverage, matchTarget, rankEvidence, sameCitation, TARGET_FIELDS } from './evidence';
import { answerQuestion } from './ask';
import { isQuarantinedId } from './quarantine';

export const INVESTIGATION_LIBRARY_VERSION = 'investigation-library-v1' as const;
export function investigationLibrary(query = '', dataset: Catalog = catalog) {
  const terms = query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return descriptions.map(row => InvestigationSchema.parse({ ...row,
    admittedExperimentIds: dataset.experiments.filter(e => e.program === row.program).map(e => e.id)
  })).filter(row => terms.every(t => `${row.program} ${row.title} ${row.focus} ${row.fuelPhase}`.toLowerCase().includes(t)));
}
export function verifyInvestigationCitations(id: string, citations: Citation[]) {
  const entry = investigationLibrary().find(e => e.id === id);
  const valid = !!entry && citations.length > 0 && citations.every(c => [entry.citation, entry.contextCitation, ...(entry.dataset ? [entry.dataset.citation] : [])].some(expected => sameCitation(c, expected)));
  return { valid, issues: valid ? [] : ['Investigation or exact metadata source locator does not match.'], scope: 'investigation-description-lineage-only-not-scientific-truth' as const };
}
export function analyzeTransfer(request: TransferRequest, dataset: Catalog = catalog) {
  const records: TransferRecord[] = request.experimentIds.map(id => {
    const experiment = dataset.experiments.find(e => e.id === id);
    if (!experiment || isQuarantinedId(id)) throw Error('Transfer requires admitted experimental records.');
    const dimensions: TransferRecord['dimensions'] = TARGET_FIELDS.map(field => {
      const condition = experiment.conditions[field], target = request.targetConditions[field];
      const base = { field, target: target ?? null, source: condition.value,
        unit: condition.status === 'known' && 'unit' in condition ? condition.unit : null,
        basis: condition.status === 'known' ? condition.basis : 'unknown' as const,
        citations: condition.status === 'known' ? [condition.citation] : [] };
      if (target === undefined) return { ...base, status: 'target-unspecified', reason: 'Target condition not supplied; no match is assumed.' };
      if (condition.status === 'unknown') return { ...base, status: 'source-not-recorded', reason: condition.reason };
      if (condition.basis !== 'recorded') return { ...base, status: 'context-only', reason: 'Series context or a derived value is not an exact recorded run condition.' };
      const exact = equalRecordedCondition(target, condition.value);
      if (exact) return { ...base, status: 'exact-recorded', reason: 'Equal to the recorded condition; equality alone does not establish transferability.' };
      const nearby = matchTarget(experiment, field, target);
      return { ...base, status: nearby.result === 'match' ? 'non-exact-retrieval-match' : 'conditions-differ',
        reason: nearby.result === 'match' ? `Retrieval similarity only, not scientific equivalence or uncertainty: ${nearby.detail}` : nearby.detail };
    });
    const incomplete = dimensions.some(d => ['target-unspecified', 'source-not-recorded', 'context-only'].includes(d.status));
    return { experimentId: id, dimensions,
      conclusion: incomplete ? 'insufficient-evidence' : dimensions.every(d => d.status === 'exact-recorded') ? 'recorded-conditions-match' : 'conditions-differ',
      confounders: dimensions.filter(d => d.status !== 'exact-recorded').map(d => `${d.field}: ${d.reason}`),
      limitations: [...experiment.limitations, 'Environment labels describe user-proposed scenarios, not measured NASA mission conditions.',
        'No partial-gravity result, causal effect, fire-risk probability, target safety or certification follows from condition matching.'] };
  });
  return TransferResponseSchema.parse({ apiVersion: '1', data: { analysisVersion: 'condition-transfer-v1', environment: request.environment,
    targetConditions: request.targetConditions, records, coverage: coverage(dataset), scope: 'condition-comparison-not-safety-prediction' } }).data;
}
export function scientificIntelligence(request: { question: string; targetConditions: TargetConditions; limit: number; environment: TransferRequest['environment'] }) {
  const ranking = rankEvidence(request);
  const questionMatches = rankEvidence({ ...request, targetConditions: {} }).items.length > 0;
  const summary = answerQuestion(questionMatches ? request : { ...request, targetConditions: {} });
  if (summary.abstained && summary.code !== 'unsupported-intent') ranking.items = [];
  const ids = ranking.items.map(i => i.experimentId);
  const requested = Object.keys(request.targetConditions).length > 0;
  return { intelligenceVersion: 'scientific-intelligence-v1' as const, producer: 'deterministic-source-templates-no-model' as const,
    ranking, summary, transfer: requested && ids.length ? analyzeTransfer({ experimentIds: ids, environment: request.environment, targetConditions: request.targetConditions }) : null,
    transferNote: !requested ? 'No target conditions supplied; transfer was not assessed.' : !ids.length ? 'No relevant admitted records; source-only library descriptions cannot fill this gap.' : 'Condition comparison is separate from question support and experimental uncertainty.',
    scope: 'research-support-not-operational-fire-safety-advice' as const };
}
