// Explicit public-source acquisition only; never runs in the web runtime or promotes records.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { candidateReviews } from '@microfire/science';
const directory = process.argv[2];
if (!directory) throw Error('Usage: node --import tsx scripts/fetch-candidate-sources.ts <output-directory>');
await mkdir(directory, { recursive: true });
for (const source of candidateReviews.flatMap(r => r.sources)) {
  const file = path.join(directory, source.id + '.pdf');
  const matches = (bytes: Buffer) => bytes.length === source.bytes && createHash('sha256').update(bytes).digest('hex') === source.sha256;
  let existing: Buffer | null = null;
  try { existing = await readFile(file); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (existing) { if (!matches(existing)) throw Error(source.id + ': existing file differs; preserve and review it.'); continue; }
  const response = await fetch(source.url, { redirect: 'error', signal: AbortSignal.timeout(60000) });
  if (!response.ok || !response.body) throw Error(source.id + ': primary download failed');
  const chunks: Buffer[] = []; let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 60000000) { await reader.cancel(); throw Error(source.id + ': source exceeds byte cap'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  if (!matches(bytes) || bytes.subarray(0, 5).toString() !== '%PDF-') throw Error(source.id + ': primary PDF bytes changed; independent review required.');
  await writeFile(file, bytes, { flag: 'wx' });
  console.log(source.id + ': verified primary PDF retained');
}
