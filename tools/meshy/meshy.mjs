#!/usr/bin/env node
// Local-only Meshy tool (owner's Mac). Never imported by the website; the browser never sees the key.
// The key is read from the environment only, never printed, logged or written. Load it privately, e.g.:
//   node --env-file=.env.local tools/meshy/meshy.mjs balance      (.env.* is git-ignored)
// Commands:
//   balance                         read-only credit balance (free)
//   tasks                           read-only list of existing text-to-3D tasks for reuse (free)
//   run <jobId> --approved-cap <N> --floor <B>      ONE planned job from jobs.json; refuses if its estimate exceeds the cap
//   rig <jobId> --approved-cap <N> --floor <B>      auto-rig a downloaded humanoid job (5 credits)
//   animate <jobId> <id,id,…> --approved-cap <N> --floor <B>   preset actions on its rig (3 credits each)
//   library [search]                                read-only animation library lookup (free)
// --floor is the owner's spending ceiling as a balance: a paid command refuses if its estimate would take the live
// balance below it. No retries, no purchases, bounded polling. Results go to tools/meshy/incoming/ (git-ignored) and ledger.jsonl.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
// Repo-root .env (git-ignored, chmod 600) if present; real env vars win.
try { process.loadEnvFile(path.join(here, '../../.env')); } catch { /* no .env */ }
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
async function poll(id, label, route = '/v2/text-to-3d') {
  for (let i = 0; i < 90; i++) { // ≤ 15 minutes
    const t = await call('GET', `${route}/${id}`);
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
const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? Number(rest[i + 1]) : NaN; };
/** Owner cap per command + balance floor for the whole authorization; checked against the LIVE balance first. */
async function guard(estimate) {
  const cap = flag('--approved-cap'), floor = flag('--floor');
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('Refusing: pass --approved-cap <credits> exactly as approved by the owner.');
  if (!Number.isFinite(floor) || floor < 0) throw new Error('Refusing: pass --floor <balance> (live balance minus the owner-authorized allowance).');
  if (estimate > cap) throw new Error(`Refusing: estimate ${estimate} exceeds approved cap ${cap}.`);
  const before = await balance();
  if (before.balance - estimate < floor) throw new Error(`Refusing: balance ${before.balance} − estimate ${estimate} would go below the authorized floor ${floor}. Nothing was spent.`);
  return { cap, floor, before };
}
const ledgerFor = async (id) => (await readFile(path.join(here, 'ledger.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).filter((e) => e.job === id).at(-1);
async function record(entry, before) {
  const after = await balance();
  const full = { at: new Date().toISOString(), ...entry, balanceBefore: before.balance, balanceAfter: after.balance, spent: before.balance - after.balance, status: 'downloaded-pending-qa' };
  await appendFile(path.join(here, 'ledger.jsonl'), `${JSON.stringify(full)}\n`);
  console.log(`\nDone. Spent ${full.spent} credits; balance after: ${after.balance}.`);
}
try {
  if (cmd === 'balance') console.log(JSON.stringify(await balance()));
  else if (cmd === 'tasks') {
    const list = await call('GET', '/v2/text-to-3d?page_size=50&sort_by=-created_at');
    for (const t of list) console.log([t.id, t.status, new Date(t.created_at).toISOString().slice(0, 10), t.mode ?? '', (t.prompt ?? '').slice(0, 70)].join('  '));
    if (!list.length) console.log('No existing text-to-3D tasks.');
  } else if (cmd === 'library') {
    const q = jobId ? `&search=${encodeURIComponent(jobId)}` : '';
    const list = await call('GET', `/v1/animations/library?page_size=100${q}`);
    for (const a of (Array.isArray(list) ? list : list.result ?? list.data ?? [])) console.log([a.action_id, a.name, a.category, a.sub_category].join('  '));
  } else if (cmd === 'rig') {
    const src = await ledgerFor(jobId);
    if (!src) throw new Error(`No downloaded job ${jobId} in the ledger.`);
    const { cap, before } = await guard(5);
    console.log(`Balance before: ${before.balance}. Rigging ${jobId} (estimate 5, cap ${cap}).`);
    const task = await call('POST', '/v1/rigging', { input_task_id: src.finalTask, height_meters: 1.75 });
    const done = await poll(task.result, 'rigging', '/v1/rigging');
    const dir = path.join(here, 'incoming', jobId); await mkdir(dir, { recursive: true });
    const r = done.result ?? {};
    if (r.rigged_character_glb_url) await download(r.rigged_character_glb_url, path.join(dir, `${jobId}-rigged.glb`));
    for (const k of ['walking', 'running']) { const u = r.basic_animations?.[`${k}_glb_url`]; if (u) await download(u, path.join(dir, `${jobId}-${k}.glb`)); }
    await record({ job: `${jobId}:rig`, rigTask: task.result, sourceTask: src.finalTask, estimate: 5, approvedCap: cap }, before);
  } else if (cmd === 'animate') {
    const ids = String(rest[0] ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 0);
    if (!ids.length || ids.length > 10) throw new Error('Pass 1–10 comma-separated action ids (see `library`).');
    const rig = await ledgerFor(`${jobId}:rig`);
    if (!rig) throw new Error(`No rig for ${jobId} in the ledger.`);
    const { cap, before } = await guard(3 * ids.length);
    console.log(`Balance before: ${before.balance}. Animating ${jobId} with [${ids}] (estimate ${3 * ids.length}, cap ${cap}).`);
    const task = await call('POST', '/v1/animations', { rig_task_id: rig.rigTask, action_ids: ids });
    const done = await poll(task.result, 'animation', '/v1/animations');
    const dir = path.join(here, 'incoming', jobId); await mkdir(dir, { recursive: true });
    if (done.result?.animation_glb_url) await download(done.result.animation_glb_url, path.join(dir, `${jobId}-anim-${ids.join('-')}.glb`));
    await record({ job: `${jobId}:animate:${ids.join(',')}`, animationTask: task.result, rigTask: rig.rigTask, estimate: 3 * ids.length, approvedCap: cap }, before);
  } else if (cmd === 'run') {
    const jobs = JSON.parse(await readFile(path.join(here, 'jobs.json'), 'utf8'));
    const job = jobs.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`Unknown job ${jobId}`);
    const { cap, before } = await guard(job.estimateCredits);
    console.log(`Balance before: ${before.balance}. Running ${job.id} (estimate ${job.estimateCredits}, cap ${cap}).`);
    let preview, finalTask;
    if (job.image) { // image-to-3D from a local concept image, sent as a data URI
      const png = await readFile(path.join(here, job.image.file));
      const { file: _file, ...params } = job.image;
      preview = await call('POST', '/v1/image-to-3d', { image_url: `data:image/png;base64,${png.toString('base64')}`, ...params });
      finalTask = await poll(preview.result, 'image-to-3d', '/v1/image-to-3d');
    } else {
      preview = await call('POST', '/v2/text-to-3d', { mode: 'preview', ...job.preview });
      finalTask = await poll(preview.result, 'preview');
      if (job.refine) { const refine = await call('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: preview.result, ...job.refine }); finalTask = await poll(refine.result, 'refine'); }
    }
    const dir = path.join(here, 'incoming', job.id); await mkdir(dir, { recursive: true });
    if (finalTask.model_urls?.glb) await download(finalTask.model_urls.glb, path.join(dir, `${job.id}.glb`));
    if (finalTask.thumbnail_url) await download(finalTask.thumbnail_url, path.join(dir, `${job.id}-thumb.png`));
    const after = await balance();
    const entry = { at: new Date().toISOString(), job: job.id, previewTask: preview.result, finalTask: finalTask.id, estimate: job.estimateCredits, approvedCap: cap, balanceBefore: before.balance, balanceAfter: after.balance, spent: before.balance - after.balance, status: 'downloaded-pending-qa' };
    await appendFile(path.join(here, 'ledger.jsonl'), `${JSON.stringify(entry)}\n`);
    console.log(`\nDone. Spent ${entry.spent} credits; balance after: ${after.balance}. Files in tools/meshy/incoming/${job.id}/ (QA before any use).`);
  } else {
    console.log('Usage: balance | tasks | library [search] | run <jobId> | rig <jobId> | animate <jobId> <ids>  (paid commands need --approved-cap N --floor B)');
  }
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
}
