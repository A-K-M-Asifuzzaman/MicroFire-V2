// Run with Node 24: node --import tsx scripts/local-review.ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { hostedEnvironment, validReviewToken } from '../apps/web/lib/review-policy';

if (hostedEnvironment(process.env) || !validReviewToken(process.env.MICROFIRE_REVIEW_ACCESS_TOKEN))
  throw Error('A dedicated review credential and a local environment are required. No server started.');
const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3240'], {
  cwd: path.resolve('apps/web'), env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'inherit'
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('The local review server could not start.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 0; });
