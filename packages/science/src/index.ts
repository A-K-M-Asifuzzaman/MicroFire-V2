import { CatalogSchema, PassportSchema, type Catalog, type Passport } from '@microfire/shared';
import fixture from '../../../data/fixtures/catalog.json';

export const catalog: Catalog = CatalogSchema.parse(fixture);

export function validatePassport(input: unknown, dataset: Catalog = catalog): Passport {
  const passport = PassportSchema.parse(input);
  for (const entry of passport.entries) {
    const experiments = entry.experimentIds.map((id) => dataset.experiments.find((e) => e.id === id));
    if (experiments.some((e) => !e)) throw new Error('Unknown passport experiment');
    const claims = experiments.flatMap((e) => e?.claims ?? []);
    if (entry.claimIds.some((id) => !claims.some((c) => c.id === id))) throw new Error('Unknown passport claim');
    if (claims.some((claim) => entry.claimIds.includes(claim.id) && claim.kind !== entry.observationType))
      throw new Error('Passport observation type does not match the supporting claim');
    const supporting = claims.filter((c) => entry.claimIds.includes(c.id)).flatMap((c) => c.citations);
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (entry.citations.some((citation) => !supporting.some((s) => same(s, citation))) ||
      entry.claimIds.some((id) => !claims.find((c) => c.id === id)?.citations.some((c) => entry.citations.some((e) => same(c, e)))))
      throw new Error('Passport citation does not match the cited claim locator');
  }
  // Free-form conclusions are learner notes; lineage checks do not validate their scientific meaning.
  return passport;
}

export function citationUrl(sourceId: string, page?: number): string {
  const source = catalog.sources.find((s) => s.id === sourceId);
  if (!source) throw new Error('Unknown source');
  return page ? `${source.documentUrl}#page=${page}` : source.url;
}
