import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('docs/evidence/notebook-phase1');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const PORT = 5194;
const BASE_URL = `http://localhost:${PORT}`;

const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440px' },
  { width: 375, height: 812, name: '375px' },
];

const ROUTES = [
  { path: '/docs/search-ranking-recommendations/tf-idf', name: 'tf-idf' },
  { path: '/docs/search-ranking-recommendations/bm25', name: 'bm25' },
  { path: '/docs/search-ranking-recommendations/recommendation-foundations', name: 'recommendation-foundations' },
  { path: '/docs/deep-learning/attention-transformers', name: 'attention-transformers' },
  { path: '/blog/agent-skills-explained', name: 'blog-agent-skills-explained' },
];

async function waitForArticle(page, routeName) {
  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    const heading = main?.querySelector('h1')?.textContent?.trim();
    const article = main?.querySelector('article.prose');
    const body = article?.innerText?.trim() ?? '';
    return Boolean(heading && body.length > 150 && !/^Loading[.…]*$/m.test(body));
  }, undefined, { timeout: 45000 });

  const state = await page.evaluate(() => {
    const main = document.querySelector('main');
    const article = main?.querySelector('article.prose');
    return {
      heading: main?.querySelector('h1')?.textContent?.trim() ?? '',
      articleTextLength: article?.innerText?.trim().length ?? 0,
      loadingVisible: /Loading[.…]*/.test(article?.innerText ?? ''),
    };
  });
  if (!state.heading || state.articleTextLength <= 150 || state.loadingVisible) {
    throw new Error(`${routeName} article did not become ready: ${JSON.stringify(state)}`);
  }
  return state;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return true;
    } catch {
      // retry
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

  const overflowResults = [];
  const consoleErrors = [];
  const pageErrors = [];
  const captureFailures = [];

  try {
    await waitForServer(BASE_URL);
    console.log('Dev server ready. Launching chromium...');

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = await browser.newContext();

    for (const theme of THEMES) {
      console.log(`\n=== Capturing Theme: ${theme} ===`);
      for (const vp of VIEWPORTS) {
        const page = await context.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push({ theme, vp: vp.name, text: msg.text() });
          }
        });
        page.on('pageerror', (err) => {
          pageErrors.push({ theme, vp: vp.name, text: err.message });
        });

        // Set theme in localStorage
        await page.addInitScript((th) => {
          window.localStorage.setItem('neural-mastery-theme', th);
        }, theme);

        for (const route of ROUTES) {
          const url = `${BASE_URL}${route.path}`;
          console.log(`[${theme}][${vp.name}] Navigating to ${url}...`);
          try {
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            if (!response || !response.ok()) {
              throw new Error(`Navigation failed: HTTP ${response?.status() ?? 'no response'}`);
            }
            await page.evaluate((th) => {
              document.documentElement.setAttribute('data-theme', th);
              document.documentElement.setAttribute('data-page-theme', th);
            }, theme);
            const ready = await waitForArticle(page, route.name);

            // Check horizontal overflow on phones
            const overflow = await page.evaluate(() => {
              const docWidth = document.documentElement.clientWidth;
              const scrollWidth = document.documentElement.scrollWidth;
              return { hasOverflow: scrollWidth > docWidth + 2, docWidth, scrollWidth };
            });

            if (vp.name === '375px' && overflow.hasOverflow) {
              console.warn(`WARNING: Horizontal overflow detected on ${route.name} at 375px: ${overflow.scrollWidth}px > ${overflow.docWidth}px`);
              overflowResults.push({ route: route.name, theme, ...overflow });
            }

            const filename = `${route.name}-${theme}-${vp.name}.png`;
            const filepath = path.join(OUT_DIR, filename);
            await page.screenshot({ path: filepath });
            console.log(`Saved screenshot: ${filename} (size: ${fs.statSync(filepath).size} bytes; ${JSON.stringify(ready)})`);
          } catch (err) {
            console.error(`Error capturing ${route.name} (${theme}, ${vp.name}):`, err.message);
            captureFailures.push({ route: route.name, theme, viewport: vp.name, error: err.message });
          }
        }
        await page.close();
      }
    }

    await browser.close();
    console.log('\nAll screenshots captured successfully!');
    if (overflowResults.length > 0) {
      console.log('Overflow results:', overflowResults);
    } else {
      console.log('Zero horizontal overflow detected across all 375px mobile routes.');
    }
    if (consoleErrors.length > 0) {
      console.log(`Captured ${consoleErrors.length} console error(s).`);
    } else {
      console.log('Zero console errors captured.');
    }
    console.log(`Page errors: ${JSON.stringify(pageErrors)}`);
    console.log(`Capture failures: ${JSON.stringify(captureFailures)}`);
    if (captureFailures.length > 0 || overflowResults.length > 0 || pageErrors.length > 0 || consoleErrors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    console.log('Stopping dev server...');
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
