/// <reference lib="webworker" />
/**
 * Web Worker for Single-Threaded ASR (Moonshine & Whisper)
 *
 * Runs onnx-community/moonshine-tiny-ONNX, moonshine-base-ONNX,
 * whisper-tiny.en, or whisper-base.en via @huggingface/transformers.
 * Configured with numThreads = 1 so that it executes in a single WASM thread
 * with ZERO SharedArrayBuffer and NO COOP/COEP headers required.
 * Also supports device = 'webgpu' where available with automatic wasm fallback.
 */

import { pipeline, env } from '@huggingface/transformers';

// Mandatory invariant: Single-threaded WASM execution (works on GitHub Pages without custom headers)
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let currentModelId = 'onnx-community/moonshine-tiny-ONNX';
let currentDevice = 'wasm';
let currentDtype = 'q8';
let transcriberPromise: Promise<any> | null = null;
let isBusy = false;

async function getTranscriber(
  modelId = currentModelId,
  device = currentDevice,
  dtype = currentDtype
): Promise<any> {
  if (
    !transcriberPromise ||
    currentModelId !== modelId ||
    currentDevice !== device ||
    currentDtype !== dtype
  ) {
    currentModelId = modelId;
    currentDevice = device;
    currentDtype = dtype;

    transcriberPromise = (async () => {
      try {
        return await pipeline('automatic-speech-recognition', modelId, {
          dtype,
          device,
          progress_callback: (p: any) => {
            if (p.status === 'progress') {
              self.postMessage({
                type: 'progress',
                file: p.file,
                loaded: p.loaded,
                total: p.total,
                progress: p.progress,
              });
            }
          },
        } as any);
      } catch (err) {
        if (device === 'webgpu') {
          console.warn('[ASRWorker] WebGPU initialization failed, falling back to WASM:', err);
          currentDevice = 'wasm';
          return await pipeline('automatic-speech-recognition', modelId, {
            dtype,
            device: 'wasm',
            progress_callback: (p: any) => {
              if (p.status === 'progress') {
                self.postMessage({
                  type: 'progress',
                  file: p.file,
                  loaded: p.loaded,
                  total: p.total,
                  progress: p.progress,
                });
              }
            },
          } as any);
        }
        throw err;
      }
    })();

    transcriberPromise.catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

function extractAudio(payload: any): Float32Array {
  if (payload.audio instanceof Float32Array) {
    return payload.audio;
  }
  const buffer = payload.audio as ArrayBuffer;
  const byteOffset = payload.byteOffset || 0;
  const length = payload.length ?? (buffer.byteLength - byteOffset) / 4;
  return new Float32Array(buffer, byteOffset, length);
}

function getTranscribeOptions(audioLenSamples: number): Record<string, any> {
  const isWhisper = currentModelId.toLowerCase().includes('whisper');
  if (isWhisper && audioLenSamples > 28 * 16000) {
    // For audio longer than ~28s, Whisper requires chunking
    return { chunk_length_s: 30, stride_length_s: 5, return_timestamps: false };
  }
  return {};
}

self.onmessage = async (e: MessageEvent) => {
  const { id, op, payload } = e.data;

  if (op === 'init') {
    try {
      const modelId = payload?.modelId || currentModelId;
      const device = payload?.device || currentDevice;
      const dtype = payload?.dtype || currentDtype;

      const t0 = performance.now();
      await getTranscriber(modelId, device, dtype);
      const loadTimeMs = Math.round(performance.now() - t0);
      self.postMessage({ id, type: 'init_done', loadTimeMs, modelId, device });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: (err as Error).message });
    }
    return;
  }

  if (op === 'transcribe') {
    if (isBusy) {
      self.postMessage({ id, type: 'busy' });
      return;
    }
    isBusy = true;
    try {
      const t0 = performance.now();
      const transcriber = await getTranscriber();
      const audio = extractAudio(payload);
      const opts = getTranscribeOptions(audio.length);
      const res = await transcriber(audio, opts);
      const inferMs = Math.round(performance.now() - t0);
      self.postMessage({
        id,
        type: 'result',
        text: (res?.text || '').trim(),
        inferMs,
        sampleCount: audio.length,
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: (err as Error).message });
    } finally {
      isBusy = false;
    }
    return;
  }

  if (op === 'commit') {
    // If worker is busy with interim transcribe, wait until it finishes
    while (isBusy) {
      await new Promise((r) => setTimeout(r, 20));
    }
    isBusy = true;
    try {
      const t0 = performance.now();
      const transcriber = await getTranscriber();
      const audio = extractAudio(payload);
      const opts = getTranscribeOptions(audio.length);
      const res = await transcriber(audio, opts);
      const inferMs = Math.round(performance.now() - t0);
      self.postMessage({
        id,
        type: 'commit_result',
        text: (res?.text || '').trim(),
        inferMs,
        sampleCount: audio.length,
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: (err as Error).message });
    } finally {
      isBusy = false;
    }
    return;
  }

  if (op === 'batch') {
    while (isBusy) {
      await new Promise((r) => setTimeout(r, 20));
    }
    isBusy = true;
    try {
      const t0 = performance.now();
      const transcriber = await getTranscriber();
      const audio = extractAudio(payload);
      const opts = getTranscribeOptions(audio.length);
      const res = await transcriber(audio, opts);
      const inferMs = Math.round(performance.now() - t0);
      self.postMessage({
        id,
        type: 'batch_result',
        text: (res?.text || '').trim(),
        inferMs,
        sampleCount: audio.length,
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: (err as Error).message });
    } finally {
      isBusy = false;
    }
    return;
  }

  if (op === 'reset') {
    isBusy = false;
    self.postMessage({ id, type: 'reset_done' });
  }
};
