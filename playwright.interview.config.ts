import { defineConfig } from '@playwright/test';
import base from './playwright.config';
process.env.TEST_PORT = '5173';
export default defineConfig({
  ...base,
  testMatch: /interview-.*\.spec\.ts/,
  workers: 1,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5173/' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173/',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
