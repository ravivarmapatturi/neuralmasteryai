import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const OUT_DIR = path.resolve('docs/evidence/interview-graph');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PORT = 5202;

// Load real interview practice data to generate real award events
const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf8'));

// Build award events for the 3 states
function buildAwards(state) {
  const awards = [];
  const today = '2026-11-09';

  if (state === '0pct') {
    return awards;
  }

  if (state === 'partial') {
    // Exact match for the brief example: Transformers 42% (18 of 43 completed)
    // Plus partial completions across a few other topics
    for (const t of practice.topics) {
      let doneCount = 0;
      if (t.id === 'transformers') {
        doneCount = 18; // 18 / 43 = 41.86% -> 42%
      } else if (t.id === 'math-classical-ml') {
        doneCount = 28; // 28 / 57 = 49%
      } else if (t.id === 'deep-learning') {
        doneCount = 46; // 46 / 46 = 100% (completed foundation)
      } else if (t.id === 'rag') {
        doneCount = 35; // 35 / 126 = 28%
      } else if (t.id === 'evaluation') {
        doneCount = 26; // 26 / 43 = 60%
      } else if (t.id === 'agents') {
        doneCount = 15; // 15 / 44 = 34%
      } else if (t.id === 'coding') {
        doneCount = 14; // 14 / 14 = 100%
      }

      for (let i = 0; i < doneCount; i++) {
        awards.push({
          permalink: `/interview#${t.questions[i].id}`,
          kind: 'interview',
          date: today,
          points: 10,
        });
      }
    }
    return awards;
  }

  if (state === '100pct') {
    // 100% complete across ALL topics
    for (const t of practice.topics) {
      for (const q of t.questions) {
        awards.push({
          permalink: `/interview#${q.id}`,
          kind: 'interview',
          date: today,
          points: 10,
        });
      }
    }
    return awards;
  }

  return awards;
}

async function run() {
  console.log('Starting Vite server on port', PORT);
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) },
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const states = ['0pct', 'partial', '100pct'];
  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '375', width: 375, height: 667 },
  ];
  const themes = ['light', 'dark'];

  const measurements = {
    states: {},
    responsive: {},
    contrast: {},
  };

  for (const state of states) {
    measurements.states[state] = {};
    const awards = buildAwards(state);

    for (const vp of viewports) {
      for (const theme of themes) {
        const filename = `${vp.name}-${theme}-${state}.png`;
        console.log(`Capturing state=${state}, vp=${vp.name}, theme=${theme} -> ${filename}`);

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();

        // Inject gamification awards into localStorage before load
        await page.addInitScript((awardsJson) => {
          window.localStorage.setItem('neural-mastery-gamification', awardsJson);
        }, JSON.stringify(awards));

        await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.si-node');
        await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
        await page.waitForTimeout(400);

        // Take screenshot
        const screenshotPath = path.join(OUT_DIR, filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        // Verify layout, overflow and node measurements
        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const hasOverflow = docEl.scrollWidth > docEl.clientWidth;
          const nodes = Array.from(document.querySelectorAll('.si-node')).map((el) => {
            const rect = el.getBoundingClientRect();
            const labelEl = el.querySelector('.si-label');
            const labelText = labelEl ? labelEl.textContent : '';
            return {
              text: labelText,
              ariaLabel: el.getAttribute('aria-label'),
              opacity: window.getComputedStyle(el).opacity,
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            };
          });

          const edges = Array.from(document.querySelectorAll('.si-edges path')).map((el) => ({
            strokeWidth: window.getComputedStyle(el).strokeWidth,
            opacity: window.getComputedStyle(el).opacity,
          }));

          const groupPills = Array.from(document.querySelectorAll('.si-group-pill')).map((el) => ({
            text: el.textContent,
            ariaLabel: el.getAttribute('aria-label'),
          }));

          return {
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            hasOverflow,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            sampleNodes: nodes.filter((n) => n.text.includes('Transformers') || n.text.includes('Classical') || n.text.includes('Deep Learning')),
            edgeStrokeSample: [edges[0]?.strokeWidth, edges[Math.floor(edges.length / 2)]?.strokeWidth],
            edgeOpacitySample: [edges[0]?.opacity, edges[Math.floor(edges.length / 2)]?.opacity],
            groupPillCount: groupPills.length,
          };
        });

        measurements.states[state][`${vp.name}-${theme}`] = metrics;
        await context.close();
      }
    }
  }

  // Also verify narrow mobile (320px)
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const awards = buildAwards('partial');
    await page.addInitScript((awardsJson) => {
      window.localStorage.setItem('neural-mastery-gamification', awardsJson);
    }, JSON.stringify(awards));

    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.si-node');
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.waitForTimeout(400);

    const filename = `320-${theme}-partial.png`;
    await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });

    const metrics320 = await page.evaluate(() => {
      const docEl = document.documentElement;
      return {
        scrollWidth: docEl.scrollWidth,
        clientWidth: docEl.clientWidth,
        hasOverflow: docEl.scrollWidth > docEl.clientWidth,
      };
    });
    measurements.responsive[`320-${theme}`] = metrics320;
    await context.close();
  }

  await browser.close();
  server.kill();
  console.log('Capture complete! Measurements summary:');
  console.log(JSON.stringify(measurements, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, 'measurements.json'), JSON.stringify(measurements, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
