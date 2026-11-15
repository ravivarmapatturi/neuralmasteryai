import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const PORT = 5225;
const BASE_URL = `http://localhost:${PORT}`;
const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/search-ranking-recommendations/tfidf-bm25');
mkdirSync(EVIDENCE_DIR, { recursive: true });

console.log('Starting vite on port', PORT, '...');
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false,
});

let serverReady = false;
vite.stdout.on('data', (d) => {
  const str = d.toString();
  if (str.includes(String(PORT)) || str.includes('ready in') || str.includes('Local:')) {
    serverReady = true;
  }
});
vite.stderr.on('data', (d) => {
  console.error('[vite err]', d.toString());
});

const start = Date.now();
while (!serverReady && Date.now() - start < 30000) {
  await new Promise((r) => setTimeout(r, 500));
}
console.log('Vite server ready status:', serverReady);
if (!serverReady) {
  vite.kill('SIGTERM');
  throw new Error('Vite dev server failed to start within 30s');
}

const routes = [
  {
    slug: 'tf-idf',
    h1: 'TF-IDF from First Principles',
    diagramSelector: 'div[role="group"][aria-label="Interactive TF-IDF Search Engine"]',
  },
  {
    slug: 'bm25',
    h1: 'BM25: Term Saturation & Length Normalization',
    diagramSelector: 'div[role="group"][aria-label="Interactive BM25 Saturation & Calculator"]',
  },
];

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const logEntries = [];

try {
  for (const theme of ['light', 'dark']) {
    for (const vp of [
      { width: 1200, height: 900, name: 'desktop', topH: 260, diagH: 640 },
      { width: 375, height: 812, name: 'mobile', topH: 220, diagH: 592 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce',
      });

      await context.addInitScript((mode) => {
        localStorage.setItem('neural-mastery-theme', mode);
        localStorage.setItem('nm_signin_nudge_dismissed_at', String(Date.now()));
      }, theme);

      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') pageErrors.push(msg.text());
      });

      for (const route of routes) {
        const url = `${BASE_URL}/docs/search-ranking-recommendations/${route.slug}`;
        console.log(`Auditing ${theme} ${vp.name} (${vp.width}px): ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for H1
        const h1Locator = page.locator('h1').filter({ hasText: route.h1 });
        await h1Locator.waitFor({ state: 'visible', timeout: 15000 });

        // Wait for Suspense loading placeholder to detach
        const loadingLoc = page.locator('text=/Loading[.…]/');
        if ((await loadingLoc.count()) > 0) {
          await loadingLoc.first().waitFor({ state: 'detached', timeout: 15000 });
        }

        // Wait for interactive diagram to be visible
        const diagramLoc = page.locator(route.diagramSelector);
        await diagramLoc.waitFor({ state: 'visible', timeout: 15000 });

        // Dismiss sign-in nudge if present
        await page.evaluate(() => {
          document.querySelector('.nm-signin-nudge')?.remove();
        });
        const closeBtn = page.locator('button.nm-signin-nudge-close, button[aria-label="Close"]');
        if ((await closeBtn.count()) > 0 && (await closeBtn.first().isVisible())) {
          await closeBtn.first().click();
          await page.waitForTimeout(300);
        }

        // Check mobile horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const overflow = vp.width === 375 && scrollWidth > 375;
        console.log(`  scrollWidth: ${scrollWidth}px (overflow: ${overflow})`);
        if (overflow) {
          throw new Error(`Mobile 375px overflow detected on ${route.slug}: scrollWidth=${scrollWidth}`);
        }

        // Capture top portion with H1
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400);
        const topBuffer = await page.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: vp.topH } });

        // Scroll diagram into view below the sticky navbar (~60px)
        await diagramLoc.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          window.scrollBy(0, rect.top - 65);
        });
        await page.waitForTimeout(400);
        const diagBuffer = await page.screenshot({ clip: { x: 0, y: 60, width: vp.width, height: vp.diagH } });

        // Composite both into final image
        const targetFile = path.join(EVIDENCE_DIR, `${route.slug}-${theme}-${vp.name}.png`);
        await sharp({
          create: {
            width: vp.width,
            height: vp.height,
            channels: 4,
            background: theme === 'dark' ? '#0d1117' : '#faf8f5',
          },
        })
          .composite([
            { input: topBuffer, top: 0, left: 0 },
            { input: diagBuffer, top: vp.topH, left: 0 },
          ])
          .png()
          .toFile(targetFile);

        console.log(`  Saved composite evidence: ${targetFile} (${vp.width}x${vp.height})`);

        logEntries.push({
          route: route.slug,
          theme,
          viewport: `${vp.width}x${vp.height}`,
          scrollWidth,
          targetFile,
        });
      }
      await context.close();
    }
  }

  // Next, run RunnableCode in one desktop session and verify Pyodide execution
  console.log('\nTesting RunnableCode blocks in browser Pyodide runtime...');
  const pyContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const pyPage = await pyContext.newPage();

  for (const slug of ['text-search-bm25', 'tf-idf', 'bm25']) {
    const url = `${BASE_URL}/docs/search-ranking-recommendations/${slug}`;
    console.log(`Auditing Python snippets on ${url}...`);
    await pyPage.goto(url, { waitUntil: 'domcontentloaded' });
    await pyPage.waitForTimeout(2000);

    const runButtons = pyPage.getByRole('button', { name: 'Run', exact: true });
    const count = await runButtons.count();
    console.log(`  Found ${count} RunnableCode buttons on ${slug}`);

    for (let i = 0; i < count; i++) {
      console.log(`  Executing Python snippet ${i + 1} of ${count}...`);
      const btn = runButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      // Wait for output
      await pyPage.waitForTimeout(6000);
      const preList = await pyPage.locator('pre').allTextContents();
      const output = preList.join('\n');

      if (/Traceback|Error:|ModuleNotFoundError/.test(output)) {
        throw new Error(`Python snippet ${i + 1} on ${slug} failed with traceback:\n${output}`);
      }
      console.log(`  Snippet ${i + 1} executed successfully.`);
    }
  }
  await pyContext.close();
} finally {
  await browser.close();
  vite.kill('SIGTERM');
  console.log('Dev server stopped.');
}

console.log('All screenshot captures, mobile overflow checks, and Pyodide executions PASSED!');
process.exit(0);
