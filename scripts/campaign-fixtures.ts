// Generates FIXTURE snapshots for the mission-scene frontends by driving Codex Sol's authoritative CampaignService
// (private engine, local authority with fresh random secrets) through authored action sequences, including deliberate
// wrong answers. Every recorded state and feedback string is the engine's own output; nothing is hand-written.
// Checkpoints are replaced so fixtures can never be resumed. Fixtures are development evidence, not gameplay proof.
// Run: node --conditions=react-server --import tsx scripts/campaign-fixtures.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { campaignIdentity, partDefinitions, CampaignSnapshotSchema, type CampaignAction, type CorePreviewAction, type GameAction, type PartId, type TrainingAction } from '@microfire/shared';
import { catalog } from '@microfire/science';
import { claimTrialStatements } from '@microfire/game-core';
import { CampaignService } from '../apps/web/lib/campaign-service';
import { PreviewAuthority, previewConfig } from '../apps/web/lib/game-preview-security';

const out = 'docs/campaign/fixtures';
const at = '2026-11-12T10:00:00.000Z';
const config = previewConfig({ MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: 'http://127.0.0.1:3290', MICROFIRE_PREVIEW_ACCESS_TOKEN: randomBytes(32).toString('base64url'),
  MICROFIRE_PREVIEW_SIGNING_KEY: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_KEY_ID: 'fixtures', MICROFIRE_PREVIEW_REALM_ID: randomUUID() })!;
const authority = new PreviewAuthority(config, () => Date.parse(at));
const anon = new Request(config.origin, { method: 'POST', headers: { host: config.host, origin: config.origin } });
const cookie = authority.authorize(anon, config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
const request = new Request(anon, { headers: { ...Object.fromEntries(anon.headers), cookie } });
const service = new CampaignService(authority, () => Date.parse(at));

const claim = catalog.experiments[0]!.claims[0]!;
const core = (action: GameAction): CampaignAction => ({ type: 'CORE', action });
const training = (action: TrainingAction): CampaignAction => ({ type: 'TRAINING', action });
const game = (action: CorePreviewAction): CampaignAction => training({ type: 'GAME', action });
const install = (partId: PartId): CampaignAction => game({ type: 'INSTALL_PART', partId, anchorId: partDefinitions.find((p) => p.id === partId)!.anchorId, orientation: 'correct' });
const remove = (partId: PartId): CampaignAction => game({ type: 'REMOVE_PART', partId });

type Step = { id: string; title: string; mission: string; action: CampaignAction | null; ok: boolean; feedback: unknown; refusal: unknown; snapshot: unknown };
const steps: Step[] = [];
let snapshot = service.start(request, randomUUID());
const clean = (s: typeof snapshot) => CampaignSnapshotSchema.parse({ ...s, checkpoint: 'fixture-not-a-signed-checkpoint' });
steps.push({ id: 'start', title: 'New campaign', mission: 'station-arrival', action: null, ok: true, feedback: null, refusal: null, snapshot: clean(snapshot) });
async function run(id: string, title: string, mission: string, action: CampaignAction, record = true) {
  const intent = { runtimeId: authority.runtimeId, sessionId: snapshot.sessionId, expectedRevision: snapshot.revision, action };
  const r = await service.command(request, { ...intent, commandId: await campaignIdentity(intent) });
  if (r.ok) snapshot = r.snapshot;
  if (record) steps.push({ id, title, mission, action, ok: r.ok, feedback: r.ok ? r.feedback ?? null : null, refusal: r.ok ? null : { code: r.code, message: r.message }, snapshot: clean(r.ok ? r.snapshot : snapshot) });
  return r;
}

// Mission 1: Station Arrival
await run('m1-inspect', 'Open the source terminal', 'station-arrival', game({ type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }));
await run('m1-review-wrong', 'Source review: observation filed as fiction (wrong)', 'station-arrival', { type: 'REVIEW_SOURCE', claimId: claim.id, citations: claim.citations, observationOrigin: 'fiction', incidentOrigin: 'fiction' });
await run('m1-review', 'Source review: research observation, fictional incident', 'station-arrival', { type: 'REVIEW_SOURCE', claimId: claim.id, citations: claim.citations, observationOrigin: 'research', incidentOrigin: 'fiction' });
await run('m1-collect', 'Collect the documented observation', 'station-arrival', game({ type: 'COLLECT_EVIDENCE', experimentId: 'bass2-b20', claimId: claim.id }));
await run('m1-complete', 'Complete Station Arrival', 'station-arrival', game({ type: 'COMPLETE_MISSION', missionId: 'station-arrival' }));
// Mission 2 is played through the frozen M2 interface; here it only advances the campaign so later missions unlock.
const m2: CampaignAction[] = [game({ type: 'START_MISSION', missionId: 'bass-assembly' }), ...partDefinitions.map((p) => install(p.id)), training({ type: 'RUN_DIAGNOSTIC' }),
  training({ type: 'SUBMIT_DIAGNOSIS', partId: 'fan', faultCode: 'REVERSED' }), remove('fan'), remove('exit-plate'), install('exit-plate'), install('fan'),
  game({ type: 'QUALIFY_INSTRUMENT' }), game({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }), game({ type: 'COMPLETE_MISSION', missionId: 'bass-assembly' })];
for (const a of m2) await run('m2', 'M2 (frozen interface)', 'bass-assembly', a, false);
steps.push({ id: 'm2-done', title: 'BASS-II training complete (campaign state)', mission: 'bass-assembly', action: null, ok: true, feedback: null, refusal: null, snapshot: clean(snapshot) });
// Mission 3: Flame Detective
await run('m3-start', 'Start Flame Detective', 'flame-detective', core({ type: 'START_MISSION', missionId: 'flame-detective' }));
await run('m3-select-hypothetical', 'Select B20 at 21% oxygen (not recorded)', 'flame-detective', { type: 'SELECT_EXPERIMENT', experimentId: 'bass2-b20', targetConditions: { oxygenPct: 21, material: 'PMMA' } });
await run('m3-select', 'Select B20 at its recorded conditions', 'flame-detective', { type: 'SELECT_EXPERIMENT', experimentId: 'bass2-b20', targetConditions: { oxygenPct: 17.4, material: 'PMMA' } });
await run('m3-predict', 'Lock a prediction', 'flame-detective', core({ type: 'PREDICT_OUTCOME', experimentId: 'bass2-b20', prediction: 'The sample may not fully burn.' }));
await run('m3-observe', 'Reveal the documented result', 'flame-detective', core({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }));
await run('m3-explain-wrong', 'Explain: airflow caused the outcome (wrong)', 'flame-detective', { type: 'EXPLAIN_OBSERVATION', claimId: claim.id, citations: claim.citations, relation: 'flow-caused-outcome', limitations: [], learnerExplanation: 'The airflow made it burn completely.' });
await run('m3-explain', 'Explain with the source and its limits', 'flame-detective', { type: 'EXPLAIN_OBSERVATION', claimId: claim.id, citations: claim.citations, relation: 'source-observation', limitations: ['single-run-no-causality', 'pressure-unknown', 'not-lunar-evidence'], learnerExplanation: 'The source reports the entire sample burned. One run cannot identify its cause.' });
await run('m3-complete', 'Complete Flame Detective', 'flame-detective', core({ type: 'COMPLETE_MISSION', missionId: 'flame-detective' }));
// Mission 4: Claim Trial
await run('m4-start', 'Start Claim Trial', 'claim-trial', core({ type: 'START_MISSION', missionId: 'claim-trial' }));
for (const [n, s] of claimTrialStatements.entries()) {
  const thickness = s.id === 'trial-b20-thickness', lunar = s.id === 'trial-ai-lunar-claim', causal = s.id === 'trial-flow-caused-burnout';
  const c = catalog.experiments[0]!.conditions.thicknessMm;
  const right: CampaignAction = { type: 'APPRAISE_CLAIM', statementId: s.id, kind: s.expected.kind, evidenceLevel: thickness ? 'analogous' : s.expected.evidenceLevel,
    citations: thickness && c.status === 'known' ? [c.citation] : claim.citations, support: lunar || causal ? 'insufficient' : 'supports', confounders: lunar ? ['gravity', 'pressure'] : causal ? ['flow-history'] : [] };
  if (n === 0 || lunar) await run(`m4-${s.id}-wrong`, `Appraise "${s.id}" too generously (wrong)`, 'claim-trial', { ...right, support: 'supports', confounders: [] });
  await run(`m4-${s.id}`, `Appraise "${s.id}"`, 'claim-trial', right);
}
await run('m4-complete', 'Complete Claim Trial', 'claim-trial', core({ type: 'COMPLETE_MISSION', missionId: 'claim-trial' }));
// Mission 5: Lunar Habitat (fictional)
const scenario = { gravity: 'lunar' as const, oxygenPct: 26, pressureKpa: 55, ventilation: 'Fictional forced ventilation', material: 'PMMA panel' };
await run('m5-start', 'Start Lunar Habitat', 'lunar-habitat', core({ type: 'START_MISSION', missionId: 'lunar-habitat' }));
await run('m5-assess-safe', 'Declare the habitat safe (wrong)', 'lunar-habitat', { type: 'ASSESS_HABITAT', scenario, verdict: 'safe', citations: claim.citations, gaps: [], nextMeasurements: ['oxygen'], learnerExplanation: 'B20 burned, so we know enough.' });
await run('m5-assess', 'Assess: insufficient evidence, name the gaps', 'lunar-habitat', { type: 'ASSESS_HABITAT', scenario, verdict: 'insufficient-evidence', citations: claim.citations, gaps: ['gravity', 'oxygen', 'pressure', 'ventilation', 'material'], nextMeasurements: ['gravity', 'pressure'], learnerExplanation: 'Investigate the missing conditions before drawing a conclusion.' });
await run('m5-decide', 'Record the decision', 'lunar-habitat', core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }));
await run('m5-propose', 'Propose the next test', 'lunar-habitat', core({ type: 'PROPOSE_NEXT_TEST', question: 'Test lunar gravity and scenario pressure.', limitations: ['B20 is not a lunar test.'] }));
await run('m5-complete', 'Complete Lunar Habitat', 'lunar-habitat', core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' }));

mkdirSync(out, { recursive: true });
writeFileSync(`${out}/campaign-steps.json`, JSON.stringify({ note: 'Generated by scripts/campaign-fixtures.ts from Codex Sol\'s CampaignService (evidence-campaign-v1). Fixture states for frontend development only: not playable, not resumable, not proof of gameplay.', rulesVersion: 'evidence-campaign-v1', steps }, null, 1) + '\n');
console.log(`${steps.length} fixture steps; refused: ${steps.filter((s) => !s.ok).map((s) => s.id).join(', ') || 'none'}; wrong-but-accepted feedback: ${steps.filter((s) => s.ok && (s.feedback as { correct?: boolean } | null)?.correct === false).map((s) => s.id).join(', ')}`);
