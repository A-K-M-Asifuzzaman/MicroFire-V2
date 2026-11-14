// Judge Proof Mode data: the B20 record, a fictional lunar scenario, the engine's condition comparison and its refusal.
import { analyzeTransfer, answerQuestion, catalog } from '@microfire/science';
import type { TargetConditions } from '@microfire/shared';
import { conditionLabels } from '../components/page-kit';

/** Fictional lunar habitat: the same starting values as Mission 05 and the Workstation's Moon example. */
export const SCENARIO: TargetConditions = { gravity: 'lunar', material: 'PMMA', oxygenPct: 26, pressureKpa: 55 };
export const QUESTION = 'Is this lunar habitat fire-safe?';
export const STATUS: Record<string, [string, string]> = {
  'exact-recorded': ['same as recorded', 'match'], 'conditions-differ': ['differs from B20', 'differ'], 'source-not-recorded': ['unknown in B20', 'unknown'],
  'context-only': ['context only', 'unknown'], 'non-exact-retrieval-match': ['similar, not equal', 'differ'], 'target-unspecified': ['not in your scenario', 'none'],
};
export const fmt = (v: string | number | null, unit: string | null) => v === null ? '—' : `${v}${unit ? ` ${unit}` : ''}`;

export function proofData() {
  const e = catalog.experiments[0]!, source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const claim = e.claims.find((c) => c.kind === 'observed' && c.origin === 'research')!;
  const loc = claim.citations[0]!.locator as { page?: number; printedPage?: string; section: string };
  const transfer = analyzeTransfer({ environment: 'moon', experimentIds: [e.id], targetConditions: SCENARIO }).records[0]!;
  const refusal = answerQuestion({ question: QUESTION, targetConditions: SCENARIO });
  const asked = transfer.dimensions.filter((d) => d.status !== 'target-unspecified');
  const needs = asked.filter((d) => d.status !== 'exact-recorded').map((d) => ({ field: d.field, label: conditionLabels[d.field] ?? d.field, target: fmt(d.target, d.field === 'oxygenPct' ? 'vol%' : d.field === 'pressureKpa' ? 'kPa' : null), status: d.status }));
  return { e, source, claim, loc, transfer, refusal, asked, needs };
}

