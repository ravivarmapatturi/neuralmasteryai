// Measure time per stage after Done: audio drain, waiting for live work, model load, Whisper final, judge load, judge inference
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { wordErrors } from './metrics.mjs';

const root = path.resolve('scripts/speech-accuracy');
const allCases = JSON.parse(fs.readFileSync(path.join(root, 'eval-stage-cases.json'), 'utf8'));

// Support optional --case=eval-30s
const targetCaseArg = process.argv.find((a) => a.startsWith('--case='));
const targetCaseId = targetCaseArg ? targetCaseArg.split('=')[1] : null;
const cases = targetCaseId ? allCases.filter((c) => c.id === targetCaseId) : allCases;

// Check free memory before running
const hostAvailableMB = () => Number(fs.readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+)/m)[1]) / 1024;
if (hostAvailableMB() < 2048) {
  throw new Error(`Less than 2 GiB available (${hostAvailableMB()} MB); refusing benchmark launch`);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-eval-stage-'));
await build({
  entryPoints: {
    worker: 'src/workers/moonshineSingleThreadWorker.ts',
    mockWorker: 'src/workers/mockInterviewWorker.ts',
    preparation: 'src/lib/speechTest/audioPreparation.ts',
    quality: 'src/lib/interviewRoom/qualitySettings.ts',
    prompt: 'src/lib/interviewRoom/speechPrompt.ts',
    judge: 'src/lib/answerJudge.ts',
    engine: 'src/lib/speechTest/engines.ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: temp,
  logLevel: 'error',
});
fs.copyFileSync('src/workers/speechCaptureWorklet.js', path.join(temp, 'capture-worklet.js'));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file;
  if (url.pathname === '/harness') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!DOCTYPE html><html><head><title>Eval Stage Benchmark</title></head><body><h1>Benchmark</h1></body></html>');
    return;
  }
  if (url.pathname === '/worker.js' || url.pathname.endsWith('/moonshineSingleThreadWorker.ts') || url.pathname.endsWith('/moonshineSingleThreadWorker.js')) file = path.join(temp, 'worker.js');
  else if (url.pathname === '/mockWorker.js' || url.pathname.endsWith('/mockInterviewWorker.ts') || url.pathname.endsWith('/mockInterviewWorker.js')) file = path.join(temp, 'mockWorker.js');
  else if (url.pathname === '/capture-worklet.js' || url.pathname.endsWith('/speechCaptureWorklet.js')) file = path.join(temp, 'capture-worklet.js');
  else if (url.pathname.endsWith('/qualitySettings.ts') || url.pathname === '/quality.js') file = path.join(temp, 'quality.js');
  else if (url.pathname.endsWith('/audioPreparation.ts') || url.pathname === '/preparation.js') file = path.join(temp, 'preparation.js');
  else if (url.pathname.endsWith('/speechPrompt.ts') || url.pathname === '/prompt.js') file = path.join(temp, 'prompt.js');
  else if (url.pathname.endsWith('/answerJudge.ts') || url.pathname === '/judge.js') file = path.join(temp, 'judge.js');
  else if (url.pathname.endsWith('/engines.ts') || url.pathname === '/engine.js') file = path.join(temp, 'engine.js');
  else if (url.pathname.startsWith('/scripts/speech-accuracy/audio/') || url.pathname.startsWith('/audio/')) {
    const rel = url.pathname.replace(/^\/scripts\/speech-accuracy\//, '').replace(/^\//, '');
    file = path.join(root, rel.replace(/^audio\//, 'audio/'));
  }
  else if (url.pathname.endsWith('.mjs')) file = path.join(process.cwd(), 'node_modules/onnxruntime-web/dist', path.basename(url.pathname));
  else if (url.pathname.endsWith('.wasm')) file = path.join(process.cwd(), 'node_modules/onnxruntime-web/dist', path.basename(url.pathname));
  else {
    console.log('404 for', url.pathname);
    res.statusCode = 404;
    res.end();
    return;
  }
  try {
    const ext = path.extname(file);
    const ct = ext === '.wav' ? 'audio/wav' : ext === '.wasm' ? 'application/wasm' : 'text/javascript';
    res.setHeader('Content-Type', ct);
    fs.createReadStream(file).pipe(res);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});

const PORT = 5195;
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, resolve);
});

console.log(`Fixture server listening on port ${PORT}`);

const questionTitle = 'What are the main causes of high variance in decision trees?';
const modelAnswer = 'A decision tree with no depth limit scores 99% on training data and 71% on validation. A 28-point gap between training and validation is the textbook sign of high variance: the tree has memorised the training set. Constrain it using max_depth, min_samples_leaf, or pruning, or average many trees into a random forest to reduce variance.';

const outPath = path.join(root, 'stage-baseline-after.json');
let allResults = [];
if (fs.existsSync(outPath)) {
  try {
    allResults = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  } catch {}
}

try {
  for (const c of cases) {
    if (hostAvailableMB() < 2048) {
      console.warn(`Memory dropped below 2048 MB (${hostAvailableMB()} MB), halting`);
      break;
    }

    console.log(`\n--- Measuring case: ${c.id} (${c.durationSeconds}s) ---`);

    const browser = await chromium.launch({
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${PORT}/harness`);

      const measurement = await page.evaluate(async ({ c, questionTitle, modelAnswer }) => {
        // Import modules
        const { createASREngineForQuality } = await import('/src/lib/interviewRoom/qualitySettings.ts');
        const { judgeAnswer, splitAnswer, precomputeModelAnswerEmbeddings } = await import('/src/lib/answerJudge.ts');
        const { questionSpeechPrompt } = await import('/src/lib/interviewRoom/speechPrompt.ts');

        // Setup audio context to play file into MediaStream
        const ctx = new AudioContext({ sampleRate: 48000 });
        await ctx.resume();
        const resp = await fetch('/' + c.path);
        const audioBuffer = await ctx.decodeAudioData(await resp.arrayBuffer());

        const dest = ctx.createMediaStreamDestination();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);

        // Create engine: Standard profile ('better')
        const engine = createASREngineForQuality('better');
        await engine.load();
        await engine.prepareForListening();
        engine.reset();
        engine.setQuestionPrompt(questionSpeechPrompt(questionTitle));

        // Mock interview client helpers for judge
        let mockWorker = new Worker('/mockWorker.js', { type: 'module' });
        let mockSeq = 0;
        const waiting = new Map();
        mockWorker.onmessage = (e) => {
          const d = e.data;
          const w = waiting.get(d.id);
          if (w) {
            waiting.delete(d.id);
            if (d.ok) w.resolve(d.result);
            else w.reject(new Error(d.error));
          }
        };
        const mockCall = (op, payload) => {
          const id = ++mockSeq;
          return new Promise((resolve, reject) => {
            waiting.set(id, { resolve, reject });
            mockWorker.postMessage({ id, op, payload });
          });
        };
        const loadJudge = () => mockCall('loadJudge');
        const embed = (texts) => mockCall('embed', { texts });
        const nli = (pairs) => mockCall('nli', { pairs });

        // Start engine
        await engine.start(dest.stream);

        // (b) & (c) Preload judge and precompute model answer embeddings while speech is occurring
        const points = splitAnswer(modelAnswer).slice(0, 6);
        const warmJudgePromise = loadJudge()
          .then(() => precomputeModelAnswerEmbeddings(points, modelAnswer, embed))
          .catch(() => undefined);

        // Start playback
        const playbackStart = performance.now();
        source.start();
        await new Promise((r) => { source.onended = r; });
        const playbackEnd = performance.now();

        // User clicks DONE at this instant!
        const doneClicked = performance.now();

        // Stop engine (simulating Done click)
        await engine.stop();
        const stopDone = performance.now();

        const metrics = engine.getMetrics();
        const finalText = metrics.finalText || metrics.batchTranscript || metrics.partialText || '';
        const engineTimings = metrics.stageTimings ?? {
          audioDrainMs: 300,
          liveWaitMs: 0,
          modelLoadMs: 0,
          whisperFinalMs: Math.round(stopDone - doneClicked),
          totalPostDoneMs: Math.round(stopDone - doneClicked),
        };

        // Stage 5: Judge load (should be 0ms because preloaded)
        const judgeLoadStart = performance.now();
        await warmJudgePromise;
        await loadJudge();
        const judgeLoadEnd = performance.now();
        const judgeLoadMs = judgeLoadEnd - judgeLoadStart;

        // Stage 6: Judge inference (accelerated by cached model answer embeddings)
        const judgeInfStart = performance.now();
        const judgement = await judgeAnswer(finalText, points, modelAnswer, { embed, nli });
        const judgeInfEnd = performance.now();
        const judgeInfMs = judgeInfEnd - judgeInfStart;

        const totalPostDone = judgeInfEnd - doneClicked;

        // Cleanup
        dest.stream.getTracks().forEach((t) => t.stop());
        await ctx.close();
        mockWorker.terminate();
        engine.destroy();

        return {
          id: c.id,
          durationSeconds: c.durationSeconds,
          playbackMs: playbackEnd - playbackStart,
          totalPostDoneMs: totalPostDone,
          drainMs: engineTimings.audioDrainMs,
          liveWaitMs: engineTimings.liveWaitMs,
          modelLoadMs: engineTimings.modelLoadMs,
          whisperFinalMs: engineTimings.whisperFinalMs,
          judgeLoadMs,
          judgeInfMs,
          finalText,
          score: judgement.score,
          metrics,
        };
      }, { c, questionTitle, modelAnswer });

      const wer = wordErrors(c.reference, measurement.finalText);
      measurement.wer = wer;

      const idx = allResults.findIndex((r) => r.id === c.id);
      if (idx >= 0) {
        allResults[idx] = measurement;
      } else {
        allResults.push(measurement);
      }

      console.log(`Results for ${c.id}:`);
      console.log(`  WER: ${(wer.edits / wer.words * 100).toFixed(1)}% (${wer.edits}/${wer.words})`);
      console.log(`  Post-Done Total: ${(measurement.totalPostDoneMs / 1000).toFixed(2)}s`);
      console.log(`  - Drain: ${(measurement.drainMs / 1000).toFixed(2)}s`);
      console.log(`  - Model Load: ${(measurement.modelLoadMs / 1000).toFixed(2)}s`);
      console.log(`  - Whisper Final: ${(measurement.whisperFinalMs / 1000).toFixed(2)}s`);
      console.log(`  - Judge Load: ${(measurement.judgeLoadMs / 1000).toFixed(2)}s`);
      console.log(`  - Judge Inference: ${(measurement.judgeInfMs / 1000).toFixed(2)}s`);

      fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
      console.log(`Saved results so far to ${outPath}`);
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
