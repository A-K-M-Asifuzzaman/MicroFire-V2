import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DomainResult, HttpFailure, LocalSaveResult, Snapshot } from '../contract';

// Approved contract examples (docs/m2/fixtures at 11ec4ca) as TEST INPUTS ONLY.
export const fixtureDir = fileURLToPath(new URL('../../../../docs/m2/fixtures/', import.meta.url));
export const fx = <T = unknown>(name: string): T => JSON.parse(readFileSync(`${fixtureDir}${name}.example.json`, 'utf8')) as T;
export const snap = (name: string): Snapshot => {
  const d = fx<{ data: Snapshot | DomainResult }>(name).data;
  return 'snapshot' in d ? d.snapshot : d;
};
export const domain = (name: string) => fx<{ data: DomainResult }>(name).data;
export const failure = (name: string) => fx<HttpFailure>(name);
export const local = (name: string) => fx<LocalSaveResult>(name);
