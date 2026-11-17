import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const hasDist = fs.existsSync('dist/index.html');
const serverPort = process.env.TEST_PORT || (hasDist ? '4173' : '5173');
const defaultUrl = `http://localhost:${serverPort}/`;
const defaultCommand = hasDist
  ? 'node scripts/static-server.cjs'
  : 'node node_modules/vite/bin/vite.js --host localhost --port 5173';

/**
 * CI/PR smoke suite -- fast critical-path checks against the actual
 * production build (dist/, served through scripts/static-server.cjs, which
 * reproduces GitHub Pages' base-path + 404-fallback behavior) or dev server when dist is not built.
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['live/**'], // live-site checks run from playwright.live.config.ts
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: defaultUrl,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_CMD || defaultCommand,
    url: defaultUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
