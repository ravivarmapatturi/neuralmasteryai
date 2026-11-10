import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const PORT = 5202;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.resolve('docs/evidence/interview/mobile-pass');
const PAGE_TIMEOUT_MS = 15000;

const WIDTHS = [
  { name: '320', width: 320, height: 640 },
  { name: '375', width: 375, height: 667 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'];

const TARGET_Q_ID = 'senior:cache-semantic-vector-similarity-thresholds';
const PRESEED_ATTEMPTS = [
  {
    id: 'attempt-prev-001',
    questionId: TARGET_Q_ID,
    time: Date.now() - 86400000,
    transcript: 'Earlier attempt discussing cosine similarity threshold tuning using precision-recall curves.',
    points: [
      { point: 'Semantic caches match paraphrases using query-vector similarity.', verdict: 'covered', evidence: 'cosine similarity threshold tuning', confidence: 92 },
      { point: 'Tune thresholds on historical query pairs using ROC curves.', verdict: 'covered', evidence: 'precision-recall curves', confidence: 88 }
    ],
    source: 'rubric',
    status: 'checked',
    revision: 1,
    delivery: {
      durationSeconds: 56,
      speakingSeconds: 50,
      wordsPerMinute: 136,
      fillers: { um: 1, like: 1 },
      longPauses: 1
    }
  }
];

const PRESEED_SKETCH = {
  nodes: [
    { id: 'node-1', label: 'API gateway', x: 20, y: 30 },
    { id: 'node-2', label: 'Vector DB', x: 60, y: 30 }
  ],
  edges: [
    { from: 'node-1', to: 'node-2' }
  ]
};

async function withTimeout(action, ms, desc) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${desc}`)), ms);
  });
  const promise = typeof action === 'function' ? action() : action;
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function initPage(context, width, height, theme) {
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.addInitScript(({ theme, preseedAttempts, preseedSketch }) => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('neural-mastery-theme', theme);
      localStorage.setItem('theme', theme);
      localStorage.setItem('nm-theme', theme);
      localStorage.setItem('nm-interview-attempts-v1:guest', JSON.stringify(preseedAttempts));
      localStorage.setItem('nm-sd-sketch:repo:rag:design-rag-over-company-docs', JSON.stringify(preseedSketch));
      localStorage.removeItem('nm-timed-mock-active-session');
    } catch {
      // ignore
    }

    window.Audio = class extends Audio {
      constructor() { super(); }
      get currentTime() { return 1; }
      play() { this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
      pause() {}
    };

    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      constructor(url, options) {
        super();
        const urlStr = String(url);
        if (!/(mockInterviewWorker|moonshineSingleThreadWorker|kokoroWorker)/.test(urlStr)) {
          return new RealWorker(url, options);
        }
      }
      postMessage({ id, op }) {
        const reply = (data) => queueMicrotask(() => {
          const event = new MessageEvent('message', { data: { id, ...data } });
          this.dispatchEvent(event);
          if (typeof this.onmessage === 'function') this.onmessage(event);
        });

        if (op === 'init') {
          reply({ type: 'ready' });
        } else if (op === 'judge' || op === 'embed') {
          reply({
            status: 'ok',
            matches: [
              { index: 0, matched: true, score: 0.88, quote: 'tuning thresholds' },
              { index: 1, matched: true, score: 0.82, quote: 'paraphrase logs' }
            ],
            confidence: 0.85,
            embedding: new Float32Array(384).fill(0.05),
            score: 0.85
          });
        } else if (op === 'chunk' || op === 'finalize') {
          reply({
            type: 'result',
            transcript: 'We tune cosine similarity thresholds using ROC curves and paraphrase logs.',
            tokens: ['tune', 'cosine', 'similarity'],
            sampleCount: 16000,
            inferMs: 1
          });
        } else if (op === 'reset') {
          reply({ type: 'reset_done' });
        }
      }
      terminate() {
        this.onmessage = null;
      }
    };
  }, { theme, preseedAttempts: PRESEED_ATTEMPTS, preseedSketch: PRESEED_SKETCH });

  return page;
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 200) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server failed to respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log(`Starting Vite dev server directly on port ${PORT}...`);
  const server = spawn('node', ['./node_modules/vite/bin/vite.js', '--port', String(PORT), '--no-open'], {
    stdio: 'ignore'
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`Vite server running at ${BASE_URL}`);

    console.log('Launching browser for affected screenshots capture...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox', '--disable-dev-shm-usage']
    });

    try {
      for (const vp of WIDTHS) {
        for (const theme of THEMES) {
          console.log(`\n=== Processing Viewport ${vp.name}px | Theme: ${theme} ===`);
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1,
            colorScheme: theme,
            permissions: ['microphone']
          });

          // -------------------------------------------------------------------
          // Screen 5: Asking Screen with a Real Question
          // -------------------------------------------------------------------
          await withTimeout(async () => {
            const screenId = '05-asking';
            const page = await initPage(context, vp.width, vp.height, theme);
            try {
              await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
              await page.waitForSelector('#start-topic', { timeout: 8000 });
              await page.click('#start-topic');
              await page.waitForSelector('.si-question-title', { timeout: 8000 });
              await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 8000 });
              await page.waitForTimeout(200);

              // Move mouse away to avoid sticky hover from previous click
              await page.mouse.move(0, 0);
              await page.waitForTimeout(100);

              const fileName = `${screenId}-${vp.name}-${theme}.png`;
              const filePath = path.join(OUT_DIR, fileName);
              await page.screenshot({ path: filePath, fullPage: false });
              console.log(`✓ Re-captured ${fileName}`);
            } finally {
              await page.close().catch(() => {});
            }
          }, PAGE_TIMEOUT_MS, `Screen 05 [${vp.name}px, ${theme}]`);

          // -------------------------------------------------------------------
          // Screen 13: System Design Canvas on System-Design Question
          // -------------------------------------------------------------------
          await withTimeout(async () => {
            const screenId = '13-system-design-canvas';
            const page = await initPage(context, vp.width, vp.height, theme);
            try {
              await page.goto(`${BASE_URL}/interview/q/repo__rag__design-rag-over-company-docs`, { waitUntil: 'domcontentloaded' });
              await page.waitForSelector('#start-topic', { timeout: 8000 });
              await page.click('#start-topic');
              await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 8000 });
              await page.click('button:has-text("Skip to answering")');
              await page.waitForSelector('.sd-canvas', { timeout: 8000 });
              await page.waitForSelector('.sd-board', { timeout: 8000 });
              const boxBtn = page.locator('.sd-tools button:has-text("Queue")');
              if (await boxBtn.count() > 0) {
                await boxBtn.click();
              }
              await page.locator('.sd-canvas').first().scrollIntoViewIfNeeded();
              await page.waitForTimeout(200);

              // Move mouse away
              await page.mouse.move(0, 0);
              await page.waitForTimeout(100);

              const fileName = `${screenId}-${vp.name}-${theme}.png`;
              const filePath = path.join(OUT_DIR, fileName);
              await page.screenshot({ path: filePath, fullPage: false });
              console.log(`✓ Re-captured ${fileName}`);
            } finally {
              await page.close().catch(() => {});
            }
          }, PAGE_TIMEOUT_MS, `Screen 13 [${vp.name}px, ${theme}]`);

          await context.close().catch(() => {});
        }
      }
    } finally {
      console.log('Closing browser...');
      await browser.close().catch(() => {});
    }
  } finally {
    console.log('Stopping Vite dev server...');
    server.kill('SIGTERM');
    setTimeout(() => {
      try { server.kill('SIGKILL'); } catch {}
    }, 500);
  }

  // -------------------------------------------------------------------------
  // Verify all 144 images and compute hash uniqueness
  // -------------------------------------------------------------------------
  console.log('\nVerifying SHA-256 hash uniqueness across all 144 images...');
  const allFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`Total PNG images in ${OUT_DIR}: ${allFiles.length}`);
  if (allFiles.length !== 144) {
    throw new Error(`Expected exactly 144 screenshots, found ${allFiles.length}`);
  }

  const hashMap = new Map();
  for (const f of allFiles) {
    const fullPath = path.join(OUT_DIR, f);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    if (hashMap.has(hash)) {
      throw new Error(`Duplicate hash detected between ${f} and ${hashMap.get(hash)}! Hash: ${hash}`);
    }
    hashMap.set(hash, f);
  }
  console.log(`✓ All 144 screenshots have 100% unique SHA-256 hashes! Zero duplicates.`);
}

run().then(() => {
  console.log('Recapture completed successfully.');
  process.exit(0);
}).catch((err) => {
  console.error('\nExecution failed:', err);
  process.exit(1);
});
