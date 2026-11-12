// Offline: node --import tsx scripts/verify-candidates.ts [download-directory]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { candidateReviews, catalog, assertNoQuarantinedRecords } from '@microfire/science';
const directory = process.argv[2];
assert.equal(catalog.experiments.length, 1);
assertNoQuarantinedRecords(catalog);
const sources = candidateReviews.flatMap(r => r.sources);
for (const source of sources) if (directory) {
  const bytes = readFileSync(path.join(directory, source.id + '.pdf'));
  assert.equal(bytes.length, source.bytes, source.id + ': byte count');
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', source.id + ': PDF format');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.id + ': source hash');
}
console.log(`Validated ${candidateReviews.flatMap(r => r.records).length} quarantined review items; ${directory ? `all ${sources.length} primary PDF hashes match` : 'source bytes not rechecked (supply a download directory)'}. No record promoted.`);
