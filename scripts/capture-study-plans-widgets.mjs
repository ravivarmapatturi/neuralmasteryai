import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const OUT_DIR = path.resolve('docs/evidence/widgets');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/study-plans`);
    return res.ok || res.status === 200 || res.status === 304;
  } catch {
    return false;
  }
}

async function waitForPort(port, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  let devServer = null;
  const running = await isPortOpen(5201);
  if (!running) {
    console.log('Starting vite dev server on port 5201...');
    devServer = spawn('npx', ['vite', '--port', '5201'], {
      stdio: 'pipe',
      detached: false,
    });
    devServer.stdout.on('data', (d) => process.stdout.write(d));
    devServer.stderr.on('data', (d) => process.stderr.write(d));
    const ok = await waitForPort(5201);
    if (!ok) {
      console.error('Failed to connect to dev server on port 5201');
      if (devServer) devServer.kill();
      process.exit(1);
    }
  } else {
    console.log('Dev server already running on port 5201.');
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '375', width: 375, height: 812 },
  ];

  const themes = ['light', 'dark'];

  try {
    for (const vp of viewports) {
      for (const theme of themes) {
        console.log(`Capturing ${vp.name}px - ${theme}...`);
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();

        await page.goto('http://localhost:5201/study-plans', { waitUntil: 'networkidle' });
        await page.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          window.localStorage.setItem('neural-mastery-theme', th);
        }, theme);
        await page.waitForTimeout(400);

        // Verification checks
        const metrics = await page.evaluate(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const cards = Array.from(document.querySelectorAll('.nm-category-widget-card'));
          const minHeight = Math.min(...cards.map((c) => c.getBoundingClientRect().height));
          const numSvgs = document.querySelectorAll('.nm-category-widget-visual svg').length;
          return { docScroll, bodyScroll, cardCount: cards.length, minHeight, numSvgs };
        });

        console.log(`[${vp.name}px ${theme}] scrollWidth: ${metrics.docScroll}px, cards: ${metrics.cardCount}, minHeight: ${metrics.minHeight}px, svgs: ${metrics.numSvgs}`);

        if (metrics.docScroll > vp.width) {
          throw new Error(`Horizontal overflow detected! scrollWidth ${metrics.docScroll}px > viewport ${vp.width}px`);
        }
        if (metrics.minHeight < 44) {
          throw new Error(`Touch target too small! Card minHeight ${metrics.minHeight}px < 44px`);
        }

        const screenshotPath = path.join(OUT_DIR, `study-plans-${vp.name}-${theme}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Saved screenshot: ${screenshotPath}`);

        // Also save a full page view so the owner can inspect all sections
        const fullScreenshotPath = path.join(OUT_DIR, `study-plans-${vp.name}-${theme}-full.png`);
        await page.screenshot({ path: fullScreenshotPath, fullPage: true });
        console.log(`Saved full page screenshot: ${fullScreenshotPath}`);

        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (devServer) {
      console.log('Shutting down dev server...');
      devServer.kill('SIGTERM');
    }
  }

  console.log('Capture complete!');
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
