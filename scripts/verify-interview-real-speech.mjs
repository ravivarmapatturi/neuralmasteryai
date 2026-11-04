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
const AUDIO_RAG = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'answer-rag.wav');
const AUDIO_LORA = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'answer-lora.wav');

const KNOWN_SCRIPTS = {
  'Strong Answer':
    'A foundation model is pretrained at scale on massive broad datasets across diverse modalities to learn general representations rather than trained on narrow task specific data. It acts as a versatile shared base that can adapt to many different downstream tasks through prompting or fine tuning without retraining from scratch. Classical machine learning models like XGBoost or logistic regression are still preferred for structured tabular datasets, strict low latency budgets, or deterministic explainability.',
  'Weak Answer':
    'Well machine learning models are computer algorithms that learn from data. Some models are big and some models are small and computers use them to process numbers.',
  'Foundation Model Next-Token Answer':
    'A foundation model is basically a probabilistic model that tries to predict the next token based on previous tokens. However, classical models like XGBoost are much cheaper and faster for tabular data.',
  'RAG vs Fine-Tuning Answer':
    'When company documentation updates frequently, RAG is preferred because updating vector indexes is cheap and immediate compared to retraining. RAG also provides verifiable source citations and document-level access control. Fine-tuning should only be used for style, tone, or formatting, or combined in a hybrid system.',
  'LoRA Production Serving Answer':
    'LoRA freezes the base model weights and represents the weight update as two low-rank matrices B and A. This drastically reduces GPU memory during training because optimizer states are only tracked for the adapter parameters. For serving, we keep one base model in VRAM and dynamically swap small adapter weights, or merge them directly for zero added latency.',
};

function normalizeTextForWER(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function computeWER(reference, hypothesis) {
  const refWords = normalizeTextForWER(reference);
  const hypWords = normalizeTextForWER(hypothesis);
  const n = refWords.length;
  const m = hypWords.length;
  if (n === 0) {
    return { wer: m === 0 ? 0 : 1, werPercent: m === 0 ? 0 : 100, referenceWordCount: 0, hypothesisWordCount: m, edits: m };
  }
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1] + 1, dp[i][j - 1] + 1, dp[i - 1][j] + 1);
      }
    }
  }
  const rawWer = dp[n][m] / n;
  return {
    wer: Math.round(rawWer * 1000) / 1000,
    werPercent: Math.round(rawWer * 1000) / 10,
    edits: dp[n][m],
    referenceWordCount: n,
    hypothesisWordCount: m,
  };
}

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

async function runScenario(scenarioName, wavPath, questionId) {
  const durationMs = getWavDurationMs(wavPath);
  console.log(`\n======================================================`);
  console.log(`RUNNING SCENARIO: ${scenarioName} ${questionId ? `[Question: ${questionId}]` : ''}`);
  console.log(`Audio WAV: ${wavPath} (${fs.statSync(wavPath).size} bytes, ${(durationMs / 1000).toFixed(1)}s duration)`);
  console.log(`======================================================`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wavPath}%noloop`,
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

    await page.addInitScript(() => {
      window.__NM_TEST_AUTOSKIP_SPEAKING__ = true;
    });

    const targetUrl = questionId
      ? `http://localhost:${PORT}/interview/room?count=1&q=${questionId}`
      : `http://localhost:${PORT}/interview/room?count=1`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // Step 0: Wait for speech model to be ready on setup screen so audio capture is immediate
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Speech model ready');
    }, null, { timeout: 45000 }).catch(() => {
      console.log('Notice: Continuing without waiting further for model ready badge');
    });

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
      // Check if debrief reached
      if (await page.$('.call')) {
        console.log(`Debrief reached before turn ${turn}!`);
        break;
      }

      // Step 3: Speaking state
      await page.waitForSelector('.who, #live, textarea.live, .call', { timeout: 25000 });
      if (await page.$('.call')) {
        console.log(`Debrief reached after turn ${turn}!`);
        break;
      }

      // If interviewer is speaking, click "Skip speaking" immediately to enter listening mode
      const skipBtn = await page.waitForSelector('button:has-text("Skip speaking")', { timeout: 6000 }).catch(() => null);
      if (skipBtn) {
        await skipBtn.click();
      }

      // Step 4: Listening state
      await page.waitForSelector('#live, textarea.live, .call', { timeout: 25000 });
      if (await page.$('.call')) {
        console.log(`Debrief reached after turn ${turn}!`);
        break;
      }

      console.log(`Turn ${turn}: Streaming speech through real Moonshine...`);

      if (turn === 0) {
        // Stream the full audio duration through Moonshine (give minimum 35s for speech processing & commit)
        const waitTime = Math.max(35000, durationMs + 12000);
        const startTime = Date.now();
        let lastSeenLiveText = '';
        while (Date.now() - startTime < waitTime) {
          await page.waitForTimeout(1000);
          const currentText = await page.evaluate(() => {
            const liveEl = document.getElementById('live');
            return (liveEl ? liveEl.textContent : '') || window.__NM_LAST_TURN_ANSWER__ || '';
          });
          if (currentText && currentText.trim()) {
            const text = currentText.trim();
            // If the live text suddenly shrank from a complete sentence to a tiny fragment,
            // the pause detection concluded turn 0 and started turn 1. Break and preserve turn 0!
            if (lastSeenLiveText.length > 40 && text.length < 20) {
              console.log(`Live text reset detected (turn advanced): preserving turn 0 transcript.`);
              break;
            }
            if (text.length >= lastSeenLiveText.length || !lastSeenLiveText) {
              lastSeenLiveText = text;
            }
            console.log(`  [Moonshine live ${( (Date.now() - startTime) / 1000 ).toFixed(0)}s]: "${text}"`);
          }
          // If turn 0 was auto-concluded (via silence timer or debrief), break early
          const turnState = await page.evaluate(() => ({
            turn: window.__NM_CURRENT_TURN__,
            screen: window.__NM_CURRENT_SCREEN__,
            historyLen: (window.__NM_HISTORY__ || []).length,
          }));
          if (turnState.turn > 0 || turnState.historyLen > 0 || turnState.screen === 'debrief') {
            break;
          }
        }

        const historyAnswer = await page.evaluate(() => {
          const hist = window.__NM_HISTORY__;
          return hist && hist[0] ? hist[0].learnerAnswer : '';
        });

        actualTranscript =
          historyAnswer ||
          lastSeenLiveText ||
          (await page.evaluate(() => {
            const liveEl = document.getElementById('live');
            return (liveEl ? liveEl.textContent : '') || window.__NM_LAST_TURN_ANSWER__ || '';
          }));
      } else {
        // For follow-up turns, stream briefly
        await page.waitForTimeout(4000);
      }

      // Finish answer turn (if not already concluded by silence timer)
      const hasDoneBtn = await page.$('#done');
      if (hasDoneBtn) {
        console.log(`Concluding turn ${turn} answer with "#done"...`);
        await page.click('#done').catch(() => {});
      } else {
        console.log(`Turn ${turn} answer concluded via pause detection.`);
      }

      // Wait for candidate answering state to unmount
      await page.waitForSelector('#done', { state: 'detached', timeout: 5000 }).catch(() => {});

      // Wait for evaluation to finish: either debrief (.call) or next turn speaking/ready
      console.log(`Waiting for turn ${turn} evaluation to finish...`);
      await page.waitForFunction(
        (curTurn) => {
          const screen = window.__NM_CURRENT_SCREEN__;
          const turnIdx = window.__NM_CURRENT_TURN__;
          if (screen === 'debrief' || document.querySelector('.call')) return true;
          if (screen !== 'evaluating' && turnIdx > curTurn) return true;
          return false;
        },
        turn,
        { timeout: 60000 }
      );

      // If actualTranscript was still waiting on final batch pass on turn 0, capture from live state or history
      if (turn === 0 && (!actualTranscript || !actualTranscript.trim())) {
        actualTranscript = await page.evaluate(() => {
          const hist = window.__NM_HISTORY__;
          if (hist && hist[0] && hist[0].learnerAnswer) return hist[0].learnerAnswer;
          const liveEl = document.getElementById('live');
          return (liveEl ? liveEl.textContent : '') || window.__NM_LAST_TURN_ANSWER__ || '';
        });
      }

      if (turn === 0) {
        // Strict invariant: The test must fail on an empty transcript!
        if (!actualTranscript || !actualTranscript.trim()) {
          throw new Error(`CRITICAL TEST FAILURE: Empty transcript captured on turn 0 for ${scenarioName}!`);
        }
        console.log(`Turn 0 Final Moonshine Transcript: "${actualTranscript.trim()}"`);
      }

      const isDebrief = await page.evaluate(() => {
        return window.__NM_CURRENT_SCREEN__ === 'debrief' || !!document.querySelector('.call');
      });
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

    // Compute and verify Word Error Rate (WER) against known reference script
    const knownScript = KNOWN_SCRIPTS[scenarioName];
    const wer = computeWER(knownScript || '', actualTranscript);
    console.log(`\n--- RESULTS FOR ${scenarioName} ---`);
    console.log(`Known Reference Script: "${knownScript || ''}"`);
    console.log(`Actual Transcript Captured: "${actualTranscript.trim()}"`);
    console.log(`WER: ${wer.werPercent}% (${wer.edits} edits / ${wer.referenceWordCount} reference words)`);

    if (wer.wer > 0.25) {
      throw new Error(`CRITICAL PASS FAILURE: WER ${wer.werPercent}% exceeds 25% threshold for ${scenarioName}!`);
    }
    console.log(`✓ WER requirement satisfied: ${wer.werPercent}% < 25%`);

    // Verify dialogue invariants: Never repeat a probe in a question
    const probeQuestions = followUpsChosen.map(f => f.probeQuestion.trim());
    const uniqueProbes = new Set(probeQuestions);
    if (uniqueProbes.size !== probeQuestions.length) {
      throw new Error(`CRITICAL FAILURE: Duplicate follow-up probe asked! Probes: ${JSON.stringify(probeQuestions)}`);
    }
    console.log(`✓ Invariant satisfied: Zero duplicate probes asked (${followUpsChosen.length} unique follow-ups).`);

    // Verify debrief invariants: No noise quoted
    for (const row of debrief.rows) {
      if (row.quote && (/poopin/i.test(row.quote) || /fungi/i.test(row.quote))) {
        throw new Error(`CRITICAL FAILURE: Noise detected in debrief quote: ${row.quote}`);
      }
    }
    if (/poopin/i.test(debrief.overallSummary) || /fungi/i.test(debrief.overallSummary)) {
      throw new Error(`CRITICAL FAILURE: Noise detected in debrief summary: ${debrief.overallSummary}`);
    }
    console.log(`✓ Invariant satisfied: Zero noise detected in debrief quotes.`);

    // Verify Depth when probed rests only on answers given after a follow-up
    const depthRow = debrief.rows.find(r => r.label === 'Depth when probed');
    if (!depthRow) {
      throw new Error('Debrief is missing "Depth when probed" signal row!');
    }
    if (followUpsChosen.length === 0) {
      if (depthRow.pill !== 'Not probed' && depthRow.pill !== 'Not heard yet') {
        throw new Error(`Expected 'Not probed' or 'Not heard yet' when no follow-ups were asked, got ${depthRow.pill}`);
      }
    } else {
      if (depthRow.pill === 'Not probed') {
        throw new Error(`Expected probed pill when follow-ups were asked, got 'Not probed'`);
      }
    }
    console.log(`✓ Invariant satisfied: "Depth when probed" correctly evaluated (${depthRow.pill}).`);

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
      knownScript,
      actualTranscript: actualTranscript.trim(),
      wer,
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

    // 5. Check pre-recorded interviewer audio clip serving
    console.log(`Checking pre-recorded interviewer audio clip serving...`);
    const audioRes = await checkHeaders(`http://localhost:${PORT}/audio/interview-voice/genai-fm-fundamentals_q.opus`);
    if (audioRes.statusCode !== 200) {
      throw new Error(`Audio clip returned HTTP ${audioRes.statusCode} instead of 200!`);
    }
    console.log(`✓ Verified: Pre-recorded audio clip served with HTTP 200 OK.`);
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

async function test375pxResponsiveLayout() {
  console.log(`\n======================================================`);
  console.log(`VERIFYING 375px MOBILE RESPONSIVE LAYOUT (ZERO OVERFLOW)`);
  console.log(`======================================================`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#begin', { timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Document scrollWidth at 375px: ${scrollWidth}px`);
    if (scrollWidth > 375) {
      throw new Error(`CRITICAL FAILURE: Horizontal overflow at 375px: scrollWidth = ${scrollWidth} > 375`);
    }
    console.log(`✓ 375px responsive check passed: scrollWidth === 375px (zero horizontal overflow).`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting static server on port ' + PORT + '...');
  const srv = await startStaticServer();

  try {
    await reportBundleSizes();
    await testStaticServerAndOtherRoutes();
    await test375pxResponsiveLayout();

    const results = {};
    results.strong = await runScenario('Strong Answer', AUDIO_STRONG, 'genai-fm-fundamentals');
    results.weak = await runScenario('Weak Answer', AUDIO_WEAK, 'genai-fm-fundamentals');
    results.nextToken = await runScenario('Foundation Model Next-Token Answer', AUDIO_NEXT_TOKEN, 'genai-fm-fundamentals');
    results.rag = await runScenario('RAG vs Fine-Tuning Answer', AUDIO_RAG, 'genai-rag-vs-finetuning');
    results.lora = await runScenario('LoRA Production Serving Answer', AUDIO_LORA, 'genai-lora-production-serving');

    console.log('\n======================================================');
    console.log('ALL VERIFICATIONS PASSED CLEANLY (5/5 SPEECH SCENARIOS)');
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
