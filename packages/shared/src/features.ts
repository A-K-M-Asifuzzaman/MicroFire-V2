import { z } from 'zod';
import { IdSchema, TextSchema } from './science';

export const FeatureStateSchema = z.enum(['available', 'preview', 'coming_soon', 'locked', 'blocked']);
export const FeatureSchema = z.strictObject({
  id: IdSchema, title: TextSchema, route: z.string().regex(/^\/(?:[a-z0-9/[\]-]*)$/),
  state: FeatureStateSchema, reason: TextSchema, implemented: z.boolean(),
  prerequisites: z.array(IdSchema), verification: z.strictObject({
    unitTest: TextSchema, browserTest: TextSchema, screenshot: TextSchema, checkedAt: z.iso.datetime()
  }).nullable()
}).superRefine((f, ctx) => {
  if (f.state === 'preview' && !f.implemented)
    ctx.addIssue({ code: 'custom', message: 'Preview requires implemented partial behavior' });
  if (['available', 'locked'].includes(f.state) && (!f.implemented || !f.verification))
    ctx.addIssue({ code: 'custom', message: 'Available/Locked require implemented, browser-verified behavior' });
  if (f.state === 'locked' && !f.prerequisites.length)
    ctx.addIssue({ code: 'custom', message: 'Locked requires progress prerequisites' });
  if (f.state === 'coming_soon' && f.implemented)
    ctx.addIssue({ code: 'custom', message: 'Implemented features should declare Preview or a verified state' });
});
export type Feature = z.infer<typeof FeatureSchema>;
export const featureLabels: Record<z.infer<typeof FeatureStateSchema>, string> = {
  available: 'Available', preview: 'Preview', coming_soon: 'Coming Soon', locked: 'Locked', blocked: 'Blocked'
};
const definitions = [
  ['home', '/', 'Living Science Observatory', 'preview', 'Foundation preview; Gravity Lens and premium visual design are pending.'],
  ['dashboard', '/dashboard', 'Evidence Workstation', 'coming_soon', 'Search and ranking APIs exist over one validated record; the workstation UI is pending.'],
  ['atlas', '/atlas', 'Experiment Atlas', 'preview', 'One audited BASS-II record; search API exists, search UI and broader coverage are pending.'],
  ['experiment', '/experiments/[id]', 'Experiment Dossier', 'preview', 'One cited record with field-level provenance; export API exists, export UI is pending.'],
  ['compare', '/compare', 'Controlled Comparison', 'coming_soon', 'Requires multiple independently verified records.'],
  ['lab', '/lab', 'Flame Instrument', 'preview', 'Interactive guided lab with an illustrative gravity lens, NASA B20 condition comparison and downloadable practice notes; no numerical combustion or ML prediction.'],
  ['gaps', '/gaps', 'Research Frontier', 'coming_soon', 'Gap-classification API exists over one validated record; the frontier UI is pending.'],
  ['ask', '/ask', 'Ask PIX', 'coming_soon', 'Deterministic, catalog-grounded answers with citation-lineage checks and abstention exist as an API (no AI model); the PIX UI is pending.'],
  ['missions', '/missions', 'Mission Map', 'preview', 'Mission descriptions only; none is playable yet.'],
  ['station-arrival', '/missions/station-arrival', 'Station Arrival', 'coming_soon', 'Source-inspection gameplay is pending.'],
  ['bass-assembly', '/missions/bass-assembly', 'BASS-II Assembly', 'coming_soon', 'Assembly, fault detection and repair gameplay are pending.'],
  ['flame-detective', '/missions/flame-detective', 'Flame Detective', 'coming_soon', 'Prediction and recorded-result investigation are pending.'],
  ['claim-trial', '/missions/claim-trial', 'Claim Trial', 'coming_soon', 'Evidence classification and correction gameplay are pending.'],
  ['lunar-habitat', '/missions/lunar-habitat', 'Lunar Habitat', 'coming_soon', 'Fictional research decision gameplay is pending.'],
  ['passport', '/passport', 'Evidence Passport', 'coming_soon', 'Contracts and local persistence exist; earned entries and export UI are pending.'],
  ['sources', '/sources', 'Sources & Rights', 'preview', 'One source audit; broader corpus and media rights review are pending.'],
  ['methodology', '/methodology', 'Methodology', 'preview', 'Fixture methodology; a small author-labelled ranking/Ask regression set exists, independent evaluation is pending.'],
  ['roadmap', '/roadmap', 'Product Progress', 'preview', 'Phase Zero status inventory; no public release approved.'],
  ['challenge', '/challenge', 'Judge Tour', 'coming_soon', 'The complete 90-second research-to-game journey is pending.'],
  ['impact', '/impact', 'Worldwide Usefulness', 'coming_soon', 'User research and measured impact are pending.'],
  ['meshy-assets', '/assets', 'Meshy Asset Pipeline', 'blocked', 'No funded API entitlement or per-job spend approval verified.']
] as const;
export const features: readonly Feature[] = definitions.map(([id, route, title, state, reason]) => FeatureSchema.parse({
  id, route, title, state, reason, implemented: state === 'preview', prerequisites: [], verification: null
}));
export function resolveFeature(feature: Feature, completed: readonly string[]): Feature {
  if (['available', 'locked'].includes(feature.state)) {
    const state = feature.prerequisites.every((id) => completed.includes(id)) ? 'available' : 'locked';
    return FeatureSchema.parse({ ...feature, state });
  }
  return feature;
}
