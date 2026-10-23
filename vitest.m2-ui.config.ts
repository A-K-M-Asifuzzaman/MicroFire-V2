import { defineConfig } from 'vitest/config';
// M2 gameplay frontend unit tests (Claude-owned). Kept separate from the shared tests/unit suite.
export default defineConfig({ test: { include: ['apps/web/game/**/*.test.ts'], environment: 'node' } });
