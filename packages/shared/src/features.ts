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
  ['dashboard', '/dashboard', 'Evidence Workstation', 'preview', 'Traces a question to cited observations, their conditions and limits over the one admitted record. A machine-learning classifier was evaluated and not deployed.'],
  ['atlas', '/atlas', 'Experiment Atlas', 'preview', 'One audited BASS-II record; search API exists, search UI and broader coverage are pending.'],
  ['experiment', '/experiments/[id]', 'Experiment Dossier', 'preview', 'One cited record with field-level provenance; export API exists, export UI is pending.'],
  ['compare', '/compare', 'Controlled Comparison', 'preview', 'Explains why a comparison is refused until a second record passes source review; it never invents one.'],
  ['lab', '/lab', 'Flame Lab', 'preview', 'Interactive authored toy model with accessible controls and a cited B20 comparison; an illustration, not a simulation.'],
  ['gaps', '/gaps', 'Research Frontier', 'preview', 'Condition-by-condition coverage and transfer analysis over the admitted record; unknowns stay unknown.'],
  ['ask', '/ask', 'Ask PIX', 'preview', 'Deterministic, catalog-grounded answers with page citations and refusals of unsupported questions (no AI model).'],
  ['missions', '/missions', 'Mission Map', 'preview', 'Five playable missions with progress saved on the server and a downloadable Passport.'],
  ['station-arrival', '/missions/station-arrival', 'Station Arrival', 'preview', 'Playable now as Mission 01 of the campaign.'],
  ['bass-assembly', '/missions/bass-assembly', 'BASS-II Assembly', 'preview', 'Playable now as Mission 02 of the campaign, with the 3D training bay.'],
  ['flame-detective', '/missions/flame-detective', 'Flame Detective', 'preview', 'Playable now as Mission 03 of the campaign.'],
  ['claim-trial', '/missions/claim-trial', 'Claim Trial', 'preview', 'Playable now as Mission 04 of the campaign.'],
  ['lunar-habitat', '/missions/lunar-habitat', 'Lunar Habitat', 'preview', 'Playable now as Mission 05 of the campaign (a fictional scenario).'],
  ['passport', '/passport', 'Evidence Passport', 'preview', 'Earned in the five-mission campaign and downloaded as JSON from the mission page; this page is a local notebook.'],
  ['sources', '/sources', 'Sources & Rights', 'preview', 'One source audit; broader corpus and media rights review are pending.'],
  ['methodology', '/methodology', 'Methodology', 'preview', 'Fixture methodology; a small author-labelled ranking/Ask regression set exists, independent evaluation is pending.'],
  ['roadmap', '/roadmap', 'Product Progress', 'preview', 'Phase Zero status inventory; no public release approved.'],
  ['challenge', '/judge-guide', 'Judge Guide', 'preview', 'The judge tour: six guided steps and a 60-second proof.'],
  ['impact', '/impact', 'Worldwide Usefulness', 'preview', 'Built for students and curious learners; measured learning impact has not been studied yet.'],
  ['meshy-assets', '/assets', 'Meshy Asset Pipeline', 'preview', '231 Meshy-generated 3D assets in use, each listed with its task ID, credits and rights in data/asset-rights.json.']
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
