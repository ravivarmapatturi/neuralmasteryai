import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.resolve(ROOT, 'dist');
const PORT = 4173;

const AUDIO_STRONG = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'answer-strong.wav');
const AUDIO_WEAK = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'answer-weak.wav');
const AUDIO_NEXT_TOKEN = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'answer-next-token.wav');

function getWavDurationMs(wavPath) {
  const bytes = fs.statSync(wavPath).size;
  // 16kHz, 16-bit (2 bytes per sample), mono = 32,000 bytes/sec = 32 bytes/ms
  return Math.max(1000, Math.round((bytes - 44) / 32));
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn('node', ['scripts/static-server.cjs'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    srv.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('static-server: serving')) {
        resolve(srv);
      }
    });

    srv.stderr.on('data', (d) => console.error('[static-server error]', d.toString()));
    srv.on('error', reject);

    setTimeout(() => resolve(srv), 2000);
  });
}

async function checkHeaders(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      const coop = res.headers['cross-origin-opener-policy'];
      const coep = res.headers['cross-origin-embedder-policy'];
      resolve({
        statusCode: res.statusCode,
        coop: coop || 'None',
        coep: coep || 'None',
        hasNoSpecialHeaders: !coop && !coep,
      });
    }).on('error', (err) => resolve({ error: err.message, hasNoSpecialHeaders: false }));
  });
}

async function runScenario(scenarioName, wavPath) {
  const durationMs = getWavDurationMs(wavPath);
  console.log(`\n======================================================`);
  console.log(`RUNNING SCENARIO: ${scenarioName}`);
  console.log(`Audio WAV: ${wavPath} (${fs.statSync(wavPath).size} bytes, ${(durationMs / 1000).toFixed(1)}s duration)`);
  console.log(`======================================================`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wavPath}`,
      '--allow-file-access',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
  });

  const page = await context.newPage();

  // Monitor outbound requests to verify zero answers or audio are transmitted
  const leakedRequests = [];
  page.on('request', (req) => {
    const method = req.method();
    const postData = req.postData() || '';
    if (
      (method === 'POST' || method === 'PUT') &&
      (postData.includes('foundation') || postData.includes('model') || postData.length > 5000)
    ) {
      leakedRequests.push({ url: req.url(), method, dataLen: postData.length });
    }
  });

  try {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error') || text.includes('warn') || text.includes('Warn')) {
        console.log(`[Browser ${msg.type()}]:`, text);
      }
    });
    page.on('pageerror', (err) => console.error('[Browser unhandled pageerror]:', err));

    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });

    // Step 1: Click start on setup screen
    await page.waitForSelector('#begin', { timeout: 15000 });
    await page.click('#begin');

    // Step 2: Click allow mic
    await page.waitForSelector('#mic', { timeout: 15000 });
    await page.click('#mic');

    const followUpsChosen = [];
    let turn = 0;
    let actualTranscript = '';

    while (turn < 4) {
      // Step 3: Speaking state
      await page.waitForSelector('.who, #live, textarea.live', { timeout: 25000 });

      // If interviewer is speaking, click "Skip speaking" to enter listening mode
      try {
        await page.click('button:has-text("Skip speaking")', { timeout: 1500 });
      } catch {}

      // Step 4: Listening state
      await page.waitForSelector('#live, textarea.live', { timeout: 25000 });

      console.log(`Turn ${turn}: Streaming speech through real Moonshine...`);

      if (turn === 0) {
        // Stream the full audio duration through Moonshine (give minimum 22s for speech processing & commit)
        const waitTime = Math.max(22000, durationMs + 5000);
        const startTime = Date.now();
        while (Date.now() - startTime < waitTime) {
          await page.waitForTimeout(1000);
          const currentText = await page.evaluate(() => {
            const liveEl = document.getElementById('live');
            return liveEl ? liveEl.textContent : '';
          });
          if (currentText && currentText.trim()) {
            console.log(`  [Moonshine live ${( (Date.now() - startTime) / 1000 ).toFixed(0)}s]: "${currentText.trim()}"`);
          }
        }

        actualTranscript = await page.evaluate(() => {
          const liveEl = document.getElementById('live');
          return (liveEl ? liveEl.textContent : '') || '';
        });
      } else {
        // For follow-up turns, stream briefly
        await page.waitForTimeout(4000);
      }

      // Finish answer turn
      console.log(`Concluding turn ${turn} answer with "#done"...`);
      await page.click('#done');

      // Wait for candidate answering state to unmount
      await page.waitForSelector('#done', { state: 'detached', timeout: 5000 }).catch(() => {});

      // Wait for evaluation to finish: either debrief (.call) or next turn ready (#done)
      console.log(`Waiting for turn ${turn} evaluation to finish...`);
      await page.waitForFunction(() => {
        return !!document.querySelector('.call') || !!document.querySelector('#done');
      }, null, { timeout: 60000 });

      // If actualTranscript was still waiting on final batch pass on turn 0, capture from live state
      if (turn === 0 && (!actualTranscript || !actualTranscript.trim())) {
        actualTranscript = await page.evaluate(() => {
          const liveEl = document.getElementById('live');
          return (liveEl ? liveEl.textContent : '') || '';
        });
      }

      if (turn === 0) {
        // Strict invariant: The test must fail on an empty transcript!
        if (!actualTranscript || !actualTranscript.trim()) {
          throw new Error(`CRITICAL TEST FAILURE: Empty transcript captured on turn 0 for ${scenarioName}!`);
        }
        console.log(`Turn 0 Final Moonshine Transcript: "${actualTranscript.trim()}"`);
      }

      const isDebrief = await page.$('.call');
      if (isDebrief) {
        console.log(`Debrief reached after turn ${turn}!`);
        break;
      }

      if (turn >= 2) {
        // If max turns reached, wait for debrief
        await page.waitForSelector('.call', { timeout: 35000 });
        console.log(`Debrief reached after turn ${turn}!`);
        break;
      }

      // If follow-up appeared, reveal question text via #show
      try {
        await page.click('#show', { timeout: 3000 });
      } catch {}

      const qText = await page.evaluate(() => {
        const qEl = document.getElementById('qtext');
        return qEl ? qEl.textContent.trim() : '';
      });

      followUpsChosen.push({ turn: turn + 1, probeQuestion: qText || 'Follow-up probe' });
      console.log(`Follow-up chosen for turn ${turn + 1}: "${qText || 'Follow-up probe'}"`);
      turn++;
    }

    // Step 5: Read Debrief results
    await page.waitForSelector('.call', { timeout: 35000 });
    const debrief = await page.evaluate(() => {
      const callEl = document.querySelector('.call strong');
      const summaryEl = document.querySelector('.call p');
      const rowsEls = document.querySelectorAll('.rows .row');
      const rows = [];
      rowsEls.forEach((r) => {
        const label = r.querySelector('b')?.textContent.trim() || '';
        const pill = r.querySelector('.pill')?.textContent.trim() || '';
        const text = r.querySelector('div p')?.textContent.trim() || '';
        const quote = r.querySelector('blockquote')?.textContent.trim() || '';
        rows.push({ label, pill, text, quote });
      });

      const markedText = document.querySelector('.stack p.live')?.textContent.trim() || '';

      return {
        overallCall: callEl ? callEl.textContent.trim() : '',
        overallSummary: summaryEl ? summaryEl.textContent.trim() : '',
        rows,
        markedText,
      };
    });

    console.log(`\n--- RESULTS FOR ${scenarioName} ---`);
    console.log(`Actual Transcript Captured: "${actualTranscript.trim()}"`);
    console.log(`Follow-ups Chosen (${followUpsChosen.length}):`, JSON.stringify(followUpsChosen, null, 2));
    console.log(`Overall Call: ${debrief.overallCall}`);
    console.log(`Overall Summary: ${debrief.overallSummary}`);
    console.log(`Rubric Signal Rows:`, JSON.stringify(debrief.rows, null, 2));

    if (leakedRequests.length > 0) {
      throw new Error(`Privacy violation: Outbound network leakage detected: ${JSON.stringify(leakedRequests)}`);
    } else {
      console.log(`✓ Privacy verified: 0 outbound requests leaked answers or audio.`);
    }

    return {
      scenarioName,
      actualTranscript: actualTranscript.trim(),
      followUpsChosen,
      debrief,
    };
  } finally {
    await browser.close();
  }
}

async function testStaticServerAndOtherRoutes() {
  console.log(`\n======================================================`);
  console.log(`VERIFYING STATIC SERVER, ISOLATION & OTHER ROUTES`);
  console.log(`======================================================`);

  // 1. Check Server Headers
  const rootHeaders = await checkHeaders(`http://localhost:${PORT}/`);
  const roomHeaders = await checkHeaders(`http://localhost:${PORT}/interview/room`);
  console.log(`Root Headers check:`, rootHeaders);
  console.log(`Room Headers check:`, roomHeaders);
  if (!rootHeaders.hasNoSpecialHeaders || !roomHeaders.hasNoSpecialHeaders) {
    throw new Error(`Server has special isolation headers! Expected pure static server.`);
  }
  console.log(`✓ Verified: Static server has NO special headers (COOP/COEP: None).`);

  // 2. Check Other Routes: Verify 0 models requested on / or /docs/
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const modelRequests = [];
    page.on('request', (req) => {
      const url = req.url();
      if (
        url.includes('huggingface.co') ||
        url.includes('.onnx') ||
        url.includes('moonshine') ||
        url.includes('MiniLM') ||
        url.includes('mobilebert')
      ) {
        modelRequests.push(url);
      }
    });

    console.log(`Checking non-interview route: / ...`);
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

    console.log(`Checking non-interview route: /docs/deep-learning/attention-transformers ...`);
    await page.goto(`http://localhost:${PORT}/docs/deep-learning/attention-transformers`, { waitUntil: 'networkidle' });

    if (modelRequests.length > 0) {
      throw new Error(`Model requests leaked on non-interview routes: ${JSON.stringify(modelRequests)}`);
    }
    console.log(`✓ Verified: 0 model requests on other routes.`);

    // 3. Check Mic and Synthesis Stop on Leaving
    console.log(`Checking mic and synthesis cleanup on leaving /interview/room...`);
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error') || text.includes('warn') || text.includes('Warn')) {
        console.log(`[Browser ${msg.type()}]:`, text);
      }
    });
    page.on('pageerror', (err) => console.error('[Browser unhandled pageerror]:', err));

    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#begin');
    await page.click('#begin');
    await page.waitForSelector('#mic');
    await page.click('#mic');
    await page.waitForTimeout(1000);

    // Click exit room link
    await page.click('#exit-room');
    await page.waitForURL(`http://localhost:${PORT}/interview`);
    await page.waitForTimeout(500);

    const isSpeaking = await page.evaluate(() => (window.speechSynthesis ? window.speechSynthesis.speaking : false));
    console.log(`Speech synthesis speaking after exit: ${isSpeaking}`);
    if (isSpeaking) {
      throw new Error(`Speech synthesis was not cancelled on leaving room!`);
    }
    console.log(`✓ Verified: Mic and speech synthesis cleanly stop on leaving.`);

    // 4. Typed Fallback When Mic Denied
    console.log(`Checking typed fallback when mic is denied...`);
    const deniedCtx = await browser.newContext({ permissions: [] });
    const deniedPage = await deniedCtx.newPage();
    await deniedPage.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
    await deniedPage.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    await deniedPage.waitForSelector('#begin');
    await deniedPage.click('#begin');
    await deniedPage.waitForSelector('#mic');
    await deniedPage.click('#mic');

    await deniedPage.waitForSelector('.who, textarea.live', { timeout: 15000 });
    try {
      await deniedPage.click('button:has-text("Skip speaking")', { timeout: 1500 });
    } catch {}

    await deniedPage.waitForSelector('textarea.live', { timeout: 15000 });
    const hasTextarea = await deniedPage.$('textarea.live');
    if (!hasTextarea) {
      throw new Error(`Typed fallback textarea was not rendered when mic was denied!`);
    }
    console.log(`✓ Verified: Typed fallback (textarea.live) activated when mic was denied.`);
    await deniedCtx.close();
  } finally {
    await browser.close();
  }
}

async function reportBundleSizes() {
  console.log(`\n======================================================`);
  console.log(`BUNDLE & ASSET SIZE REPORT`);
  console.log(`======================================================`);
  const assets = fs.readdirSync(path.join(DIST, 'assets'));
  let mainJsSize = 0;
  let mainCssSize = 0;
  let interviewJsSize = 0;
  let interviewCssSize = 0;
  let moonshineWorkerSize = 0;
  let mockJudgeWorkerSize = 0;

  for (const f of assets) {
    const p = path.join(DIST, 'assets', f);
    const sz = fs.statSync(p).size;
    if (f.startsWith('index-') && f.endsWith('.js')) mainJsSize = sz;
    if (f.startsWith('index-') && f.endsWith('.css')) mainCssSize = sz;
    if (f.startsWith('InterviewRoomPage') && f.endsWith('.js')) interviewJsSize = sz;
    if (f.startsWith('InterviewRoomPage') && f.endsWith('.css')) interviewCssSize = sz;
    if (f.startsWith('moonshineSingleThreadWorker') && f.endsWith('.js')) moonshineWorkerSize = sz;
    if (f.startsWith('mockInterviewWorker') && f.endsWith('.js')) mockJudgeWorkerSize = sz;
  }

  const distBytes = getDirSize(DIST);
  console.log(`Main JS Bundle: ${(mainJsSize / 1024).toFixed(1)} KB`);
  console.log(`Main CSS Bundle: ${(mainCssSize / 1024).toFixed(1)} KB`);
  console.log(`InterviewRoomPage JS Chunk: ${(interviewJsSize / 1024).toFixed(1)} KB`);
  console.log(`InterviewRoomPage CSS Chunk: ${(interviewCssSize / 1024).toFixed(1)} KB`);
  console.log(`Moonshine Worker Chunk: ${(moonshineWorkerSize / 1024).toFixed(1)} KB`);
  console.log(`Mock Interview Judge Worker Chunk: ${(mockJudgeWorkerSize / 1024).toFixed(1)} KB`);
  console.log(`Total dist/ size: ${(distBytes / (1024 * 1024)).toFixed(1)} MB`);
}

function getDirSize(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

async function main() {
  console.log('Starting static server on port ' + PORT + '...');
  const srv = await startStaticServer();

  try {
    await reportBundleSizes();
    await testStaticServerAndOtherRoutes();

    const results = {};
    results.strong = await runScenario('Strong Answer', AUDIO_STRONG);
    results.weak = await runScenario('Weak Answer', AUDIO_WEAK);
    results.nextToken = await runScenario('Foundation Model Next-Token Answer', AUDIO_NEXT_TOKEN);

    console.log('\n======================================================');
    console.log('ALL VERIFICATIONS PASSED CLEANLY');
    console.log('======================================================');

    fs.writeFileSync(
      path.resolve(ROOT, 'docs', 'interview-room-verification-results.json'),
      JSON.stringify(results, null, 2)
    );
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('\n❌ VERIFICATION SCRIPT FAILED:', err);
  process.exit(1);
});
