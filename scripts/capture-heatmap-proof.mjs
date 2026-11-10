import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('docs/evidence/themes');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const PORT = 5189;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond within ${timeoutMs}ms at ${url}`);
}

async function run() {
  const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf8'));

  // 100% for tokenization-decoding (19/19)
  const tokenTopic = practice.topics.find((t) => t.id === 'tokenization-decoding');
  // 50% for post-training (19/38)
  const postTrainTopic = practice.topics.find((t) => t.id === 'post-training');
  // ~51% for transformers (22/43)
  const transformersTopic = practice.topics.find((t) => t.id === 'transformers');

  const records = [];
  tokenTopic.questions.forEach((q, i) => {
    records.push({ questionId: q.id, completion: { time: Date.now() - 500000 + i * 1000, attemptId: 'att-' + q.id } });
  });

  const halfPost = Math.round(postTrainTopic.questions.length / 2);
  postTrainTopic.questions.slice(0, halfPost).forEach((q, i) => {
    records.push({ questionId: q.id, completion: { time: Date.now() - 500000 + i * 1000, attemptId: 'att-' + q.id } });
  });

  const halfTrans = Math.round(transformersTopic.questions.length / 2);
  transformersTopic.questions.slice(0, halfTrans).forEach((q, i) => {
    records.push({ questionId: q.id, completion: { time: Date.now() - 500000 + i * 1000, attemptId: 'att-' + q.id } });
  });

  console.log(`Starting dev server on port ${PORT}...`);
  const server = spawn('npx', ['vite', '--port', String(PORT)], {
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });

  try {
    await waitForServer(BASE_URL);
    console.log('Dev server ready. Launching chromium...');

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const themesToProve = ['light', 'dark', 'pure-white'];

    for (const theme of themesToProve) {
      console.log(`\n=== Proving Heat Map in ${theme} ===`);
      const page = await context.newPage();

      await page.addInitScript(
        ({ th, recs }) => {
          window.localStorage.setItem('neural-mastery-theme', th);
          window.localStorage.setItem('nm-interview-learning-v1:guest', JSON.stringify(recs));
          window.localStorage.setItem('nm-interview-learning-v1', JSON.stringify(recs));
        },
        { th: theme, recs: records }
      );

      await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.si-map');
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        document.documentElement.setAttribute('data-page-theme', th);
      }, theme);

      await page.waitForTimeout(600);

      // Verify node values
      const nodesData = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.si-node')).map((n) => {
          const title = n.querySelector('.si-label-title')?.textContent?.trim();
          const pct = n.querySelector('.si-label-pct')?.textContent?.trim() || '0%';
          const color = window.getComputedStyle(n).color;
          const dot = n.querySelector('.si-dot');
          const dotBg = dot ? window.getComputedStyle(dot).backgroundColor : null;
          return { title, pct, color, dotBg };
        });
      });

      console.log(`[${theme}] Sampled nodes:`);
      const sample = nodesData.filter((n) => ['Tokenization', 'Fine-tuning', 'Transformers', 'Classical ML'].includes(n.title));
      console.table(sample);

      // Save full page screenshot
      const fullPageFile = path.join(OUT_DIR, `interview-${theme}-1280px.png`);
      await page.screenshot({ path: fullPageFile, fullPage: false });
      console.log(`Saved full interview page: ${fullPageFile}`);

      // Save focused graph screenshot
      const graphEl = await page.$('.si-map');
      if (graphEl) {
        const graphFile = path.join(OUT_DIR, `graph-heatmap-${theme}.png`);
        await graphEl.screenshot({ path: graphFile });
        console.log(`Saved focused graph screenshot: ${graphFile}`);
      }

      await page.close();
    }

    await browser.close();
    console.log('\nAll heat map proof screenshots captured successfully!');
  } finally {
    console.log('Stopping dev server...');
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Error proving heat map:', err);
  process.exit(1);
});
