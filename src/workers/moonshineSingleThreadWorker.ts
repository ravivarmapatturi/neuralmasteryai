/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';
import { transcribeMoonshineLongAudio } from '../lib/speechTest/moonshineLongAudio';
import { transcribeWithPrompt } from '../lib/speechTest/whisperPrompt';
import { ASR_MODEL_REVISIONS } from '../lib/speechTest/modelVersions';

env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let modelId = 'onnx-community/moonshine-tiny-ONNX';
let requestedDevice = 'wasm';
let actualDevice = 'wasm';
let dtype: any = 'q8';
let transcriber: any = null;
let backgroundChunks: Array<{ stride: number[]; tokens: any[]; is_last?: boolean }> = [];

const progress = (p: any) => {
  if (p.status === 'progress') self.postMessage({ type: 'progress', file: `${modelId}/${p.file}`, loaded: p.loaded, total: p.total, progress: p.progress });
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
    if (actualDevice !== 'webgpu' || nextModel.includes('large-v3-turbo')) throw error;
    actualDevice = 'wasm';
    transcriber = await pipeline('automatic-speech-recognition', modelId, { revision: ASR_MODEL_REVISIONS[modelId] ?? 'main', dtype, device: 'wasm', progress_callback: progress } as any);
  }
  return transcriber;
}

async function handle({ id, op, payload }: any) {
  try {
    if (op === 'reset') {
      backgroundChunks = [];
      self.postMessage({ id, type: 'reset_done' });
      return;
    }
    if (op === 'init') {
      backgroundChunks = [];
      const start = performance.now();
      // Warm the final model in the background, dispose it, then prepare live speech.
      // No two model sessions coexist, including during first-use downloads.
      if (payload?.preloadModelId) await initialize(payload.preloadModelId, payload.preloadDevice, payload.preloadDtype);
      await initialize(payload?.modelId, payload?.device, payload?.dtype);
      self.postMessage({ id, type: 'init_done', loadTimeMs: Math.round(performance.now() - start), modelId, device: actualDevice, requestedDevice });
      return;
    }
    if (!['transcribe', 'commit', 'batch'].includes(op)) throw new Error(`Unknown speech operation: ${op}`);
    const start = performance.now();
    const pipe = await initialize(payload?.modelId, payload?.device, payload?.dtype);
    self.postMessage({ id, type: 'model_ready', device: actualDevice });
    const audio = payload.audio instanceof Float32Array ? payload.audio : new Float32Array(payload.audio, payload.byteOffset ?? 0, payload.length);
    const prompt = modelId.includes('whisper') ? (payload.initialPrompt ?? '') : '';

    // (a) Background completed overlapping window decoding for Whisper Base.en
    if (op === 'batch' && payload?.mode === 'window' && modelId.includes('whisper')) {
      const { chunkIndex, isFirst } = payload;
      const sampling_rate = 16000;
      const stride = 80000;
      const is_first = Boolean(isFirst);
      const strideTuple = [audio.length, is_first ? 0 : stride, stride];
      const hop_length = pipe.processor.feature_extractor.config.hop_length;
      const feature = await pipe.processor(audio);
      const generation_config: any = {
        num_frames: Math.floor(audio.length / hop_length),
        return_timestamps: true,
      };
      let data;
      if (prompt) {
        const prefix = [
          ...pipe.tokenizer.encode('<|startofprev|>', { add_special_tokens: false }),
          ...pipe.tokenizer.encode(' ' + prompt, { add_special_tokens: false }).slice(-64),
        ];
        const model = pipe.model;
        const generate = model.generate;
        model.generate = async function (args: any) {
          const config = this._prepare_generation_config(args.generation_config, args);
          const initial = this._retrieve_init_tokens(config);
          const res = await generate.call(this, { ...args, decoder_input_ids: [...prefix, ...initial] });
          return res.slice(null, [prefix.length, res.dims[1]]);
        };
        try {
          data = await pipe.model.generate({ inputs: feature.input_features, ...generation_config });
        } finally {
          model.generate = generate;
        }
      } else {
        data = await pipe.model.generate({ inputs: feature.input_features, ...generation_config });
      }
      const tokens = data[0].tolist();
      backgroundChunks[chunkIndex] = {
        stride: strideTuple.map((x: number) => x / sampling_rate),
        tokens,
        is_last: false,
      };
      self.postMessage({ id, type: 'window_result', chunkIndex, inferMs: Math.round(performance.now() - start) });
      return;
    }

    // (a) Decode remaining tail and merge with pre-decoded background windows
    if (op === 'batch' && payload?.mode === 'tail' && modelId.includes('whisper') && backgroundChunks.length > 0) {
      const { chunkIndex, isFirst } = payload;
      const sampling_rate = 16000;
      const stride = 80000;
      const is_first = Boolean(isFirst);
      const strideTuple = [audio.length, is_first ? 0 : stride, 0];
      const hop_length = pipe.processor.feature_extractor.config.hop_length;
      const feature = await pipe.processor(audio);
      const generation_config: any = {
        num_frames: Math.floor(audio.length / hop_length),
        return_timestamps: true,
      };
      let data;
      if (prompt) {
        const prefix = [
          ...pipe.tokenizer.encode('<|startofprev|>', { add_special_tokens: false }),
          ...pipe.tokenizer.encode(' ' + prompt, { add_special_tokens: false }).slice(-64),
        ];
        const model = pipe.model;
        const generate = model.generate;
        model.generate = async function (args: any) {
          const config = this._prepare_generation_config(args.generation_config, args);
          const initial = this._retrieve_init_tokens(config);
          const res = await generate.call(this, { ...args, decoder_input_ids: [...prefix, ...initial] });
          return res.slice(null, [prefix.length, res.dims[1]]);
        };
        try {
          data = await pipe.model.generate({ inputs: feature.input_features, ...generation_config });
        } finally {
          model.generate = generate;
        }
      } else {
        data = await pipe.model.generate({ inputs: feature.input_features, ...generation_config });
      }
      const tokens = data[0].tolist();
      backgroundChunks[chunkIndex] = {
        stride: strideTuple.map((x: number) => x / sampling_rate),
        tokens,
        is_last: true,
      };
      const time_precision = pipe.processor.feature_extractor.config.chunk_length / pipe.model.config.max_source_positions;
      const [full_text] = pipe.tokenizer._decode_asr(backgroundChunks, {
        time_precision,
        return_timestamps: true,
        force_full_sequences: true,
      });
      const text = (full_text || '').trim();
      backgroundChunks = [];
      self.postMessage({
        id,
        type: 'batch_result',
        text,
        inferMs: Math.round(performance.now() - start),
        totalMs: Math.round(performance.now() - start),
        device: actualDevice,
        modelId,
        sampleCount: audio.length,
      });
      return;
    }

    const options = modelId.includes('whisper') && audio.length > 28 * 16000
      ? { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true } : {};
    const decodeStart = performance.now();
    let result;
    try { result = !modelId.includes('whisper') && audio.length > 136000 ? await transcribeMoonshineLongAudio(pipe, audio) : await transcribeWithPrompt(pipe, audio, options, prompt); } catch (error) {
      if (actualDevice !== 'webgpu') throw error;
      // Some GPU kernels fail only on the first generation, after a successful load.
      const wasm = await initialize(payload.fallbackModelId ?? modelId, 'wasm', payload.fallbackModelId ? 'q8' : dtype);
      self.postMessage({ id, type: 'model_ready', device: actualDevice });
      result = await transcribeWithPrompt(wasm, audio, options, prompt);
    }
    backgroundChunks = [];
    self.postMessage({ id, type: op === 'transcribe' ? 'result' : `${op}_result`, text: (result?.text ?? '').trim(), inferMs: Math.round(performance.now() - decodeStart), totalMs: Math.round(performance.now() - start), prompted: Boolean(prompt), sampleCount: audio.length, device: actualDevice, modelId });
  } catch (error) {
    backgroundChunks = [];
    self.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

// One FIFO for init, interim, commit, final pass and reset. No polling locks and
// no two callers can observe an idle flag and enter inference simultaneously.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent) => { queue = queue.then(() => handle(event.data)); };
