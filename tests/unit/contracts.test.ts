import { describe, expect, it } from 'vitest';
import { CatalogSchema, ClaimSchema, FeatureSchema, PassportSchema, features, resolveFeature, missionDefinitions, MissionIdSchema, PartIdSchema } from '@microfire/shared';
import { catalog, citationUrl, validatePassport } from '@microfire/science';
import cells from '../../data/fixtures/b20-source-cells.json';

const record = catalog.experiments[0]!;
const claim = record.claims[0]!;
export const passportExample = {
  schemaVersion: 1, purpose: 'educational-research-record', entries: [{ id: 'example-entry', missionId: 'station-arrival', experimentIds: [record.id], claimIds: [claim.id], observationType: 'observed', evidenceLevel: 'direct', conclusion: claim.text, citations: claim.citations, limitations: record.limitations, corrections: [], setupRevision: null, status: 'current', scenario: 'research', createdAt: '2026-10-11T09:00:00Z' }]
};
describe('scientific trust boundaries', () => {
  it('traces the real observation and corrected oxygen column to the offline source-cell audit', () => {
    expect(CatalogSchema.parse(catalog)).toEqual(catalog);
    expect(record.conditions.oxygenPct.value).toBe(cells.transcribedCells.calibratedInitialOxygenVolPct);
    expect(record.conditions.oxygenPct.value).not.toBe(cells.transcribedCells.initialOxygenVolPct);
    expect(claim.text.replace('the entire', 'entire')).toContain(cells.transcribedCells.observation);
    expect(claim.citations[0]?.locator).toEqual(cells.locator);
    expect(record.conditions.pressureKpa.value).toBeNull();
    expect(record.rawFlow).toBe(cells.transcribedCells.airDisplay);
  });
  it('rejects unlocated, fictional and dangling observations', () => {
    expect(ClaimSchema.safeParse({ ...claim, citations: [] }).success).toBe(false);
    expect(ClaimSchema.safeParse({ ...claim, origin: 'fictional-scenario' }).success).toBe(false);
    const copy = structuredClone(catalog); copy.experiments[0]!.sourceIds = ['invented-source'];
    expect(CatalogSchema.safeParse(copy).success).toBe(false);
  });
  it('rejects impossible oxygen and unsafe URLs', () => {
    const copy = structuredClone(catalog); copy.sources[0]!.url = 'javascript:alert(1)';
    expect(CatalogSchema.safeParse(copy).success).toBe(false);
    const bad = structuredClone(catalog);
    const oxygen = bad.experiments[0]!.conditions.oxygenPct;
    if (oxygen.status === 'known') oxygen.value = 101;
    expect(CatalogSchema.safeParse(bad).success).toBe(false);
  });
  it('validates passport lineage without certifying learner conclusions', () => {
    expect(validatePassport(passportExample).entries).toHaveLength(1);
    const wrong = structuredClone(passportExample); wrong.entries[0]!.claimIds = ['invented-claim'];
    expect(() => validatePassport(wrong)).toThrow('Unknown passport claim');
    const wrongPage = structuredClone(passportExample);
    const locator = wrongPage.entries[0]!.citations[0]!.locator;
    if (locator.kind === 'pdf') locator.page = 1;
    expect(() => validatePassport(wrongPage)).toThrow('locator');
  });
  it('rejects duplicate entries and direct lunar extrapolation', () => {
    expect(PassportSchema.safeParse({ ...passportExample, entries: [...passportExample.entries, ...passportExample.entries] }).success).toBe(false);
    expect(PassportSchema.safeParse({ ...passportExample, entries: [{ ...passportExample.entries[0], missionId: 'lunar-habitat', scenario: 'fictional-scenario' }] }).success).toBe(false);
  });
  it('does not let an entry relabel the epistemic type of its supporting claim', () => {
    const wrongType = structuredClone(passportExample);
    wrongType.entries[0]!.observationType = 'hypothesis';
    expect(() => validatePassport(wrongType)).toThrow('observation type');
  });
  it('resolves the catalog source and supplied PDF locator without inventing a URL', () => {
    const source = catalog.sources[0]!;
    expect(citationUrl(source.id)).toBe(source.url);
    expect(citationUrl(source.id, 112)).toBe(`${source.documentUrl}#page=112`);
    expect(() => citationUrl('invented-source', 112)).toThrow('Unknown source');
  });
});
describe('feature gates and mission interfaces', () => {
  it('covers five distinct missions and ten stable parts', () => {
    expect(missionDefinitions.map((m) => m.id)).toEqual(MissionIdSchema.options);
    expect(new Set(missionDefinitions.map((m) => m.mechanic)).size).toBe(5);
    expect(PartIdSchema.options).toHaveLength(10);
    expect(new Set(features.map((f) => f.route)).size).toBe(features.length);
  });
  it('never changes a mission label from player progress (playable missions stay Preview, never Available)', () => {
    for (const mission of MissionIdSchema.options) {
      const f = features.find((f) => f.id === mission)!;
      expect(resolveFeature(f, MissionIdSchema.options).state).toBe('preview');
    }
  });
  it('requires browser evidence before Available or Locked and resolves real progress gates', () => {
    const f = features[0]!;
    expect(FeatureSchema.safeParse({ ...f, state: 'available' }).success).toBe(false);
    const built = FeatureSchema.parse({ ...f, state: 'available', prerequisites: ['station-arrival'], verification: { unitTest: 'unit', browserTest: 'browser', screenshot: 'capture.png', checkedAt: '2026-10-11T09:00:00Z' } });
    expect(resolveFeature(built, []).state).toBe('locked');
    expect(resolveFeature(built, ['station-arrival']).state).toBe('available');
    expect(resolveFeature(FeatureSchema.parse({ ...f, state: 'blocked', implemented: false }), []).state).toBe('blocked');
  });
  it('rejects an unimplemented feature labelled Preview', () => {
    expect(FeatureSchema.safeParse({ ...features[0], state: 'preview', implemented: false }).success).toBe(false);
  });
});
