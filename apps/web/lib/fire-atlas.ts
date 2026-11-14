// Fire-Safety Investigation Atlas: NASA's descriptions of combustion investigations, ranked for a crew environment.
// The ranking is MicroFire's TRANSPARENT INTERPRETATION of those descriptions (every point is listed), not NASA's
// ranking, not a measurement and never a fire-risk score.
import atlas from '../data/fire-safety-atlas.json';

export type Pillar = 'prevention' | 'detection' | 'suppression' | 'fundamental';
export type Investigation = Omit<(typeof atlas.investigations)[number], 'pillars' | 'admitted'> & { pillars: Pillar[]; admitted?: number };
export type Environment = 'spacecraft' | 'station' | 'lunar' | 'mars' | 'rover';
export const ENVIRONMENTS: Record<Environment, string> = { spacecraft: 'Spacecraft cabin', station: 'Space station', lunar: 'Lunar base', mars: 'Mars base', rover: 'Pressurized rover' };
export const PILLAR_LABEL: Record<Pillar, string> = { prevention: 'Prevention (material flammability)', detection: 'Detection (smoke and aerosols)', suppression: 'Suppression (extinguishing)', fundamental: 'Fundamental combustion' };
export const FUEL_LABEL: Record<string, string> = { solid: 'Solid materials', droplet: 'Liquid droplets', gas: 'Gaseous fuel', aerosol: 'Smoke and dust' };
export const PLATFORM_LABEL: Record<string, string> = { iss: 'International Space Station', spacecraft: 'Uncrewed spacecraft', 'lunar-surface': 'Lunar surface' };

export const investigations = atlas.investigations as unknown as Investigation[];
export const { facilities, history, spinoffs, sources } = atlas;

export type Reason = { points: number; why: string };
/** Every point is explained. Crew safety pillars weigh most; solid materials and smoke matter most in a crew cabin. */
export function score(inv: Investigation, env: Environment): { total: number; reasons: Reason[] } {
  const r: Reason[] = [];
  const safety = inv.pillars.filter((p) => p !== 'fundamental').length;
  if (safety) r.push({ points: 3 + (safety - 1), why: `Fire-safety pillar: ${inv.pillars.filter((p) => p !== 'fundamental').join(' and ')}` });
  else r.push({ points: 1, why: 'Fundamental combustion science (indirect for fire safety)' });
  if (inv.fuel === 'solid') r.push({ points: 2, why: 'Solid materials: what a crew cabin is made of' });
  if (inv.fuel === 'aerosol') r.push({ points: 2, why: 'Smoke and dust: what a crew detector must sense' });
  if (inv.id === 'acme-bre') r.push({ points: 1, why: 'Gas burner that emulates solid-material burning' });
  const lunarish = env === 'lunar' || env === 'rover';
  if (inv.platform === 'lunar-surface' && lunarish) r.push({ points: 3, why: 'Run in actual lunar gravity' });
  if (inv.platform === 'lunar-surface' && env === 'mars') r.push({ points: 1, why: 'Partial gravity, closer to Mars than orbit is' });
  if (inv.id === 'flare' && (lunarish || env === 'mars')) r.push({ points: 1, why: 'Links flammability limits across gravity levels' });
  if (inv.platform === 'spacecraft' && env === 'spacecraft') r.push({ points: 2, why: 'Fire spread at spacecraft scale' });
  if (inv.platform === 'iss' && (env === 'station' || env === 'spacecraft')) r.push({ points: 1, why: 'Run in the microgravity a station or spacecraft has' });
  if (inv.admitted) r.push({ points: 1, why: 'Has a record checked cell by cell in MicroFire (B20)' });
  return { total: r.reduce((a, x) => a + x.points, 0), reasons: r };
}
export function rank(env: Environment) {
  return investigations.map((inv) => ({ inv, ...score(inv, env) })).sort((a, b) => b.total - a.total || a.inv.acronym.localeCompare(b.inv.acronym));
}
/** Same/different on the fields the challenge suggests comparing (objective pillar, fuel, platform, gravity, status). */
export function compare(a: Investigation, b: Investigation) {
  const rows: [string, string, string][] = [
    ['Fire-safety pillar', a.pillars.join(', '), b.pillars.join(', ')], ['Fuel', FUEL_LABEL[a.fuel] ?? a.fuel, FUEL_LABEL[b.fuel] ?? b.fuel],
    ['Where it ran', PLATFORM_LABEL[a.platform] ?? a.platform, PLATFORM_LABEL[b.platform] ?? b.platform], ['Gravity', a.gravity, b.gravity], ['Status', a.status, b.status]];
  return rows.map(([field, x, y]) => ({ field, a: x, b: y, same: x === y }));
}
