import 'server-only';
import { catalog } from '@microfire/science';
import { sources as sourceRefs } from '../../components/page-kit';
import type { Citation } from '@microfire/shared';
import type { SourceRef } from '../../components/evidence-ui';

/** Read-only B20 record data for the gameplay views. Values come from the admitted catalog; unknowns stay unknown. */
export type B20Row = { key: string; label: string; value: string | null; basis: string; note: string; citation: Citation | null };
export type B20Data = { id: string; testId: string; title: string; claim: { id: string; text: string; citations: Citation[] };
  rows: B20Row[]; rawFlow: string; limitations: string[]; sources: SourceRef[] };

const labels: Record<string, string> = { oxygenPct: 'Calibrated oxygen', flowDirection: 'Flow direction', flowCmS: 'Initial airflow',
  material: 'Material', thicknessMm: 'Film thickness', geometry: 'Sample geometry', pressureKpa: 'Pressure', gravity: 'Run acceleration' };

export function b20Data(): B20Data {
  const e = catalog.experiments.find((x) => x.id === 'bass2-b20')!;
  const claim = e.claims.find((c) => c.id === 'bass2-b20-burned-entire-sample')!;
  const rows = Object.entries(labels).map(([key, label]): B20Row => {
    const c = e.conditions[key as keyof typeof e.conditions];
    return c.status === 'known'
      ? { key, label, value: `${c.value}${'unit' in c ? ` ${c.unit}` : ''}`, basis: c.basis, note: c.note, citation: c.citation }
      : { key, label, value: null, basis: 'unknown', note: c.reason, citation: null };
  });
  return { id: e.id, testId: e.testId, title: e.title, claim: { id: claim.id, text: claim.text, citations: [...claim.citations] },
    rows, rawFlow: String(e.rawFlow), limitations: [...e.limitations], sources: sourceRefs };
}
