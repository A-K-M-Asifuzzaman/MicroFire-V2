// Test helper (not a spec): runs the real deterministic @microfire/science function the API uses for one request.
// Invoked through `node --import tsx` because Playwright's ESM loader cannot import the catalog JSON directly.
import { answerQuestion, classifyGaps, rankEvidence, scientificIntelligence } from '@microfire/science';

const [fn, raw] = process.argv.slice(2);
const input = JSON.parse(raw ?? '{}');
const run: Record<string, () => unknown> = {
  ask: () => answerQuestion(input),
  rank: () => rankEvidence({ limit: 5, ...input }),
  gaps: () => classifyGaps(input.targetConditions),
  intelligence: () => scientificIntelligence({ environment: 'custom', limit: 4, ...input })
};
process.stdout.write(JSON.stringify(run[fn!]!()));
