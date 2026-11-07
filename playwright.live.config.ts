import { defineConfig, devices } from '@playwright/test';

/** Smoke checks against the live site (.github/workflows/live-smoke.yml). Override with LIVE_URL. */
export default defineConfig({
  testDir: './tests/live',
  retries: 1,
  reporter: [['list']],
  use: { baseURL: process.env.LIVE_URL ?? 'https://neuralmasteryai.com/', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
