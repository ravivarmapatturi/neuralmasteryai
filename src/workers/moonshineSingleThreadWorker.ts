/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';
import { ASR_MODEL_REVISIONS } from '../lib/speechTest/modelVersions';

env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let modelId = 'onnx-community/moonshine-tiny-ONNX';
let requestedDevice = 'wasm';
let actualDevice = 'wasm';
let dtype = 'q8';
let transcriber: any = null;

const progress = (p: any) => {
  if (p.status === 'progress') self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total, progress: p.progress });
};

async function initialize(nextModel = modelId, nextDevice = requestedDevice, nextDtype = dtype) {
  if (transcriber && modelId === nextModel && requestedDevice === nextDevice && dtype === nextDtype) return transcriber;
  // Release the live model before loading a different final-pass model on small devices.
  if (transcriber) await transcriber.dispose();
  transcriber = null;
  modelId = nextModel;
  requestedDevice = nextDevice;
  dtype = nextDtype;
  actualDevice = nextDevice;
  if (nextDevice === 'webgpu') {
    // Presence of navigator.gpu is insufficient. Avoid poisoning ORT's GPU backend
    // initialization when no adapter is available at all.
    const gpu = (self.navigator as Navigator & { gpu?: GPU }).gpu;
    try {
      const adapter = await gpu?.requestAdapter();
      if (!adapter) actualDevice = 'wasm';
    } catch { actualDevice = 'wasm'; }
  }
  try {
    transcriber = await pipeline('automatic-speech-recognition', modelId, { revision: ASR_MODEL_REVISIONS[modelId] ?? 'main', dtype, device: actualDevice, progress_callback: progress } as any);
  } catch (error) {
    if (actualDevice !== 'webgpu') throw error;
    actualDevice = 'wasm';
    transcriber = await pipeline('automatic-speech-recognition', modelId, { revision: ASR_MODEL_REVISIONS[modelId] ?? 'main', dtype, device: 'wasm', progress_callback: progress } as any);
  }
  return transcriber;
}

async function handle({ id, op, payload }: any) {
  try {
    if (op === 'reset') { self.postMessage({ id, type: 'reset_done' }); return; }
    if (op === 'init') {
      const start = performance.now();
      await initialize(payload?.modelId, payload?.device, payload?.dtype);
      self.postMessage({ id, type: 'init_done', loadTimeMs: Math.round(performance.now() - start), modelId, device: actualDevice, requestedDevice });
      return;
    }
    if (!['transcribe', 'commit', 'batch'].includes(op)) throw new Error(`Unknown speech operation: ${op}`);
    const start = performance.now();
    const pipe = await initialize(payload?.modelId, payload?.device, payload?.dtype);
    self.postMessage({ type: 'model_ready', device: actualDevice });
    const audio = payload.audio instanceof Float32Array ? payload.audio : new Float32Array(payload.audio, payload.byteOffset ?? 0, payload.length);
    const options = modelId.includes('whisper') && audio.length > 28 * 16000
      ? { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true } : {};
    let result;
    try { result = await pipe(audio, options); } catch (error) {
      if (actualDevice !== 'webgpu') throw error;
      // Some GPU kernels fail only on the first generation, after a successful load.
      const wasm = await initialize(modelId, 'wasm', dtype);
      self.postMessage({ type: 'model_ready', device: actualDevice });
      result = await wasm(audio, options);
    }
    self.postMessage({ id, type: op === 'transcribe' ? 'result' : `${op}_result`, text: (result?.text ?? '').trim(), inferMs: Math.round(performance.now() - start), sampleCount: audio.length, device: actualDevice });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

// One FIFO for init, interim, commit, final pass and reset. No polling locks and
// no two callers can observe an idle flag and enter inference simultaneously.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent) => { queue = queue.then(() => handle(event.data)); };
