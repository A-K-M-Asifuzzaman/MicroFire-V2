#!/usr/bin/env node
// Local-only Meshy tool (owner's Mac). Never imported by the website; the browser never sees the key.
// The key is read from the environment only, never printed, logged or written. Load it privately, e.g.:
//   node --env-file=.env.local tools/meshy/meshy.mjs balance      (.env.* is git-ignored)
// Commands:
//   balance                         read-only credit balance (free)
//   tasks                           read-only list of existing text-to-3D tasks for reuse (free)
//   run <jobId> --approved-cap <N>  ONE planned job from jobs.json; refuses if its estimate exceeds the owner-approved cap
// No retries, no purchases, bounded polling. Results go to tools/meshy/incoming/ (git-ignored) and ledger.jsonl.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://api.meshy.ai/openapi';
// Env first; otherwise the macOS Keychain entry shared with the Meshy MCP launcher (service "meshy-api-key").
const fromKeychain = () => {
  try { return execFileSync('/usr/bin/security', ['find-generic-password', '-a', process.env.USER ?? '', '-s', 'meshy-api-key', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return undefined; }
};
const key = process.env.MESHY_API_KEY || (process.platform === 'darwin' ? fromKeychain() : undefined);
if (!key || !/^msy_[A-Za-z0-9_-]{8,}$/.test(key)) {
  console.error('No Meshy key found. Store it privately in Terminal: security add-generic-password -a "$USER" -s meshy-api-key -U -w   (or use a git-ignored .env.local). Never paste it into chat.');
  process.exit(2);
}
async function call(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method, signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${key}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { message: text.slice(0, 200) }; }
  if (!res.ok) throw new Error(`Meshy ${method} ${route} → HTTP ${res.status}: ${json.message ?? 'error'}`); // no headers/key in errors
  return json;
}
const balance = async () => { const b = await call('GET', '/v1/balance'); return { balance: b.balance, monthly: b.monthly_credits, permanent: b.permanent_credits }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function poll(id, label) {
  for (let i = 0; i < 90; i++) { // ≤ 15 minutes
    const t = await call('GET', `/v2/text-to-3d/${id}`);
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error(`${label} ${t.status}: ${t.task_error?.message ?? 'no detail'}`);
    process.stdout.write(`\r${label}: ${t.status} ${t.progress ?? 0}%   `);
    await sleep(10_000);
  }
  throw new Error(`${label} still running after 15 minutes; stopped polling (task ${id} not cancelled).`);
}
async function download(url, file) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

const [cmd, jobId, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'balance') console.log(JSON.stringify(await balance()));
  else if (cmd === 'tasks') {
    const list = await call('GET', '/v2/text-to-3d?page_size=50&sort_by=-created_at');
    for (const t of list) console.log([t.id, t.status, new Date(t.created_at).toISOString().slice(0, 10), t.mode ?? '', (t.prompt ?? '').slice(0, 70)].join('  '));
    if (!list.length) console.log('No existing text-to-3D tasks.');
  } else if (cmd === 'run') {
    const capIndex = rest.indexOf('--approved-cap');
    const cap = capIndex >= 0 ? Number(rest[capIndex + 1]) : NaN;
    const jobs = JSON.parse(await readFile(path.join(here, 'jobs.json'), 'utf8'));
    const job = jobs.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`Unknown job ${jobId}`);
    if (!Number.isFinite(cap) || cap <= 0) throw new Error('Refusing: pass --approved-cap <credits> exactly as approved by the owner.');
    if (job.estimateCredits > cap) throw new Error(`Refusing: estimate ${job.estimateCredits} exceeds approved cap ${cap}.`);
    const before = await balance();
    if (before.balance < job.estimateCredits) throw new Error(`Refusing: balance ${before.balance} is below the estimate ${job.estimateCredits}. No purchase is attempted.`);
    console.log(`Balance before: ${before.balance}. Running ${job.id} (estimate ${job.estimateCredits}, cap ${cap}).`);
    const preview = await call('POST', '/v2/text-to-3d', { mode: 'preview', ...job.preview });
    const previewTask = await poll(preview.result, 'preview');
    let finalTask = previewTask;
    if (job.refine) { const refine = await call('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: preview.result, ...job.refine }); finalTask = await poll(refine.result, 'refine'); }
    const dir = path.join(here, 'incoming', job.id); await mkdir(dir, { recursive: true });
    if (finalTask.model_urls?.glb) await download(finalTask.model_urls.glb, path.join(dir, `${job.id}.glb`));
    if (finalTask.thumbnail_url) await download(finalTask.thumbnail_url, path.join(dir, `${job.id}-thumb.png`));
    const after = await balance();
    const entry = { at: new Date().toISOString(), job: job.id, previewTask: preview.result, finalTask: finalTask.id, estimate: job.estimateCredits, approvedCap: cap, balanceBefore: before.balance, balanceAfter: after.balance, spent: before.balance - after.balance, status: 'downloaded-pending-qa' };
    await appendFile(path.join(here, 'ledger.jsonl'), `${JSON.stringify(entry)}\n`);
    console.log(`\nDone. Spent ${entry.spent} credits; balance after: ${after.balance}. Files in tools/meshy/incoming/${job.id}/ (QA before any use).`);
  } else {
    console.log('Usage: balance | tasks | run <jobId> --approved-cap <credits>');
  }
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
}
