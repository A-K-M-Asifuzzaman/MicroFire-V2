// Builds the isolated candidate with ephemeral canaries; never logs their values.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { claimTrialStatements } from '@microfire/game-core';
const names = ['MICROFIRE_CAMPAIGN_ACCESS_TOKEN', 'MICROFIRE_CAMPAIGN_SIGNING_KEY', 'MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY', 'MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY', 'MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_URL'];
const canaries = names.map(() => randomBytes(32).toString('base64url'));
const env = { ...process.env, ...Object.fromEntries(names.map((name, i) => [name, canaries[i]!])), MICROFIRE_LOCAL_CAMPAIGN: '0', MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '0', NEXT_TELEMETRY_DISABLED: '1' };
const result = spawnSync(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'build', '--webpack'], { cwd: path.resolve('apps/web'), env, encoding: 'utf8', maxBuffer: 4000000 });
let output = (result.stdout ?? '') + (result.stderr ?? '');
for (const value of canaries) output = output.split(value).join('[REDACTED_CANARY]');
writeFileSync('/tmp/microfire-campaign-canary-build.log', output);
assert.equal(result.status, 0, 'Isolated canary build failed; sanitized log is in /tmp/microfire-campaign-canary-build.log');
let files = 0;
function scan(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(?:js|css|html|json)$/.test(file)) {
      files++; const text = readFileSync(file, 'utf8');
      assert(![...canaries, ...names].some(value => text.includes(value)), 'Campaign server credential material appeared in browser artifacts');
      assert(!claimTrialStatements.some(statement => text.includes(statement.hint)), 'Private campaign grading hint appeared in browser artifacts');
    }
  }
}
scan('apps/web/.next/static'); assert(files > 0);
console.log(`Scanned ${files} built browser artifacts: no campaign canaries, server credential names or private grading hints. Gameplay remains unmounted.`);
