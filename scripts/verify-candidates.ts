// Offline: node --import tsx scripts/verify-candidates.ts [download-directory]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { candidateReview, catalog, assertNoQuarantinedRecords } from '@microfire/science';
const directory = process.argv[2];
assert.equal(catalog.experiments.length, 1);
assertNoQuarantinedRecords(catalog);
for (const source of candidateReview.sources) if (directory) {
  const bytes = readFileSync(path.join(directory, source.id + '.pdf'));
  assert.equal(bytes.length, source.bytes, source.id + ': byte count');
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', source.id + ': PDF format');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.id + ': source hash');
}
console.log(`Validated ${candidateReview.records.length} quarantined review items; ${directory ? 'all four primary PDF hashes match' : 'source bytes not rechecked (supply a download directory)'}. No record promoted.`);
