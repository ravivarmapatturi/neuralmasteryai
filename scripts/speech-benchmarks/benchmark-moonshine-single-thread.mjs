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

function trimAudioSilence(samples, threshold = 0.008, padSamples = 3200) {
  let start = 0;
  for (let i = 0; i < samples.length - 320; i += 160) {
    let sum = 0;
    for (let j = 0; j < 320; j++) sum += samples[i + j] * samples[i + j];
    if (Math.sqrt(sum / 320) > threshold) {
      start = Math.max(0, i - padSamples);
      break;
    }
  }

  let end = samples.length;
  for (let i = samples.length - 320; i >= 0; i -= 160) {
    let sum = 0;
    for (let j = 0; j < 320; j++) sum += samples[i + j] * samples[i + j];
    if (Math.sqrt(sum / 320) > threshold) {
      end = Math.min(samples.length, i + 320 + padSamples);
      break;
    }
  }

  if (start >= end || end - start < 1600) {
    return samples;
  }

  return samples.subarray(start, end);
}

function alignAndAppendPhrases(committed, nextText) {
  const comm = committed.trim();
  const next = nextText.trim();
  if (!comm) return next;
  if (!next) return comm;

  const clean = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const commWords = comm.split(/\s+/).filter(Boolean);
  const nextWords = next.split(/\s+/).filter(Boolean);

  const cleanComm = commWords.map(clean);
  const cleanNext = nextWords.map(clean);

  let maxMatch = 0;
  const maxK = Math.min(8, cleanComm.length, cleanNext.length);

  for (let k = maxK; k >= 1; k--) {
    const tailComm = cleanComm.slice(cleanComm.length - k).join(' ');
    const headNext = cleanNext.slice(0, k).join(' ');
    if (tailComm === headNext) {
      maxMatch = k;
      break;
    }
  }

  if (maxMatch > 0) {
    const remaining = nextWords.slice(maxMatch);
    if (remaining.length === 0) return comm;
    return comm + ' ' + remaining.join(' ');
  }

  return comm + ' ' + next;
}

async function simulateLivePipeline(transcriber, audioFloat32, options = { cpuThrottle: 1.0 }) {
  const { cpuThrottle } = options;
  const stepSamples = 4000; // 250ms at 16kHz
  let currentSegment = [];
  let currentSegmentSamples = 0;
  let committedText = '';
  let hasSpeechInSegment = false;
  let silenceFrames = 0;
  let earlierWordRevisions = 0;
  let settledWords = [];
  const updateIntervals = [];
  const latencies = [];
  let timeToFirstWordMs = null;
  let lastUpdateTime = Date.now();
  const startTime = Date.now();

  for (let offset = 0; offset < audioFloat32.length; offset += stepSamples) {
    const end = Math.min(audioFloat32.length, offset + stepSamples);
    const chunk = audioFloat32.subarray(offset, end);

    currentSegment.push(chunk);
    currentSegmentSamples += chunk.length;

    // Calculate energy (RMS)
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
    const rms = Math.sqrt(sum / chunk.length);

    if (rms >= 0.012) {
      hasSpeechInSegment = true;
      silenceFrames = 0;
    } else {
      silenceFrames++;
    }

    // Check pause commit: ~750ms silence after speech in segment (>= 750ms of audio)
    const isSilenceCommit = hasSpeechInSegment && silenceFrames >= 3 && currentSegmentSamples >= 12000;
    // Check max window duration commit: ~8.5s of audio (136,000 samples)
    const isMaxDurationCommit = currentSegmentSamples >= 136000;

    if (isSilenceCommit || isMaxDurationCommit) {
      // Flatten segment
      const merged = new Float32Array(currentSegmentSamples);
      let mOffset = 0;
      for (const c of currentSegment) {
        merged.set(c, mOffset);
        mOffset += c.length;
      }

      const cleanAudio = trimAudioSilence(merged);
      const t0 = Date.now();
      const res = await transcriber(cleanAudio);
      let inferMs = Date.now() - t0;
      if (cpuThrottle > 1.0) {
        // Simulate CPU throttling overhead
        inferMs = Math.round(inferMs * cpuThrottle);
      }
      latencies.push(inferMs);

      const segmentText = (res.text || '').trim();
      if (segmentText.length > 0) {
        committedText = alignAndAppendPhrases(committedText, segmentText);
        if (timeToFirstWordMs === null) {
          timeToFirstWordMs = Date.now() - startTime;
        }
      }

      if (isMaxDurationCommit) {
        // Keep 1.25s (20,000 samples) as overlap
        const overlapCount = Math.min(20000, currentSegmentSamples);
        const overlapChunk = merged.subarray(currentSegmentSamples - overlapCount);
        const copyOverlap = new Float32Array(overlapChunk.length);
        copyOverlap.set(overlapChunk);
        currentSegment = [copyOverlap];
        currentSegmentSamples = copyOverlap.length;
        hasSpeechInSegment = false;
        silenceFrames = 0;
      } else {
        // Silence pause: clear current segment
        currentSegment = [];
        currentSegmentSamples = 0;
        hasSpeechInSegment = false;
        silenceFrames = 0;
      }

      updateIntervals.push(Date.now() - lastUpdateTime);
      lastUpdateTime = Date.now();
    } else if (currentSegmentSamples >= 8000 && !isSilenceCommit && offset % (stepSamples * 2) === 0) {
      // Interim update: every ~500ms
      const merged = new Float32Array(currentSegmentSamples);
      let mOffset = 0;
      for (const c of currentSegment) {
        merged.set(c, mOffset);
        mOffset += c.length;
      }

      const cleanAudio = trimAudioSilence(merged);
      const t0 = Date.now();
      const res = await transcriber(cleanAudio);
      let inferMs = Date.now() - t0;
      if (cpuThrottle > 1.0) inferMs = Math.round(inferMs * cpuThrottle);
      latencies.push(inferMs);

      const interimText = (res.text || '').trim();
      const combined = alignAndAppendPhrases(committedText, interimText);
      const currentWords = normalizeText(combined).split(' ').filter(Boolean);

      // Check earlier revisions to settled words
      let changes = 0;
      const checkLen = Math.min(settledWords.length, currentWords.length);
      for (let i = 0; i < checkLen; i++) {
        if (settledWords[i] !== currentWords[i]) changes++;
      }
      if (changes > 0) earlierWordRevisions += changes;

      if (currentWords.length > 2) {
        settledWords = currentWords.slice(0, currentWords.length - 1);
      }

      if (interimText.length > 0 && timeToFirstWordMs === null) {
        timeToFirstWordMs = Date.now() - startTime;
      }

      updateIntervals.push(Date.now() - lastUpdateTime);
      lastUpdateTime = Date.now();
    }
  }

  // Final commit of remaining audio
  if (currentSegmentSamples >= 4000) {
    const merged = new Float32Array(currentSegmentSamples);
    let mOffset = 0;
    for (const c of currentSegment) {
      merged.set(c, mOffset);
      mOffset += c.length;
    }
    const cleanAudio = trimAudioSilence(merged);
    const t0 = Date.now();
    const res = await transcriber(cleanAudio);
    let inferMs = Date.now() - t0;
    if (cpuThrottle > 1.0) inferMs = Math.round(inferMs * cpuThrottle);
    latencies.push(inferMs);

    const segmentText = (res.text || '').trim();
    if (segmentText.length > 0) {
      committedText = alignAndAppendPhrases(committedText, segmentText);
    }
  }

  const avgInterval = Math.round(
    updateIntervals.reduce((a, b) => a + b, 0) / Math.max(1, updateIntervals.length)
  );
  const avgLatency = Math.round(
    latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length)
  );
  const words = committedText.split(/\s+/).filter(Boolean);
  const revPerWord = words.length > 0 ? Math.round((earlierWordRevisions / words.length) * 1000) / 1000 : 0;

  return {
    finalText: committedText,
    earlierWordRevisions,
    revisionsPerWord: revPerWord,
    averageUpdateIntervalMs: avgInterval,
    averageLatencyMs: avgLatency,
    timeToFirstWordMs: timeToFirstWordMs ?? avgLatency,
  };
}

function calculateWER(ref, hyp) {
  const rWords = normalizeText(ref).split(' ').filter(Boolean);
  const hWords = normalizeText(hyp).split(' ').filter(Boolean);
  const N = rWords.length;
  if (N === 0) return { wer: 0, substitutions: 0, deletions: 0, insertions: 0, werString: '0%' };

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
  const pcm16 = new Int16Array(wavBuf.buffer, wavBuf.byteOffset + 44, (wavBuf.byteLength - 44) / 2);
  const audioFloat32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    audioFloat32[i] = pcm16[i] / 32768.0;
  }
  const totalDurationSec = audioFloat32.length / 16000;
  console.log(`Audio duration: ${totalDurationSec.toFixed(2)}s (${audioFloat32.length} samples)`);

  // 3. Full audio batch benchmark
  console.log('\n--- 1. Full Audio Batch Pass ---');
  const tFullStart = Date.now();
  const fullResult = await transcriber(audioFloat32);
  const fullLatencyMs = Date.now() - tFullStart;
  const fullRtf = fullLatencyMs / (totalDurationSec * 1000);
  const batchWer = calculateWER(referenceText, fullResult.text);

  console.log(`Batch Transcript: "${fullResult.text}"`);
  console.log(`Batch Latency: ${fullLatencyMs} ms (RTF: ${fullRtf.toFixed(3)}x)`);
  console.log(`Batch WER: ${batchWer.werString} (${batchWer.distance}/${batchWer.refWordsCount} edits)`);

  // 4. Live streaming pipeline simulation (Normal CPU)
  console.log('\n--- 2. Live Pipeline Simulation (Normal CPU) ---');
  const liveNormal = await simulateLivePipeline(transcriber, audioFloat32, { cpuThrottle: 1.0 });
  const liveWer = calculateWER(referenceText, liveNormal.finalText);
  const isIdenticalNormal = normalizeText(liveNormal.finalText) === normalizeText(fullResult.text);

  console.log(`Live Normal Transcript: "${liveNormal.finalText}"`);
  console.log(`Live Normal WER: ${liveWer.werString} (${liveWer.distance}/${liveWer.refWordsCount} edits)`);
  console.log(`Equals Batch Pass: ${isIdenticalNormal ? 'YES (100% Word Match)' : 'NO (Boundary variation)'}`);
  console.log(`Time to First Word: ${liveNormal.timeToFirstWordMs} ms`);
  console.log(`Average Segment Latency: ${liveNormal.averageLatencyMs} ms`);
  console.log(`Average Update Interval: ${liveNormal.averageUpdateIntervalMs} ms`);
  console.log(`Word Revisions: ${liveNormal.earlierWordRevisions} (${liveNormal.revisionsPerWord} revisions/word)`);

  // 5. Live streaming pipeline simulation (4x CPU Throttle)
  console.log('\n--- 3. Live Pipeline Simulation (4x CPU Throttle Simulation) ---');
  const live4x = await simulateLivePipeline(transcriber, audioFloat32, { cpuThrottle: 4.0 });
  const liveWer4x = calculateWER(referenceText, live4x.finalText);
  const isIdentical4x = normalizeText(live4x.finalText) === normalizeText(fullResult.text);

  console.log(`Live 4x Throttle Transcript: "${live4x.finalText}"`);
  console.log(`Live 4x Throttle WER: ${liveWer4x.werString} (${liveWer4x.distance}/${liveWer4x.refWordsCount} edits)`);
  console.log(`Equals Batch Pass: ${isIdentical4x ? 'YES (100% Word Match)' : 'NO (Boundary variation)'}`);
  console.log(`Time to First Word: ${live4x.timeToFirstWordMs} ms`);
  console.log(`Average Segment Latency (4x): ${live4x.averageLatencyMs} ms`);
  console.log(`Average Update Interval (4x): ${live4x.averageUpdateIntervalMs} ms`);
  console.log(`Word Revisions: ${live4x.earlierWordRevisions} (${live4x.revisionsPerWord} revisions/word)`);

  const report = {
    timestamp: new Date().toISOString(),
    model: 'onnx-community/moonshine-tiny-ONNX',
    weightsSize: '28.18 MB (encoder: 7.9 MB, decoder: 20.2 MB)',
    singleThreaded: true,
    audioFile: AUDIO_PATH,
    audioDurationSec: totalDurationSec,
    coldLoadTimeMs: loadTimeMs,
    batchPass: {
      latencyMs: fullLatencyMs,
      rtf: Math.round(fullRtf * 1000) / 1000,
      transcript: fullResult.text,
      wer: batchWer.werString,
      distance: batchWer.distance,
      refWordsCount: batchWer.refWordsCount,
    },
    liveNormalCpu: {
      transcript: liveNormal.finalText,
      wer: liveWer.werString,
      distance: liveWer.distance,
      equalsBatchPass: isIdenticalNormal,
      timeToFirstWordMs: liveNormal.timeToFirstWordMs,
      averageLatencyMs: liveNormal.averageLatencyMs,
      averageUpdateIntervalMs: liveNormal.averageUpdateIntervalMs,
      earlierWordRevisions: liveNormal.earlierWordRevisions,
      revisionsPerWord: liveNormal.revisionsPerWord,
    },
    live4xThrottle: {
      transcript: live4x.finalText,
      wer: liveWer4x.werString,
      distance: liveWer4x.distance,
      equalsBatchPass: isIdentical4x,
      timeToFirstWordMs: live4x.timeToFirstWordMs,
      averageLatencyMs: live4x.averageLatencyMs,
      averageUpdateIntervalMs: live4x.averageUpdateIntervalMs,
      earlierWordRevisions: live4x.earlierWordRevisions,
      revisionsPerWord: live4x.revisionsPerWord,
    },
    referenceText,
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
