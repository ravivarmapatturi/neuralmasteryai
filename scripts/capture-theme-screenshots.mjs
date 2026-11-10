import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('docs/evidence/themes');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const PORT = 5188;
const BASE_URL = `http://localhost:${PORT}`;

const THEMES = ['light', 'dark', 'pure-white', 'sepia', 'forest'];
const VIEWPORTS = [
  { width: 375, height: 667, name: '375' },
  { width: 1280, height: 800, name: '1280' },
];

const ROUTES = [
  { path: '/interview', name: 'interview' },
  { path: '/interview/q/classical-ml-questions:cml-high-variance-tree', name: 'question-room' },
  { path: '/docs/deep-learning/attention-transformers', name: 'attention-transformers' },
  { path: '/', name: 'home' },
];

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond within ${timeoutMs}ms at ${url}`);
}

async function run() {
  console.log(`Starting dev server on port ${PORT}...`);
  const server = spawn('npx', ['vite', '--port', String(PORT)], {
    stdio: 'inherit',
    env: { ...process.env, BROWSER: 'none' },
  });

  try {
    await waitForServer(BASE_URL);
    console.log('Dev server ready. Launching chromium...');

    const browser = await chromium.launch();
    const context = await browser.newContext();

    for (const theme of THEMES) {
      console.log(`\n=== Capturing Theme: ${theme} ===`);
      for (const vp of VIEWPORTS) {
        const page = await context.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Seed theme in localStorage and html before load
        await page.addInitScript((th) => {
          window.localStorage.setItem('neural-mastery-theme', th);
        }, theme);

        for (const route of ROUTES) {
          const url = `${BASE_URL}${route.path}`;
          console.log(`[${theme}][${vp.name}px] Navigating to ${url}...`);
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            // Ensure theme applied
            await page.evaluate((th) => {
              document.documentElement.setAttribute('data-theme', th);
            }, theme);
            await page.waitForTimeout(600);

            const filename = `${route.name}-${theme}-${vp.name}px.png`;
            const filepath = path.join(OUT_DIR, filename);
            await page.screenshot({ path: filepath });
            console.log(`Saved: ${filepath}`);
          } catch (err) {
            console.error(`Error capturing ${route.name} (${theme}, ${vp.name}):`, err.message);
          }
        }
        await page.close();
      }
    }

    await browser.close();
    console.log('\nAll screenshots captured successfully!');
  } finally {
    console.log('Stopping dev server...');
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
