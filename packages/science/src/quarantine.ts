import { z } from 'zod';
import type { Catalog } from '@microfire/shared';
import ledgerJson from '../../../data/quarantine/legacy-ledger.json';

const LedgerSchema = z.strictObject({
  schemaVersion: z.literal(1), purpose: z.string(),
  upstream: z.strictObject({ repository: z.url(), commit: z.string().regex(/^[a-f0-9]{40}$/), path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), recordCount: z.number().int() }),
  records: z.array(z.strictObject({
    upstreamRecordId: z.string().min(1), candidateId: z.string().min(1), testId: z.string().min(1),
    legacyLocator: z.strictObject({ legacySourceId: z.string(), table: z.string(), pdfPage: z.number().int().positive(), verified: z.literal(false) }),
    status: z.enum(['quarantined', 'source-cells-checked-pending-review']), reviewFile: z.string().nullable()
  }))
}).refine((l) => new Set(l.records.map((r) => r.candidateId)).size === l.records.length, 'Duplicate quarantine IDs');

export const quarantineLedger = LedgerSchema.parse(ledgerJson);
const quarantinedIds = new Set(quarantineLedger.records.flatMap((r) => [r.candidateId, r.upstreamRecordId.toLowerCase()]));
const quarantinedTests = new Set(quarantineLedger.records.map((r) => r.testId.toLowerCase()));

export const isQuarantinedId = (id: string) => quarantinedIds.has(id.toLowerCase());
export const isQuarantinedTestId = (testId: string) => quarantinedTests.has(testId.toLowerCase());

/** Runtime containment: a catalog that contains any quarantined record must never load. */
export function assertNoQuarantinedRecords(dataset: Catalog): Catalog {
  for (const e of dataset.experiments)
    if (isQuarantinedId(e.id) || isQuarantinedId(e.provenance.upstreamRecordId))
      throw new Error(`Quarantined legacy record ${e.provenance.upstreamRecordId} cannot enter the validated catalog`);
  return dataset;
}
