import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
// M2 gameplay frontend (Claude-owned). Runs the production build with the developer fixture gallery enabled on its
// own port, so the shared research suite (port 3217, shared POST budget) is untouched. Fixture runs are UI evidence,
// not M2 end-to-end completion: that needs Sol's real preview API.
const reviewToken = process.env.MICROFIRE_REVIEW_ACCESS_TOKEN ?? randomBytes(32).toString('base64url');
process.env.MICROFIRE_REVIEW_ACCESS_TOKEN = reviewToken;
export default defineConfig({
  testDir: './tests/m2-ui', fullyParallel: true, forbidOnly: Boolean(process.env.CI), retries: 0, workers: 3,
  reporter: [['list']],
  // The homepage opening film has been seen in every suite except tests/m2-ui/ignition.spec.ts, which starts fresh.
  use: { baseURL: 'http://127.0.0.1:3240', channel: 'chromium', trace: 'retain-on-failure', storageState: 'tests/ignition-seen.json' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
  ],
  webServer: { command: 'npm run start --workspace @microfire/web -- --hostname 127.0.0.1 --port 3240', url: 'http://127.0.0.1:3240', reuseExistingServer: false,
    env: { MICROFIRE_M2_FIXTURE_GALLERY: '1', MICROFIRE_REVIEW_ACCESS_TOKEN: reviewToken } }
});
