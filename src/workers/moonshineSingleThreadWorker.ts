/// <reference lib="webworker" />
/**
 * Web Worker for Single-Threaded Moonshine Tiny ASR
 *
 * Runs onnx-community/moonshine-tiny-ONNX via @huggingface/transformers
 * with numThreads = 1 so that it executes entirely in a single WASM thread
 * with ZERO SharedArrayBuffer and NO COOP/COEP headers required.
 */

import { pipeline, env } from '@huggingface/transformers';

// Mandatory invariant: Single-threaded WASM execution (works on GitHub Pages without custom headers)
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let transcriberPromise: Promise<any> | null = null;
let isBusy = false;

async function getTranscriber(): Promise<any> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'onnx-community/moonshine-tiny-ONNX',
      {
        dtype: 'q8',
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
      } as any
    );
    transcriberPromise.catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, op, payload } = e.data;

  if (op === 'init') {
    try {
      const t0 = performance.now();
      await getTranscriber();
      const loadTimeMs = Math.round(performance.now() - t0);
      self.postMessage({ id, type: 'init_done', loadTimeMs });
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
      const audio = new Float32Array(payload.audio);
      const res = await transcriber(audio);
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

  if (op === 'reset') {
    isBusy = false;
    self.postMessage({ id, type: 'reset_done' });
  }
};
