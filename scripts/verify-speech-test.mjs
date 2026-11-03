import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '..', 'dist');
const PUBLIC_SHERPA = path.resolve(__dirname, '..', 'public', 'sherpa-onnx');
const PORT = 4173;

const AUDIO_WAV = '/tmp/speech_with_pauses.wav';
const KNOWN_REFERENCE_TEXT =
  'He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.';

// 1. Ensure test audio with real speech and silences of 2.2s, 3.2s, and 6.5s exists
if (!fs.existsSync(AUDIO_WAV)) {
  console.log('Generating test audio with speech and silences at', AUDIO_WAV);
  const srcWav = '/tmp/speech.wav';
  if (!fs.existsSync(srcWav)) {
    throw new Error(`Base speech audio missing at ${srcWav}.`);
  }
  execSync(`python3 -c "
import wave, numpy as np
with wave.open('${srcWav}', 'rb') as w:
    rate = w.getframerate()
    samples = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)

p1 = samples[:int(rate * 2.4)]
silence_2s = np.zeros(int(rate * 2.2), dtype=np.int16)
p2 = samples[int(rate * 2.4):int(rate * 6.0)]
silence_3s = np.zeros(int(rate * 3.2), dtype=np.int16)
p3 = samples[int(rate * 6.0):]
silence_6s = np.zeros(int(rate * 6.5), dtype=np.int16)

combined = np.concatenate([p1, silence_2s, p2, silence_3s, p3, silence_6s])
with wave.open('${AUDIO_WAV}', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(combined.tobytes())
"`);
}

// 2. Static HTTP server
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

  // Serve sherpa assets directly from public/sherpa-onnx if requested
  if (pathname.startsWith('/sherpa-onnx/')) {
    const filename = pathname.replace('/sherpa-onnx/', '');
    const filePath = path.join(PUBLIC_SHERPA, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

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
  audioCaptureWav: AUDIO_WAV,
  knownReferenceText: KNOWN_REFERENCE_TEXT,
  notes: 'Measurements conducted with headless Chrome --use-fake-device-for-media-stream and --use-file-for-fake-audio-capture=' + AUDIO_WAV + ' (22.34s speech with 2.2s, 3.2s, and 6.5s pauses). Real audio evaluated against reference LibriSpeech sentence.',
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
  if (scrollWidth > 375) {
    hasFailure = true;
    failureReasons.push(`Mobile horizontal overflow detected: scrollWidth=${scrollWidth} > 375`);
  }
  await mobileContext.close();

  // --- Desktop Testing ---
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

  // Select LibriSpeech benchmark reference text so WER is calculated against the test audio
  const benchmarkParaBtn = await page.$('[data-testid="select-paragraph-benchmark"]');
  if (benchmarkParaBtn) {
    await benchmarkParaBtn.click();
    await page.waitForTimeout(200);
  }

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
  console.log('Testing Option 1: Browser Speech Recognition (Web Speech API)...');
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

  // Test Option 2: Moonshine Tiny
  console.log('Testing Option 2: Moonshine Tiny...');
  await page.click('button:has-text("2. Moonshine Tiny")');
  console.log('Waiting for Moonshine model to load and ready...');
  await page.waitForSelector('[data-testid="button-start-test"]:not([disabled])', { timeout: 45000 });
  await page.waitForTimeout(500);

  const startBtn2 = await page.$('[data-testid="button-start-test"]');
  if (!startBtn2) throw new Error('Start button not found for Option 2');
  await startBtn2.click();

  console.log('Option 2 streaming audio (waiting 24 seconds for speech and pauses)...');
  await page.waitForTimeout(24000);

  const stopBtn2 = await page.$('[data-testid="button-stop-test"]');
  if (stopBtn2) await stopBtn2.click();
  await page.waitForTimeout(1000);

  const opt2Metrics = await extractMetrics();
  console.log('Option 2 metrics:', opt2Metrics);
  results.options['option_2_moonshine_tiny'] = opt2Metrics;

  // Assertions for Option 2
  if (!opt2Metrics.transcript || opt2Metrics.transcript.includes('Click “Start Microphone Test”')) {
    hasFailure = true;
    failureReasons.push('Option 2 (Moonshine) transcript is empty or shows placeholder text.');
  }
  if (!opt2Metrics.wer || opt2Metrics.wer === '—') {
    hasFailure = true;
    failureReasons.push('Option 2 (Moonshine) WER was not computed.');
  }
  if (!opt2Metrics.firstWordLag || opt2Metrics.firstWordLag === '—') {
    hasFailure = true;
    failureReasons.push('Option 2 (Moonshine) firstWordLag is empty.');
  }

  // Extract Pause Analysis after Moonshine run
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

  if (pauseMetrics.pauseSummary?.includes('1.5s was not reached') && pauseMetrics.pauseSummary?.includes('2.5s was not reached')) {
    hasFailure = true;
    failureReasons.push('End-of-answer VAD pause thresholds were not detected.');
  }

  // Test Option 3: sherpa-onnx
  console.log('Testing Option 3: sherpa-onnx...');
  await page.click('button:has-text("3. sherpa-onnx")');
  console.log('Waiting for sherpa-onnx model to load and ready...');
  await page.waitForSelector('[data-testid="button-start-test"]:not([disabled])', { timeout: 45000 });
  await page.waitForTimeout(500);

  const startBtn3 = await page.$('[data-testid="button-start-test"]');
  if (!startBtn3) throw new Error('Start button not found for Option 3');
  await startBtn3.click();

  console.log('Option 3 streaming audio (waiting 24 seconds for speech and pauses)...');
  await page.waitForTimeout(24000);

  const stopBtn3 = await page.$('[data-testid="button-stop-test"]');
  if (stopBtn3) await stopBtn3.click();
  await page.waitForTimeout(1000);

  const opt3Metrics = await extractMetrics();
  console.log('Option 3 metrics:', opt3Metrics);
  results.options['option_3_sherpa_onnx'] = opt3Metrics;

  // Assertions for Option 3
  if (!opt3Metrics.transcript || opt3Metrics.transcript.includes('Click “Start Microphone Test”')) {
    hasFailure = true;
    failureReasons.push('Option 3 (sherpa-onnx) transcript is empty or shows placeholder text.');
  }
  if (!opt3Metrics.wer || opt3Metrics.wer === '—') {
    hasFailure = true;
    failureReasons.push('Option 3 (sherpa-onnx) WER was not computed.');
  }
  if (!opt3Metrics.firstWordLag || opt3Metrics.firstWordLag === '—') {
    hasFailure = true;
    failureReasons.push('Option 3 (sherpa-onnx) firstWordLag is empty.');
  }

  // Test Mode B (Free Answer Prompt)
  console.log('Testing Mode B: Spoken Answer Prompt...');
  await page.click('button:has-text("Mode B: Spoken Answer Prompt")');
  await page.waitForTimeout(500);
  const promptText = await page.evaluate(() => {
    return document.querySelector('section div[style*="font-style: italic"], section div[style*="font-weight: 600"]')?.textContent?.trim();
  });
  results.freeAnswerPrompt = promptText;

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
  server.close();
}

fs.writeFileSync('/tmp/speech-test-results.json', JSON.stringify(results, null, 2));
console.log('Results written to /tmp/speech-test-results.json');
console.log(JSON.stringify(results, null, 2));

if (hasFailure) {
  console.error('\n❌ VERIFICATION HARNESS FAILED with errors:');
  failureReasons.forEach((r, idx) => console.error(`  ${idx + 1}. ${r}`));
  process.exit(1);
} else {
  console.log('\n✅ VERIFICATION HARNESS PASSED all assertions with real speech and pause measurements!');
  process.exit(0);
}
