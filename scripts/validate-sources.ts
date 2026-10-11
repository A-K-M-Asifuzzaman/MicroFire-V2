import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { catalog, catalogCitations, isCatalogCitation, quarantineLedger } from '@microfire/science';
import manifest from '../data/integrity.json';
for (const [path, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actual !== expected) throw new Error(`Source fixture integrity mismatch: ${path}`);
}
// The catalog module already refuses to load quarantined rows; re-check here so a data-only change fails CI too.
if (quarantineLedger.upstream.recordCount - 1 !== quarantineLedger.records.length) throw new Error('Quarantine ledger does not cover every unvalidated legacy row');
if (!catalogCitations().every((c) => isCatalogCitation(c) && catalog.sources.some((s) => s.id === c.sourceId))) throw new Error('Unresolved catalog citation');
console.log(`Validated ${catalog.sources.length} source, ${catalog.experiments.length} experiment; ${quarantineLedger.records.length} legacy rows quarantined; local fixture SHA-256 matches. Remote links not rechecked.`);
