/// <reference lib="webworker" />
// Mock interview engine, entirely on the learner's device (no API, no cost):
// Whisper base.en for speech-to-text and all-MiniLM-L6-v2 for comparing an
// answer with each criterion. Models download once and are cached by the browser.
// Same loading pattern as VaayuEdge's browser engine.
import { env, pipeline } from '@huggingface/transformers';

const MODELS = { asr: 'onnx-community/whisper-base.en', embed: 'Xenova/all-MiniLM-L6-v2' } as const;
type Task = keyof typeof MODELS;

env.allowLocalModels = false;
env.useBrowserCache = true;

const pipes: Partial<Record<Task, Promise<any>>> = {};

async function device(): Promise<'webgpu' | 'wasm'> {
  try { return (await (navigator as any).gpu?.requestAdapter()) ? 'webgpu' : 'wasm'; } catch { return 'wasm'; }
}

function load(task: Task) {
  if (!pipes[task]) {
    pipes[task] = device().then(dev => pipeline(
      (task === 'asr' ? 'automatic-speech-recognition' : 'feature-extraction') as any,
      MODELS[task],
      {
        device: task === 'embed' ? 'wasm' : dev,
        dtype: 'q8',
        progress_callback: (p: any) => {
          if (p.status === 'progress') self.postMessage({ type: 'progress', task, file: p.file, loaded: p.loaded, total: p.total });
        },
      } as any,
    ));
    pipes[task]!.catch(() => delete pipes[task]);
  }
  return pipes[task]!;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, op, payload } = e.data;
  try {
    let result: unknown;
    if (op === 'init') {
      try { await load('embed'); await load('asr'); }
      catch (err) {
        // A corrupted cached file fails forever; wipe the cache and retry once.
        if (!(err instanceof SyntaxError)) throw err;
        await caches.delete('transformers-cache');
        await load('embed'); await load('asr');
      }
      result = true;
    } else if (op === 'transcribe') {
      const asr = await load('asr');
      const out = await asr(payload.audio as Float32Array, { chunk_length_s: 30, stride_length_s: 5 });
      result = String(out.text ?? '').trim();
    } else if (op === 'embed') {
      const fe = await load('embed');
      const out = await fe(payload.texts as string[], { pooling: 'mean', normalize: true });
      result = out.tolist();
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
