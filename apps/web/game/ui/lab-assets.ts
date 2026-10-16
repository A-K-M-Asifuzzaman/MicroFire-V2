import type { BenchEnvironment } from './bench-scene';
// Accepted Meshy assets for the artistic training bay (see data/asset-rights.json and docs/meshy-credit-ledger.md).
// null until assets pass QA; the bench then renders exactly as without an environment.
export const LAB_ENVIRONMENT: Omit<NonNullable<BenchEnvironment>, 'onReady' | 'lite'> | null = null;
