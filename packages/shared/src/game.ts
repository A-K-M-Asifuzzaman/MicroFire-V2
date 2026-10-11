import { z } from 'zod';
import { CitationSchema, EvidenceLevelSchema, IdSchema, StatementTypeSchema, TextSchema } from './science';

export const MissionIdSchema = z.enum(['station-arrival', 'bass-assembly', 'flame-detective', 'claim-trial', 'lunar-habitat']);
export const PartIdSchema = z.enum(['flow-duct', 'fan', 'flow-straightener', 'nitrogen-nozzle', 'sample-holder', 'igniter', 'still-camera', 'video-camera', 'radiometer', 'exit-plate']);
export const SessionModeSchema = z.enum(['normal', 'demo']);
export const PassportEntrySchema = z.strictObject({
  id: IdSchema, missionId: MissionIdSchema, experimentIds: z.array(IdSchema).min(1).max(20),
  claimIds: z.array(IdSchema).min(1).max(20), observationType: StatementTypeSchema,
  evidenceLevel: EvidenceLevelSchema, conclusion: TextSchema,
  citations: z.array(CitationSchema).min(1).max(20), limitations: z.array(TextSchema).min(1).max(20),
  corrections: z.array(z.strictObject({ previous: TextSchema, revised: TextSchema, reason: TextSchema, at: z.iso.datetime() })).max(100),
  setupRevision: z.number().int().nonnegative().nullable(), status: z.enum(['current', 'invalidated']),
  scenario: z.enum(['research', 'fictional-scenario']), createdAt: z.iso.datetime()
}).superRefine((entry, ctx) => {
  if (entry.missionId === 'lunar-habitat' && (entry.scenario !== 'fictional-scenario' || entry.evidenceLevel === 'direct'))
    ctx.addIssue({ code: 'custom', message: 'V1 lunar mission is fictional and cannot award direct lunar evidence' });
});
export const PassportSchema = z.strictObject({
  schemaVersion: z.literal(1), purpose: z.literal('educational-research-record'),
  entries: z.array(PassportEntrySchema).max(100)
}).refine((p) => new Set(p.entries.map((e) => e.id)).size === p.entries.length, 'Duplicate passport entries');
export const GameStateSchema = z.strictObject({
  schemaVersion: z.literal(1), datasetVersion: IdSchema, mode: SessionModeSchema,
  guidance: z.enum(['guided', 'investigator']), activeMission: MissionIdSchema.nullable(),
  completedMissions: z.array(MissionIdSchema).max(5), inspectedExperimentIds: z.array(IdSchema).max(100),
  setup: z.strictObject({ revision: z.number().int().nonnegative(), installedParts: z.array(PartIdSchema).max(10), qualifiedRevision: z.number().int().nonnegative().nullable() }),
  passport: PassportSchema, updatedAt: z.iso.datetime()
}).superRefine((s, ctx) => {
  for (const values of [s.completedMissions, s.inspectedExperimentIds, s.setup.installedParts])
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message: 'Duplicate state items' });
  if (s.setup.qualifiedRevision !== null && s.setup.qualifiedRevision !== s.setup.revision)
    ctx.addIssue({ code: 'custom', message: 'Stale instrument qualification' });
  const order = MissionIdSchema.options;
  if (s.completedMissions.some((id, i) => id !== order[i])) ctx.addIssue({ code: 'custom', message: 'Mission completion must be a contiguous prefix' });
  if (s.completedMissions.some((id) => !s.passport.entries.some((e) => e.missionId === id && e.status === 'current')))
    ctx.addIssue({ code: 'custom', message: 'Completed missions require current passport evidence' });
  if (s.passport.entries.some((e) => e.status === 'current' && e.setupRevision !== null && e.setupRevision !== s.setup.revision))
    ctx.addIssue({ code: 'custom', message: 'Stale passport setup revision' });
});
export const GameActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('START_MISSION'), missionId: MissionIdSchema }),
  z.strictObject({ type: z.literal('INSPECT_EVIDENCE'), experimentId: IdSchema }),
  z.strictObject({ type: z.literal('INSTALL_PART'), partId: PartIdSchema, anchorId: IdSchema, orientation: z.enum(['correct', 'reversed']) }),
  z.strictObject({ type: z.literal('REMOVE_PART'), partId: PartIdSchema }),
  z.strictObject({ type: z.literal('QUALIFY_INSTRUMENT') }),
  z.strictObject({ type: z.literal('PREDICT_OUTCOME'), experimentId: IdSchema, prediction: TextSchema }),
  z.strictObject({ type: z.literal('OBSERVE_DOCUMENTED_RESULT'), experimentId: IdSchema }),
  z.strictObject({ type: z.literal('CLASSIFY_CLAIM'), claimId: IdSchema, kind: StatementTypeSchema, evidenceLevel: EvidenceLevelSchema }),
  z.strictObject({ type: z.literal('PROPOSE_NEXT_TEST'), question: TextSchema, limitations: z.array(TextSchema).min(1) }),
  z.strictObject({ type: z.literal('COMPLETE_MISSION'), missionId: MissionIdSchema })
]);
export type GameState = z.infer<typeof GameStateSchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
export type Passport = z.infer<typeof PassportSchema>;
export type MissionId = z.infer<typeof MissionIdSchema>;
export type SessionMode = z.infer<typeof SessionModeSchema>;
export const missionDefinitions = [
  { id: 'station-arrival', mechanic: 'inspect-source', prerequisite: null, output: 'first-cited-question' },
  { id: 'bass-assembly', mechanic: 'assemble-fault-repair', prerequisite: 'station-arrival', output: 'qualified-instrument-and-corrections' },
  { id: 'flame-detective', mechanic: 'predict-observe-reconcile', prerequisite: 'bass-assembly', output: 'prediction-and-documented-observation' },
  { id: 'claim-trial', mechanic: 'classify-and-correct', prerequisite: 'flame-detective', output: 'source-backed-argument' },
  { id: 'lunar-habitat', mechanic: 'identify-gaps-propose-test', prerequisite: 'claim-trial', output: 'provisional-case-report' }
] as const satisfies readonly { id: MissionId; mechanic: string; prerequisite: MissionId | null; output: string }[];
