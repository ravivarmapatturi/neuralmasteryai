/**
 * Single-Threaded Moonshine ONNX Benchmark Harness
 * 
 * Benchmarks onnx-community/moonshine-tiny-ONNX through @huggingface/transformers
 * with env.backends.onnx.wasm.numThreads = 1 (single-threaded, NO SharedArrayBuffer, NO COOP/COEP).
 * 
 * Usage:
 *   node scripts/speech-benchmarks/benchmark-moonshine-single-thread.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Invariant: strictly single-threaded WASM runtime
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

const AUDIO_PATH = path.resolve(__dirname, 'audio', 'speech_with_pauses.wav');
const REF_PATH = path.resolve(__dirname, 'audio', 'reference.txt');

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateWER(ref, hyp) {
  const rWords = normalizeText(ref).split(' ').filter(Boolean);
  const hWords = normalizeText(hyp).split(' ').filter(Boolean);
  const N = rWords.length;
  if (N === 0) return { wer: 0, substitutions: 0, deletions: 0, insertions: 0 };

  const dp = Array.from({ length: N + 1 }, () => new Array(hWords.length + 1).fill(0));
  for (let i = 0; i <= N; i++) dp[i][0] = i;
  for (let j = 0; j <= hWords.length; j++) dp[0][j] = j;

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= hWords.length; j++) {
      if (rWords[i - 1] === hWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
      }
    }
  }

  const distance = dp[N][hWords.length];
  const wer = Math.round((distance / N) * 1000) / 10;
  return {
    wer,
    distance,
    refWordsCount: N,
    hypWordsCount: hWords.length,
    werString: `${wer}%`,
  };
}

async function runBenchmark() {
  console.log('=== Single-Threaded Moonshine ONNX Benchmark ===');
  console.log(`Audio: ${AUDIO_PATH}`);
  console.log(`Threads: ${env.backends.onnx.wasm.numThreads} (NO SharedArrayBuffer required)`);

  const referenceText = fs.readFileSync(REF_PATH, 'utf-8').trim();
  console.log(`Reference: "${referenceText}"`);

  // 1. Cold download and model load
  const t0 = Date.now();
  console.log('Loading pipeline onnx-community/moonshine-tiny-ONNX (dtype: q8)...');
  const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/moonshine-tiny-ONNX', {
    dtype: 'q8',
  });
  const loadTimeMs = Date.now() - t0;
  console.log(`Model initialized in ${loadTimeMs} ms.`);

  // 2. Load audio PCM
  const wavBuf = fs.readFileSync(AUDIO_PATH);
  // Standard 44-byte WAV header parsing for 16-bit mono 16kHz
  const pcm16 = new Int16Array(wavBuf.buffer, wavBuf.byteOffset + 44, (wavBuf.byteLength - 44) / 2);
  const audioFloat32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    audioFloat32[i] = pcm16[i] / 32768.0;
  }
  const totalDurationSec = audioFloat32.length / 16000;
  console.log(`Audio duration: ${totalDurationSec.toFixed(2)}s (${audioFloat32.length} samples)`);

  // 3. Full audio benchmark
  console.log('\n--- Full Audio Transcription ---');
  const tFullStart = Date.now();
  const fullResult = await transcriber(audioFloat32);
  const fullLatencyMs = Date.now() - tFullStart;
  const fullRtf = fullLatencyMs / (totalDurationSec * 1000);
  const werResult = calculateWER(referenceText, fullResult.text);

  console.log(`Transcript: "${fullResult.text}"`);
  console.log(`Full Audio Latency: ${fullLatencyMs} ms`);
  console.log(`Real-Time Factor (RTF): ${fullRtf.toFixed(3)}x (${(1 / fullRtf).toFixed(1)}x faster than real time)`);
  console.log(`Word Error Rate (WER): ${werResult.werString} (${werResult.distance}/${werResult.refWordsCount} edits)`);

  // 4. Chunk progression test
  console.log('\n--- Chunk Progression Latencies ---');
  const chunkSeconds = [1.0, 2.0, 3.0, 5.0, 10.0];
  const chunkResults = [];
  for (const sec of chunkSeconds) {
    const numSamples = Math.min(audioFloat32.length, Math.round(sec * 16000));
    const slice = audioFloat32.subarray(0, numSamples);
    const tChunkStart = Date.now();
    const res = await transcriber(slice);
    const lat = Date.now() - tChunkStart;
    const rtf = lat / (sec * 1000);
    chunkResults.push({ seconds: sec, latencyMs: lat, rtf: Math.round(rtf * 1000) / 1000, text: res.text });
    console.log(`  ${sec.toFixed(1)}s chunk: ${lat} ms (RTF: ${rtf.toFixed(3)}x) -> "${res.text}"`);
  }

  // 5. Growing window streaming simulation (test live feel, update interval, settled word stability)
  console.log('\n--- Growing Window Streaming Simulation ---');
  const windowIntervalSec = 0.5; // New audio arrives every 500ms
  let settledWords = [];
  let earlierWordChanges = 0;
  let totalWindowUpdates = 0;
  const updateIntervals = [];
  let lastUpdateTime = Date.now();

  for (let sec = windowIntervalSec; sec <= Math.min(8.0, totalDurationSec); sec += windowIntervalSec) {
    const numSamples = Math.min(audioFloat32.length, Math.round(sec * 16000));
    const slice = audioFloat32.subarray(0, numSamples);
    const tStepStart = Date.now();
    const res = await transcriber(slice);
    const stepDuration = Date.now() - tStepStart;
    totalWindowUpdates++;
    updateIntervals.push(Date.now() - lastUpdateTime);
    lastUpdateTime = Date.now();

    const currentWords = normalizeText(res.text || '').split(' ').filter(Boolean);

    // Count revisions to previously settled/confirmed words
    let changedInThisStep = 0;
    const checkLen = Math.min(settledWords.length, currentWords.length);
    for (let i = 0; i < checkLen; i++) {
      if (settledWords[i] !== currentWords[i]) {
        changedInThisStep++;
      }
    }
    if (changedInThisStep > 0) earlierWordChanges += changedInThisStep;

    // Words beyond the trailing 2 words are considered "settled" (stable prefix)
    if (currentWords.length > 2) {
      settledWords = currentWords.slice(0, currentWords.length - 1);
    }

    console.log(
      `  [+${sec.toFixed(1)}s audio | infer ${stepDuration}ms] "${res.text}" (revisions: ${changedInThisStep})`
    );
  }

  const avgUpdateIntervalMs = Math.round(
    updateIntervals.reduce((a, b) => a + b, 0) / Math.max(1, updateIntervals.length)
  );

  console.log('\n--- Streaming Quality Metrics ---');
  console.log(`Average Update Interval: ${avgUpdateIntervalMs} ms`);
  console.log(`Total Window Updates: ${totalWindowUpdates}`);
  console.log(`Earlier Word Revisions: ${earlierWordChanges} (${((earlierWordChanges / Math.max(1, totalWindowUpdates)) * 100).toFixed(1)}% revision rate)`);

  const report = {
    timestamp: new Date().toISOString(),
    model: 'onnx-community/moonshine-tiny-ONNX',
    weightsSize: '28.18 MB (encoder: 7.9 MB, decoder: 20.2 MB)',
    singleThreaded: true,
    audioFile: AUDIO_PATH,
    audioDurationSec: totalDurationSec,
    coldLoadTimeMs: loadTimeMs,
    fullSpeechLatencyMs: fullLatencyMs,
    fullSpeechRTF: Math.round(fullRtf * 1000) / 1000,
    referenceText,
    transcribedText: fullResult.text,
    wer: werResult.werString,
    chunkProgression: chunkResults,
    streaming: {
      averageUpdateIntervalMs: avgUpdateIntervalMs,
      totalUpdates: totalWindowUpdates,
      earlierWordRevisions: earlierWordChanges,
    },
  };

  const outReportPath = path.resolve(__dirname, 'moonshine-single-thread-results.json');
  fs.writeFileSync(outReportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed benchmark report written to ${outReportPath}`);
  return report;
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
