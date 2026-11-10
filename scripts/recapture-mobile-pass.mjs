import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:5202';
const OUT_DIR = path.resolve('docs/evidence/interview/mobile-pass');

// Clean and recreate output directory
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const WIDTHS = [
  { name: '320', width: 320, height: 640 },
  { name: '375', width: 375, height: 667 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'];

// Pre-seed storage state for attempts so earlier attempts are present
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

async function initPage(context, width, height, theme) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Add stubs so voice and judge workers do not download 100MB+ models or freeze memory
  await page.addInitScript(({ theme, preseedAttempts, preseedSketch }) => {
    // Theme token setup
    document.documentElement.setAttribute('data-theme', theme);

    // Local storage setup
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

    // Stub heavy AI workers
    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      constructor(url, options) {
        super();
        const urlStr = String(url);
        if (!/(mockInterviewWorker|moonshineSingleThreadWorker|kokoroWorker)/.test(urlStr)) {
          return new RealWorker(url, options);
        }
      }
      postMessage({ id, op, payload, text }) {
        const reply = (data) => queueMicrotask(() => {
          const event = new MessageEvent('message', { data: { id, ...data } });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        });

        if (op === 'init') {
          reply({ type: 'init_done', device: 'wasm', loadTimeMs: 1 });
        } else if (op === 'loadJudge') {
          reply({ ok: true, result: true });
        } else if (op === 'embed') {
          reply({ ok: true, result: (payload?.texts || []).map(() => [1, 0, 0]) });
        } else if (op === 'nli') {
          reply({
            ok: true,
            result: (payload?.pairs || []).map(() => ({ entails: 1, conflicts: 0 }))
          });
        } else if (['transcribe', 'commit', 'batch'].includes(op)) {
          reply({
            type: op === 'transcribe' ? 'result' : `${op}_result`,
            text: 'We evaluate cosine similarity thresholds against historical query log pairs.',
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

// Hash map for duplicate detection
const hashMap = new Map();

function assertAndRecordScreenshot(filePath, screenName) {
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hashMap.has(hash)) {
    const existing = hashMap.get(hash);
    throw new Error(
      `FATAL: Byte-identical screenshot detected!\n` +
      `File "${path.basename(filePath)}" equals "${path.basename(existing)}"\n` +
      `Hash: ${hash}\n` +
      `The screen transition did not take effect!`
    );
  }
  hashMap.set(hash, filePath);
}

async function run() {
  console.log('Launching browser for mobile pass evidence capture...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const capturedScreens = new Set();

  try {
    for (const vp of WIDTHS) {
      for (const theme of THEMES) {
        console.log(`\n=== Capturing Viewport ${vp.name}px | Theme: ${theme} ===`);
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
          permissions: ['microphone']
        });

        // -------------------------------------------------------------------
        // Screen 1: Topic Graph
        // -------------------------------------------------------------------
        {
          const screenId = '01-topic-graph';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('.si-map', { timeout: 10000 });
          await page.waitForSelector('.si-node', { timeout: 10000 });
          await page.locator('.si-map').scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 2: Topic List
        // -------------------------------------------------------------------
        {
          const screenId = '02-topic-list';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('.si-list .si-list-item', { timeout: 10000 });
          await page.locator('.si-list').scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 3: Search and Filters
        // -------------------------------------------------------------------
        {
          const screenId = '03-search-filters';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#interview-search', { timeout: 10000 });
          await page.fill('#interview-search', 'transformer');
          await page.waitForTimeout(150);
          await page.locator('.si-search-wrap').scrollIntoViewIfNeeded();

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 4: Today's 10 and Readiness
        // -------------------------------------------------------------------
        {
          const screenId = '04-today-readiness';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('.si-learning-section', { timeout: 10000 });
          await page.waitForSelector('.si-role-readiness', { timeout: 10000 });
          await page.locator('.si-learning-section').first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 5: Asking Screen with a Real Question
        // -------------------------------------------------------------------
        {
          const screenId = '05-asking';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('.si-question-title', { timeout: 10000 });
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 6: Answering by Voice
        // -------------------------------------------------------------------
        {
          const screenId = '06-answering-voice';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('.si-speaker-answering', { timeout: 10000 });
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(200);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 7: Answering by Typing
        // -------------------------------------------------------------------
        {
          const screenId = '07-answering-typing';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('.si-speaker-answering', { timeout: 10000 });
          await page.click('button:has-text("Type instead")');
          await page.waitForSelector('textarea.si-answer-box', { timeout: 10000 });
          await page.fill('textarea.si-answer-box', 'We tune cosine similarity thresholds using ROC curves and query paraphrase logs to balance cache hit rate against semantic false positives.');
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 8: Model Answer with Checklist
        // -------------------------------------------------------------------
        {
          const screenId = '08-model-answer';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(600);
          await page.click('#done');
          await page.waitForSelector('#model-answer', { timeout: 10000 });
          await page.waitForSelector('.si-check', { timeout: 10000 });
          await page.locator('#model-answer').scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 9: Self-Rating
        // -------------------------------------------------------------------
        {
          const screenId = '09-self-rating';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(600);
          await page.click('#done');
          await page.waitForSelector('.si-self-rating', { timeout: 10000 });
          const gotItBtn = page.locator('.si-self-rating button:has-text("Got it")');
          await gotItBtn.waitFor({ state: 'visible', timeout: 5000 });
          await gotItBtn.click();
          await page.waitForSelector('.si-self-rating button[aria-pressed="true"]', { timeout: 5000 });
          await page.waitForSelector('.si-self-rating p.si-status', { timeout: 5000 });
          await page.locator('.si-self-rating').scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 10: Delivery Row Measurements
        // -------------------------------------------------------------------
        {
          const screenId = '10-delivery-row';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(800);
          await page.click('#done');
          await page.waitForSelector('.si-delivery', { timeout: 10000 });
          await page.locator('.si-delivery').first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 11: Follow-Up Spoken / Typed Flow
        // -------------------------------------------------------------------
        {
          const screenId = '11-follow-up';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(600);
          await page.click('#done');
          await page.waitForSelector('.si-follow-up button:has-text("Answer a follow-up")', { timeout: 10000 });
          await page.click('.si-follow-up button:has-text("Answer a follow-up")');
          await page.waitForSelector('.si-follow-up-question', { timeout: 10000 });
          const typeBtn = page.locator('.si-follow-up button:has-text("Type follow-up answer")');
          if (await typeBtn.count() > 0) {
            await typeBtn.click();
            await page.waitForSelector('.si-follow-up textarea.si-answer-box', { timeout: 10000 });
            await page.fill('.si-follow-up textarea.si-answer-box', 'General embedding models struggle with negation because negative and positive sentences share overlapping lexical context.');
          }
          await page.locator('.si-follow-up').first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 12: Attempt History
        // -------------------------------------------------------------------
        {
          const screenId = '12-attempt-history';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__cache-semantic-vector-similarity-thresholds`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('#done', { timeout: 10000 });
          await page.waitForTimeout(600);
          await page.click('#done');
          await page.waitForSelector('section[aria-label="Earlier attempts"] details.si-attempt', { timeout: 10000 });
          const detailsEl = page.locator('section[aria-label="Earlier attempts"] details.si-attempt').first();
          await detailsEl.locator('summary').click();
          await page.waitForSelector('section[aria-label="Earlier attempts"] details.si-attempt[open]', { timeout: 5000 });
          await detailsEl.scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 13: System Design Canvas on System-Design Question
        // -------------------------------------------------------------------
        {
          const screenId = '13-system-design-canvas';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/repo__rag__design-rag-over-company-docs`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('button:has-text("Skip to answering")', { timeout: 10000 });
          await page.click('button:has-text("Skip to answering")');
          await page.waitForSelector('.sd-canvas', { timeout: 10000 });
          await page.waitForSelector('.sd-board', { timeout: 10000 });
          const boxBtn = page.locator('.sd-tools button:has-text("Queue")');
          if (await boxBtn.count() > 0) {
            await boxBtn.click();
          }
          await page.locator('.sd-canvas').first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 14: Coding Editor Overlay on Coding Question
        // -------------------------------------------------------------------
        {
          const screenId = '14-coding-overlay';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/q/senior__implement-attention`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#start-topic', { timeout: 10000 });
          await page.click('#start-topic');
          await page.waitForSelector('#open-code-editor-asking', { timeout: 10000 });
          await page.click('#open-code-editor-asking');
          await page.waitForSelector('.si-code-overlay', { timeout: 10000 });
          await page.waitForTimeout(300);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 15: Timed Mock Setup
        // -------------------------------------------------------------------
        {
          const screenId = '15-timed-mock-setup';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/mock`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#timed-mock-heading', { timeout: 10000 });
          await page.waitForSelector('button.nm-mock-btn-primary:has-text("mock interview")', { timeout: 10000 });
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 16: Timed Mock Active Interview
        // -------------------------------------------------------------------
        {
          const screenId = '16-timed-mock-active';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/mock`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('button.nm-mock-btn-primary:has-text("mock interview")', { timeout: 10000 });
          await page.click('button.nm-mock-btn-primary:has-text("mock interview")');
          await page.waitForSelector('.nm-mock-active-header', { timeout: 10000 });
          await page.waitForSelector('#active-question-heading', { timeout: 10000 });
          await page.waitForTimeout(200);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 17: Timed Mock Scorecard
        // -------------------------------------------------------------------
        {
          const screenId = '17-timed-mock-scorecard';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview/mock`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('button.nm-mock-btn-primary:has-text("mock interview")', { timeout: 10000 });
          await page.click('button.nm-mock-btn-primary:has-text("mock interview")');
          await page.waitForSelector('.nm-mock-active-header', { timeout: 10000 });

          // Skip questions to finish the mock interview (30 min mock = 5 questions)
          for (let q = 0; q < 5; q++) {
            const skipBtn = page.locator('button.nm-mock-btn-secondary:has-text("Skip question")');
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            await page.waitForTimeout(100);
          }

          await page.waitForSelector('#scorecard-heading', { timeout: 10000 });
          await page.waitForSelector('.nm-mock-summary-stats', { timeout: 10000 });
          await page.waitForTimeout(200);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        // -------------------------------------------------------------------
        // Screen 18: Focus Timer in Navbar
        // -------------------------------------------------------------------
        {
          const screenId = '18-focus-timer';
          capturedScreens.add(screenId);
          const page = await initPage(context, vp.width, vp.height, theme);
          await page.goto(`${BASE_URL}/interview`, { waitUntil: 'domcontentloaded' });

          if (vp.width < 768) {
            const toggle = page.locator('button.nm-navbar-primary-toggle');
            await toggle.click();
            await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 5000 });
            const drawerTimerBtn = page.locator('nav[aria-label="Primary"] button.nm-timer-nav-btn');
            await drawerTimerBtn.click();
          } else {
            const navTimerBtn = page.locator('.nm-navbar-nav button.nm-timer-nav-btn');
            await navTimerBtn.click();
          }

          await page.waitForSelector('.nm-timer-popover', { timeout: 10000 });
          await page.waitForTimeout(150);

          const fileName = `${screenId}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          assertAndRecordScreenshot(filePath, screenId);
          console.log(`✓ Captured ${fileName}`);
          await page.close();
        }

        await context.close();
      }
    }

    console.log(`\n=================================================`);
    console.log(`Successfully captured ${hashMap.size} unique screenshots!`);
    console.log(`All ${capturedScreens.size} screens verified across 4 viewports and 2 themes.`);
    console.log(`Zero duplicate hashes found! Every file has unique image data.`);
    console.log(`=================================================\n`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nCapture failed:', err);
  process.exit(1);
});
