import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = 4173;

// Minimal static server
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '/lab/speech-test') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST, pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Server running at http://localhost:${PORT}`);

const results = {
  runTimestamp: new Date().toISOString(),
  audioCaptureWav: '/tmp/speech.wav',
  notes: 'Measurements conducted with headless Chrome --use-fake-device-for-media-stream and --use-file-for-fake-audio-capture=/tmp/speech.wav (10.44s speech audio). These are automated test harness numbers, not a real physical microphone test.',
  mobileOverflowCheck375px: null,
  noIndexCheck: null,
  options: {},
};

try {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-file-for-fake-audio-capture=/tmp/speech.wav',
      '--autoplay-policy=no-user-gesture-required',
      '--enable-features=SharedArrayBuffer',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  // --- Mobile 375px Test ---
  console.log('Testing mobile width 375px responsiveness...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    permissions: ['microphone'],
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`http://localhost:${PORT}/lab/speech-test`, { waitUntil: 'networkidle' });

  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  const robotsMeta = await mobilePage.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content'));

  console.log(`Mobile: clientWidth=${clientWidth}, scrollWidth=${scrollWidth}, robots=${robotsMeta}`);
  results.mobileOverflowCheck375px = {
    clientWidth,
    scrollWidth,
    hasHorizontalOverflow: scrollWidth > clientWidth,
    pass: scrollWidth <= 375,
  };
  results.noIndexCheck = {
    robotsMeta,
    pass: robotsMeta?.includes('noindex'),
  };
  await mobileContext.close();

  // --- Desktop Testing & Audio Stream ---
  console.log('Testing desktop live speech with fake audio device...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['microphone', 'clipboard-read', 'clipboard-write'],
  });
  const page = await desktopContext.newPage();

  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => console.log(`[Browser PageError]`, err));

  await page.goto(`http://localhost:${PORT}/lab/speech-test`, { waitUntil: 'networkidle' });

  const extractMetrics = async () => {
    return await page.evaluate(() => {
      const getVal = (id) => document.querySelector(`[data-testid="${id}"] strong`)?.textContent?.trim() ?? '—';
      const errorEl = document.querySelector('[role="alert"]');
      const transcript = document.querySelector('[data-testid="live-transcript"]')?.textContent?.trim() ?? '';
      return {
        firstWordLag: getVal('metric-first-word'),
        speechLag: getVal('metric-speech-lag'),
        downloadBytes: getVal('metric-download-bytes'),
        loadTime: getVal('metric-load-time'),
        peakHeap: getVal('metric-peak-heap'),
        wer: getVal('metric-wer'),
        transcript,
        alertNotice: errorEl?.textContent?.trim() || null,
      };
    });
  };

  // Test Option 1: Browser Speech
  console.log('Testing Option 1: Browser Speech...');
  const startBtn1 = await page.waitForSelector('[data-testid="button-start-test"]');
  await startBtn1.click();
  await page.waitForTimeout(4000); // Wait for speech stream processing

  const stopBtn1 = await page.$('[data-testid="button-stop-test"]');
  if (stopBtn1) {
    console.log('Option 1 active, stopping mic...');
    await stopBtn1.click();
  }
  await page.waitForTimeout(500);

  const opt1Metrics = await extractMetrics();
  console.log('Option 1 metrics:', opt1Metrics);
  results.options['option_1_browser_speech'] = opt1Metrics;

  // Test Option 2: Moonshine Tiny
  console.log('Testing Option 2: Moonshine Tiny...');
  await page.click('button:has-text("2. Moonshine Tiny")');
  await page.waitForTimeout(2000);

  const startBtn2 = await page.$('[data-testid="button-start-test"]');
  if (startBtn2) {
    await startBtn2.click();
    await page.waitForTimeout(4000);
    const stopBtn2 = await page.$('[data-testid="button-stop-test"]');
    if (stopBtn2) await stopBtn2.click();
  }
  await page.waitForTimeout(500);

  const opt2Metrics = await extractMetrics();
  console.log('Option 2 metrics:', opt2Metrics);
  results.options['option_2_moonshine_tiny'] = opt2Metrics;

  // Test Option 3: sherpa-onnx
  console.log('Testing Option 3: sherpa-onnx...');
  await page.click('button:has-text("3. sherpa-onnx")');
  await page.waitForTimeout(2000);

  const startBtn3 = await page.$('[data-testid="button-start-test"]');
  if (startBtn3) {
    await startBtn3.click();
    await page.waitForTimeout(4000);
    const stopBtn3 = await page.$('[data-testid="button-stop-test"]');
    if (stopBtn3) await stopBtn3.click();
  }
  await page.waitForTimeout(500);

  const opt3Metrics = await extractMetrics();
  console.log('Option 3 metrics:', opt3Metrics);
  results.options['option_3_sherpa_onnx'] = opt3Metrics;

  // Test Mode B (Free Answer Prompt)
  console.log('Testing Mode B: Spoken Answer Prompt...');
  await page.click('button:has-text("Mode B: Spoken Answer Prompt")');
  await page.waitForTimeout(500);
  const promptText = await page.evaluate(() => {
    return document.querySelector('section div[style*="font-style: italic"]')?.textContent?.trim();
  });
  results.freeAnswerPrompt = promptText;

  // Test End-of-Answer VAD Pause Thresholds
  console.log('Testing End-of-Answer VAD Pause Thresholds...');
  const pauseMetrics = await page.evaluate(() => {
    const summary = document.querySelector('section:last-of-type div[style*="surface-alt"]')?.textContent?.trim();
    const rows = Array.from(document.querySelectorAll('section:last-of-type div[style*="border: 1px solid"]')).map(el => el.textContent?.trim());
    return {
      pauseSummary: summary,
      thresholdBoxes: rows,
    };
  });
  console.log('Pause metrics:', pauseMetrics);
  results.pauseAnalysis = pauseMetrics;

  // Test "Copy Results (JSON)" button
  console.log('Testing Copy Results (JSON) button...');
  const copyBtn = await page.$('button:has-text("Copy Results (JSON)")');
  if (copyBtn) {
    await copyBtn.click();
    await page.waitForTimeout(300);
    const copiedBtn = await page.$('button:has-text("Copied")');
    results.copyResultsButtonWorks = !!copiedBtn;
  }

  await browser.close();
} catch (err) {
  console.error('Test run error:', err);
  results.error = err.message;
} finally {
  server.close();
}

fs.writeFileSync('/tmp/speech-test-results.json', JSON.stringify(results, null, 2));
console.log('Results written to /tmp/speech-test-results.json');
console.log(JSON.stringify(results, null, 2));
