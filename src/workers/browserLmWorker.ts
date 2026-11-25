/// <reference lib="webworker" />

import {
  AutoModelForCausalLM,
  AutoTokenizer,
  env,
  InterruptableStoppingCriteria,
  LogitsProcessor,
  LogitsProcessorList,
  type Tensor,
} from '@huggingface/transformers';
import {
  createSeededRandom,
  sampleFromLogits,
  type SamplingOptions,
} from '../viz/playground/browserLmSampling';

const MODEL_ID = 'Xenova/gpt2';
const MODEL_CONTEXT = 1024;

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;

type RuntimeDevice = 'webgpu' | 'wasm';

interface GeneratePayload extends SamplingOptions {
  prompt: string;
  maxNewTokens: number;
  seed: number;
}

interface WorkerRequest {
  type: 'load' | 'generate' | 'stop';
  runId?: number;
  payload?: GeneratePayload;
}

let tokenizer: any = null;
let model: any = null;
let runtimeDevice: RuntimeDevice | null = null;
let loading: Promise<void> | null = null;
let generating = false;
let activeStop: InterruptableStoppingCriteria | null = null;
let activeRunId = 0;

const progressFiles = new Map<string, { loaded: number; total: number }>();

function post(message: Record<string, unknown>) {
  self.postMessage(message);
}

function technicalMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function decodeToken(id: number): string {
  const text = tokenizer.decode([id], {
    skip_special_tokens: false,
    clean_up_tokenization_spaces: false,
  });
  return text || `[token ${id}]`;
}

function reportProgress(progress: any) {
  const file = String(progress?.file ?? progress?.name ?? 'model files');
  if (progress?.status === 'progress') {
    const loaded = Number(progress.loaded ?? 0);
    const total = Number(progress.total ?? 0);
    if (total > 0) progressFiles.set(file, { loaded, total });
  }
  const totals = [...progressFiles.values()].reduce(
    (sum, item) => ({ loaded: sum.loaded + item.loaded, total: sum.total + item.total }),
    { loaded: 0, total: 0 },
  );
  post({
    type: 'progress',
    file,
    status: String(progress?.status ?? 'loading'),
    loaded: totals.loaded,
    total: totals.total,
    percent: totals.total > 0 ? Math.min(100, (totals.loaded / totals.total) * 100) : 0,
  });
}

async function canUseWebGpu(): Promise<boolean> {
  const gpu = (self.navigator as Navigator & {
    gpu?: { requestAdapter: () => Promise<unknown> };
  }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function loadForDevice(device: RuntimeDevice) {
  post({
    type: 'status',
    message: device === 'webgpu'
      ? 'Starting the int8 model with WebGPU…'
      : 'Starting the int8 model with WebAssembly…',
  });
  return AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: 'int8',
    device,
    progress_callback: reportProgress,
  } as any);
}

async function loadModel() {
  if (model && tokenizer && runtimeDevice) {
    post({ type: 'ready', modelId: MODEL_ID, device: runtimeDevice });
    return;
  }
  if (loading) return loading;

  loading = (async () => {
    progressFiles.clear();
    post({ type: 'status', message: 'Loading the GPT-2 tokenizer…' });
    tokenizer ??= await AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback: reportProgress,
    } as any);

    const webGpuAvailable = await canUseWebGpu();
    let webGpuError: unknown = null;
    if (webGpuAvailable) {
      try {
        model = await loadForDevice('webgpu');
        runtimeDevice = 'webgpu';
      } catch (error) {
        webGpuError = error;
        model = null;
        post({
          type: 'fallback',
          message: 'WebGPU could not start this model. Retrying with WebAssembly and the same browser-cached files…',
        });
      }
    }

    if (!model) {
      try {
        model = await loadForDevice('wasm');
        runtimeDevice = 'wasm';
      } catch (wasmError) {
        const detail = webGpuError
          ? `WebGPU: ${technicalMessage(webGpuError)}; WebAssembly: ${technicalMessage(wasmError)}`
          : technicalMessage(wasmError);
        throw new Error(`The browser could not start the int8 GPT-2 model. ${detail}`);
      }
    }

    post({ type: 'ready', modelId: MODEL_ID, device: runtimeDevice });
  })();

  try {
    await loading;
  } finally {
    loading = null;
  }
}

class InspectAndChooseLogits extends LogitsProcessor {
  private readonly random: () => number;
  private readonly runId: number;
  private readonly options: SamplingOptions;
  private readonly startedAt = performance.now();
  private lastStepAt = this.startedAt;
  private decodeTimeMs = 0;
  private firstTokenMs: number | null = null;
  stepCount = 0;

  constructor(
    runId: number,
    options: SamplingOptions,
    seed: number,
  ) {
    super();
    this.runId = runId;
    this.options = options;
    this.random = createSeededRandom(seed);
  }

  _call(_inputIds: bigint[][], logits: Tensor): Tensor {
    const now = performance.now();
    if (this.stepCount === 0) this.firstTokenMs = now - this.startedAt;
    else this.decodeTimeMs += now - this.lastStepAt;
    this.lastStepAt = now;

    const values = Array.from(logits.data as Float32Array, Number);
    const result = sampleFromLogits(values, this.options, this.random);
    const chosen = result.candidates.find((candidate) => candidate.id === result.selectedId)!;
    const candidates = result.candidates.slice(0, 10).map((candidate) => ({
      ...candidate,
      text: decodeToken(candidate.id),
    }));

    post({
      type: 'token',
      runId: this.runId,
      step: this.stepCount,
      token: { ...chosen, text: decodeToken(result.selectedId) },
      candidates,
      ttftMs: this.firstTokenMs,
      msPerToken: this.stepCount > 0 ? this.decodeTimeMs / this.stepCount : null,
    });

    const mutable = logits.data as Float32Array;
    mutable.fill(-Infinity);
    mutable[result.selectedId] = 0;
    this.stepCount += 1;
    return logits;
  }

  metrics() {
    return {
      ttftMs: this.firstTokenMs,
      msPerToken: this.stepCount > 1 ? this.decodeTimeMs / (this.stepCount - 1) : null,
      generatedTokens: this.stepCount,
      totalMs: performance.now() - this.startedAt,
    };
  }
}

async function generate(runId: number, payload: GeneratePayload) {
  if (!model || !tokenizer || !runtimeDevice) throw new Error('Load the model before generating.');
  if (generating) throw new Error('A generation is already running.');
  generating = true;
  activeRunId = runId;
  const maxNewTokens = Math.max(1, Math.min(80, Math.floor(payload.maxNewTokens)));
  const maxPromptTokens = MODEL_CONTEXT - maxNewTokens;
  const inputs = tokenizer(payload.prompt, {
    truncation: true,
    max_length: maxPromptTokens,
  });
  const promptIds = (inputs.input_ids.tolist()[0] as Array<number | bigint>).map(Number);
  const promptTokens = promptIds.map((id) => ({ id, text: decodeToken(id) }));
  post({
    type: 'prompt-tokens',
    runId,
    tokens: promptTokens,
    truncated: tokenizer.encode(payload.prompt, { add_special_tokens: false }).length > promptIds.length,
  });

  try {
    const runOnce = async () => {
      activeStop = new InterruptableStoppingCriteria();
      const inspector = new InspectAndChooseLogits(runId, {
        temperature: payload.temperature,
        topK: payload.topK,
        topP: payload.topP,
        greedy: payload.greedy,
      }, payload.seed);
      const processors = new LogitsProcessorList();
      processors.push(inspector);

      post({ type: 'generation-started', runId, device: runtimeDevice });
      const output = await model.generate({
        ...inputs,
        max_new_tokens: maxNewTokens,
        do_sample: false,
        logits_processor: processors,
        stopping_criteria: [activeStop],
        pad_token_id: tokenizer.eos_token_id,
      } as any);
      output?.dispose?.();
      return { inspector, stopped: activeStop.interrupted };
    };

    let result;
    try {
      result = await runOnce();
    } catch (error) {
      if (runtimeDevice !== 'webgpu' || activeStop?.interrupted) throw error;
      post({
        type: 'fallback',
        runId,
        message: 'WebGPU failed during generation. Restarting this run with WebAssembly and the cached int8 files…',
      });
      post({ type: 'generation-restarted', runId });
      await model?.dispose?.();
      model = null;
      runtimeDevice = null;
      model = await loadForDevice('wasm');
      runtimeDevice = 'wasm';
      result = await runOnce();
    }

    post({
      type: result.stopped ? 'stopped' : 'done',
      runId,
      ...result.inspector.metrics(),
    });
  } finally {
    if (activeRunId === runId) activeStop = null;
    generating = false;
  }
}

async function handle(request: WorkerRequest) {
  try {
    if (request.type === 'load') {
      await loadModel();
      return;
    }
    if (request.type === 'generate' && request.payload && request.runId !== undefined) {
      await generate(request.runId, request.payload);
      return;
    }
    throw new Error(`Unknown browser LM worker request: ${request.type}`);
  } catch (error) {
    post({
      type: 'error',
      runId: request.runId,
      scope: request.type,
      message: technicalMessage(error),
    });
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === 'stop') {
    activeStop?.interrupt();
    return;
  }
  void handle(event.data);
};
