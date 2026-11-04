import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = 4173;

const AUDIO_WAV = fs.existsSync(path.resolve(__dirname, 'speech-benchmarks', 'audio', 'speech_with_pauses.wav'))
  ? path.resolve(__dirname, 'speech-benchmarks', 'audio', 'speech_with_pauses.wav')
  : '/tmp/speech_with_pauses.wav';

const KNOWN_REFERENCE_TEXT = fs.existsSync(path.resolve(__dirname, 'speech-benchmarks', 'audio', 'reference.txt'))
  ? fs.readFileSync(path.resolve(__dirname, 'speech-benchmarks', 'audio', 'reference.txt'), 'utf-8').trim()
  : 'He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.';

if (!fs.existsSync(AUDIO_WAV)) {
  throw new Error(`Benchmark audio missing at ${AUDIO_WAV}`);
}

// Minimal static HTTP server configured strictly with NO COOP/COEP headers (matching GitHub Pages)
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
  '.wav': 'audio/wav',
};

let server;
let isViteServer = false;

if (fs.existsSync(path.join(DIST, 'index.html'))) {
  server = http.createServer((req, res) => {
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
    // Strictly zero COOP/COEP headers
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server running at http://localhost:${PORT} with ZERO COOP/COEP headers`);
} else {
  server = await createViteServer({
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  isViteServer = true;
  console.log(`Speech test Vite server running at http://localhost:${PORT} with ZERO COOP/COEP headers`);
}

const results = {
  runTimestamp: new Date().toISOString(),
  audioCaptureWav: AUDIO_WAV,
  knownReferenceText: KNOWN_REFERENCE_TEXT,
  notes:
    'Evaluated on local static server with NO COOP/COEP headers. Chrome fake-audio fed with ' +
    AUDIO_WAV +
    ' (22.34s speech with 2.2s, 3.2s, and 6.5s pauses).',
  crossOriginIsolatedState: false,
  mobileOverflowCheck375px: null,
  noIndexCheck: null,
  options: {},
  pauseAnalysis: null,
  copyResultsButtonWorks: false,
};

let hasFailure = false;
const failureReasons = [];

try {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${AUDIO_WAV}`,
      '--allow-file-access',
    ],
  });

  // 1. Mobile responsive 375px check
  console.log('Testing mobile width 375px responsiveness on /lab/speech-test...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`http://localhost:${PORT}/lab/speech-test`, { waitUntil: 'networkidle' });

  const overflow = await mobilePage.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const clientW = docEl.clientWidth;
    const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
    return {
      clientWidth: clientW,
      scrollWidth: scrollW,
      hasHorizontalOverflow: scrollW > clientW,
    };
  });
  console.log('Mobile 375px width check:', overflow);
  results.mobileOverflowCheck375px = { ...overflow, pass: !overflow.hasHorizontalOverflow };
  if (overflow.hasHorizontalOverflow) {
    hasFailure = true;
    failureReasons.push(`Horizontal overflow detected at 375px: scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth})`);
  }

  // 2. Check noindex, nofollow
  console.log('Testing robots meta tag for noindex, nofollow...');
  const robotsMeta = await mobilePage.evaluate(() => {
    return document.querySelector('meta[name="robots"]')?.getAttribute('content');
  });
  console.log('Robots meta tag:', robotsMeta);
  results.noIndexCheck = { robotsMeta, pass: robotsMeta === 'noindex, nofollow' };
  if (robotsMeta !== 'noindex, nofollow') {
    hasFailure = true;
    failureReasons.push(`Robots meta tag expected "noindex, nofollow", received "${robotsMeta}"`);
  }

  await mobileContext.close();

  // 3. Desktop live speech and VAD evaluation
  console.log('Opening desktop context for streaming speech tests...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['microphone'],
  });
  const page = await desktopContext.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('[vite]') && !text.includes('download')) {
      console.log(`[Browser Console ${msg.type()}]`, text);
    }
  });

  await page.goto(`http://localhost:${PORT}/lab/speech-test`, { waitUntil: 'networkidle' });

  // Verify server is truly without COOP/COEP
  results.crossOriginIsolatedState = await page.evaluate(() => window.crossOriginIsolated);
  console.log('window.crossOriginIsolated on server without custom headers:', results.crossOriginIsolatedState);
  if (results.crossOriginIsolatedState) {
    hasFailure = true;
    failureReasons.push('Expected window.crossOriginIsolated to be false on server without COOP/COEP headers.');
  }

  // Switch to LibriSpeech benchmark reference paragraph
  await page.click('[data-testid="select-paragraph-benchmark"]');
  await page.waitForTimeout(300);

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
        updateInterval: getVal('metric-update-interval'),
        wordRevisions: getVal('metric-word-revisions'),
        transcript,
        alertNotice: errorEl?.textContent?.trim() || null,
      };
    });
  };

  // Test Option 1: Browser Speech
  console.log('Testing Option 1: Browser Speech...');
  const startBtn1 = await page.waitForSelector('[data-testid="button-start-test"]:not([disabled])');
  await startBtn1.click();
  await page.waitForTimeout(3000);
  const stopBtn1 = await page.$('[data-testid="button-stop-test"]');
  if (stopBtn1) await stopBtn1.click();
  await page.waitForTimeout(500);

  const opt1Metrics = await extractMetrics();
  opt1Metrics.note =
    'Option 1 (Web Speech API) cannot connect to Google speech cloud servers in headless Chrome; testable only on localhost with interactive browser & microphone.';
  console.log('Option 1 metrics:', opt1Metrics);
  results.options['option_1_browser_speech'] = opt1Metrics;

  // Test Option 2: Moonshine Tiny Multi-threaded (Should report COOP/COEP guard)
  console.log('Testing Option 2: Moonshine Tiny (Multi-threaded WASM)...');
  await page.click('button:has-text("2. Moonshine Tiny")');
  await page.waitForTimeout(800);
  const opt2Metrics = await extractMetrics();
  console.log('Option 2 metrics (without COOP/COEP):', opt2Metrics);
  results.options['option_2_moonshine_tiny'] = opt2Metrics;

  // Test Option 3: sherpa-onnx (Should report COOP/COEP guard)
  console.log('Testing Option 3: sherpa-onnx...');
  await page.click('button:has-text("3. sherpa-onnx")');
  await page.waitForTimeout(800);
  const opt3Metrics = await extractMetrics();
  console.log('Option 3 metrics (without COOP/COEP):', opt3Metrics);
  results.options['option_3_sherpa_onnx'] = opt3Metrics;

  // Test Option 4: Moonshine Tiny, single-threaded (The primary hero option)
  console.log('Testing Option 4: Moonshine Tiny (Single-Threaded, No COOP/COEP)...');
  await page.click('button:has-text("4. Moonshine Tiny")');
  await page.click('[data-testid="select-paragraph-benchmark"]');
  console.log('Waiting for single-threaded Moonshine model to load and ready in Web Worker...');
  await page.waitForSelector('[data-testid="button-start-test"]:not([disabled])', { timeout: 45000 });
  await page.waitForTimeout(500);

  const startBtn4 = await page.$('[data-testid="button-start-test"]');
  if (!startBtn4) throw new Error('Start button not found for Option 4');
  await startBtn4.click();

  console.log('Option 4 streaming audio (waiting 24 seconds for speech and pauses)...');
  await page.waitForTimeout(24000);

  const stopBtn4 = await page.$('[data-testid="button-stop-test"]');
  if (stopBtn4) await stopBtn4.click();
  await page.waitForTimeout(1000);

  const opt4Metrics = await extractMetrics();
  console.log('Option 4 metrics:', opt4Metrics);
  results.options['option_4_moonshine_single'] = opt4Metrics;

  // Assertions for Option 4:
  if (!opt4Metrics.transcript || opt4Metrics.transcript.includes('Click “Start Microphone Test”') || opt4Metrics.transcript.trim() === '') {
    hasFailure = true;
    failureReasons.push('Option 4 (Moonshine Single-Threaded) transcript is empty or shows placeholder text.');
  }
  if (!opt4Metrics.wer || opt4Metrics.wer === '—') {
    hasFailure = true;
    failureReasons.push('Option 4 (Moonshine Single-Threaded) WER was not computed.');
  }
  if (!opt4Metrics.firstWordLag || opt4Metrics.firstWordLag === '—') {
    hasFailure = true;
    failureReasons.push('Option 4 (Moonshine Single-Threaded) firstWordLag is empty.');
  }

  // Extract Pause Analysis after Option 4 run
  console.log('Extracting End-of-Answer VAD Pause Thresholds...');
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

  if (!pauseMetrics.pauseSummary || pauseMetrics.pauseSummary.trim() === '') {
    hasFailure = true;
    failureReasons.push('End-of-answer VAD pause thresholds summary was empty.');
  }

  // Test Mode B (Free Answer Prompt)
  console.log('Testing Mode B: Spoken Answer Prompt...');
  await page.click('button:has-text("Mode B: Spoken Answer Prompt")');
  await page.waitForTimeout(500);
  const promptText = await page.evaluate(() => {
    return document.querySelector('section div[style*="font-style: italic"], section div[style*="font-weight: 600"]')?.textContent?.trim();
  });
  results.freeAnswerPrompt = promptText;
  if (!promptText || promptText.trim() === '') {
    hasFailure = true;
    failureReasons.push('Mode B free answer prompt was empty.');
  }

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
  hasFailure = true;
  failureReasons.push(`Runtime error: ${err.message}`);
} finally {
  if (isViteServer) {
    await server.close();
  } else {
    server.close();
  }
}

fs.writeFileSync('/tmp/speech-test-results.json', JSON.stringify(results, null, 2));
console.log('Results written to /tmp/speech-test-results.json');
console.log(JSON.stringify(results, null, 2));

if (hasFailure) {
  console.error('\n❌ SPEECH VERIFICATION HARNESS FAILED:');
  failureReasons.forEach((r, idx) => console.error(`  ${idx + 1}. ${r}`));
  process.exit(1);
} else {
  console.log('\n✅ SPEECH VERIFICATION HARNESS PASSED all assertions with zero COOP/COEP headers!');
  process.exit(0);
}
