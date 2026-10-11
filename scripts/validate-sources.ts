import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { catalog } from '@microfire/science';
import manifest from '../data/integrity.json';
for (const [path, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actual !== expected) throw new Error(`Source fixture integrity mismatch: ${path}`);
}
console.log(`Validated ${catalog.sources.length} source, ${catalog.experiments.length} experiment; local fixture SHA-256 matches. Remote links not rechecked.`);
