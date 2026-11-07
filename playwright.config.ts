import { defineConfig, devices } from '@playwright/test';

/**
 * CI/PR smoke suite -- fast critical-path checks against the actual
 * production build (dist/, served through scripts/static-server.cjs, which
 * reproduces GitHub Pages' base-path + 404-fallback behavior). Not a
 * replacement for the full 14-component regression pass in
 * .verify-scripts/verify.cjs (run manually / before major merges, not on
 * every PR) -- see CI_CD.md.
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['live/**'], // live-site checks run from playwright.live.config.ts
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serves the already-built dist/ -- run `npm run build` first (CI does
    // this as an earlier, separate stage; see .github/workflows/ci.yml).
    command: 'node scripts/static-server.cjs',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
