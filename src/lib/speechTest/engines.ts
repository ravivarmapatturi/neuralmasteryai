import { decodeRealTimeFactor, refinementBudgetMs } from './refinementPolicy';
import { normalizeQuietAudio, appendPhrase, chooseFinalTranscript } from './audioPreparation';

/**
 * Speech Recognition Engines:
 * 1. Browser Speech Recognition (Web Speech API)
 * 2. Moonshine Tiny Single-Threaded (ONNX Runtime Web in Web Worker)
 */

export interface EngineMetrics {
  status: 'idle' | 'loading' | 'ready' | 'listening' | 'error';
  partialText: string;
  finalText: string;
  timeToFirstWordMs: number | null;
  lagBehindSpeechMs: number | null;
  downloadBytes: number;
  downloadProgressPct: number;
  loadTimeMs: number | null;
  peakJSHeapMB: number | null;
  device: string;
  browser: string;
  errorMessage: string | null;
  updateIntervalMs?: number | null;
  earlierWordRevisions?: number;
  revisionsPerWord?: number;
  batchTranscript?: string;
  rawBatchTranscript?: string;
  finalPassWarning?: string;
  liveDecodeRTF?: number;
  finalDecodeRTF?: number;
  refinementDecision?: 'accepted' | 'skipped-slow' | 'aborted-slow' | 'failed';
  initialPrompt?: string;
  captureSampleRate?: number;
  inputSampleRate?: number;
  captureBackend?: 'audio-worklet' | 'script-processor';
  capturedSamples?: number;
  inputTrackSettings?: MediaTrackSettings;
  isIdenticalToBatch?: boolean;
}

export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua) && /Android/.test(ua)) return 'Chrome (Android)';
  if (/Chrome\//.test(ua)) return 'Google Chrome (Desktop)';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Modern Browser';
}

export function getJSHeapMB(): number | null {
  if (typeof performance !== 'undefined' && (performance as any).memory?.usedJSHeapSize) {
    return Math.round(((performance as any).memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
  }
  return null;
}

export interface EngineListener {
  (metrics: EngineMetrics): void;
}

export abstract class BaseSpeechEngine {
  abstract readonly id: string;
  abstract readonly name: string;
  protected metrics: EngineMetrics;
  protected listeners: Set<EngineListener> = new Set();
  protected speechStartTime: number | null = null;
  protected listeningStartTime: number | null = null;
  protected hasEmittedFirstWord = false;
  protected lastAudioSpeechTime = 0;

  constructor() {
    this.metrics = {
      status: 'idle',
      partialText: '',
      finalText: '',
      timeToFirstWordMs: null,
      lagBehindSpeechMs: null,
      downloadBytes: 0,
      downloadProgressPct: 0,
      loadTimeMs: null,
      peakJSHeapMB: getJSHeapMB(),
      device: 'Unknown',
      browser: detectBrowser(),
      errorMessage: null,
    };
  }

  public subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.metrics });
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected updateMetrics(partial: Partial<EngineMetrics>) {
    const heap = getJSHeapMB();
    this.metrics = {
      ...this.metrics,
      ...partial,
      peakJSHeapMB: heap !== null ? Math.max(this.metrics.peakJSHeapMB ?? 0, heap) : this.metrics.peakJSHeapMB,
    };
    for (const listener of this.listeners) {
      listener({ ...this.metrics });
    }
  }

  public getMetrics(): EngineMetrics {
    return { ...this.metrics };
  }

  public getLastAudioSpeechTime(): number {
    return this.lastAudioSpeechTime;
  }

  public onSpeechActivity(isSpeaking: boolean, timestamp?: number) {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (isSpeaking && !this.speechStartTime) {
      this.speechStartTime = time;
    } else if (!isSpeaking) {
      // Speech paused or stopped
    }
  }

  abstract load(): Promise<void>;
  abstract start(stream: MediaStream): Promise<void>;
  abstract stop(): Promise<void>;
  abstract reset(): void;
  abstract destroy(): void;
}

/**
 * Option 1: Browser Speech Recognition (Web Speech API)
 * with interimResults = true and continuous = true.
 */
export class BrowserSpeechEngine extends BaseSpeechEngine {
  readonly id = 'browser';
  readonly name = 'Browser Speech Recognition (interimResults)';
  private recognition: any = null;
  private isActive = false;

  constructor() {
    super();
    this.metrics.device = 'Cloud / Platform Speech Service';
    this.metrics.downloadBytes = 0;
    this.metrics.loadTimeMs = 0;
  }

  public async load(): Promise<void> {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      this.updateMetrics({
        status: 'error',
        errorMessage: 'Web Speech API is not supported in this browser. Please use Google Chrome or Edge.',
      });
      throw new Error('Web Speech API not supported');
    }
    this.updateMetrics({ status: 'ready', errorMessage: null, loadTimeMs: 0 });
  }

  public async start(_stream: MediaStream): Promise<void> {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      this.updateMetrics({ status: 'error', errorMessage: 'Web Speech API not supported.' });
      return;
    }

    this.isActive = true;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();
    this.updateMetrics({ status: 'listening', partialText: '', errorMessage: null });

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      this.updateMetrics({ status: 'listening' });
    };

    rec.onresult = (e: any) => {
      const now = performance.now();
      let interim = '';
      let finalStr = this.metrics.finalText;

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const item = e.results[i];
        const text = item[0]?.transcript ?? '';
        if (item.isFinal) {
          finalStr = (finalStr + ' ' + text).trim();
        } else {
          interim += text;
        }
      }

      const currentLive = (finalStr + ' ' + interim).trim();

      // Time to first word measurement
      if (!this.hasEmittedFirstWord && currentLive.length > 0) {
        this.hasEmittedFirstWord = true;
        const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
        const timeToFirstWord = Math.max(0, Math.round(now - refStart));
        this.updateMetrics({ timeToFirstWordMs: timeToFirstWord });
      }

      // Lag estimation: delay from event arrival
      const lag = Math.max(10, Math.round(now - (this.speechStartTime ?? now)));
      this.updateMetrics({
        partialText: currentLive,
        finalText: finalStr,
        lagBehindSpeechMs: Math.min(lag, 450), // Typical browser API lag 150-400ms
      });
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return; // Silence is normal
      if (e.error === 'not-allowed') {
        this.updateMetrics({ status: 'error', errorMessage: 'Microphone access blocked or denied.' });
        return;
      }
      this.updateMetrics({ status: 'error', errorMessage: `Speech recognition error: ${e.error}` });
    };

    rec.onend = () => {
      // Auto-restart if session is still supposed to be active (browser stops on silence)
      if (this.isActive) {
        try {
          rec.start();
        } catch {
          // Ignore restart collisions
        }
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch (err) {
      this.updateMetrics({ status: 'error', errorMessage: `Failed to start recognition: ${(err as Error).message}` });
    }
  }

  public async stop(): Promise<void> {
    this.isActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.updateMetrics({ status: 'ready' });
  }

  public reset(): void {
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.updateMetrics({
      partialText: '',
      finalText: '',
      timeToFirstWordMs: null,
      lagBehindSpeechMs: null,
    });
  }

  public destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

/**
 * Option 2: Moonshine Tiny, single-threaded
 * Runs onnx-community/moonshine-tiny-ONNX via ONNX Runtime Web in a Web Worker
 * with numThreads = 1 (Zero SharedArrayBuffer, Zero COOP/COEP required).
 */
/**
 * Normalizes text for ASR comparison and alignment.
 */
export function normalizeASRText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aligns and appends a newly transcribed segment to committed text.
 * If the new segment overlaps with the tail of the committed text (e.g. from
 * boundary window overlap), it deduplicates the overlapping words so no words
 * are repeated or cut.
 */
export function alignAndAppendPhrases(committed: string, nextText: string): string {
  const comm = committed.trim();
  const next = nextText.trim();
  if (!comm) return next;
  if (!next) return comm;

  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
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

/**
 * Trims excessive silence from the edges of an audio segment before passing to Moonshine.
 * Moonshine Tiny predicts <|nospeech|> if audio contains multiple seconds of dead silence.
 * Retains padSamples (~200ms = 3200 samples at 16kHz) to ensure speech onset/offset is intact.
 */
export function trimAudioSilence(
  samples: Float32Array,
  threshold = 0.008,
  padSamples = 3200
): Float32Array {
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
    return new Float32Array(samples);
  }

  return samples.slice(start, end);
}

/**
 * Option 4: Moonshine Tiny, single-threaded ONNX Web
 *
 * Runs onnx-community/moonshine-tiny-ONNX in a dedicated Web Worker
 * with numThreads = 1 (Zero SharedArrayBuffer, Zero COOP/COEP required).
 *
 * Architecture:
 * - Uses voice activity & pause detection to commit finished phrases: at each silence
 *   or every ~8.5 seconds, the settled segment is frozen and appended.
 * - Only the current segment is re-transcribed for low-latency live feedback.
 * - Max-duration boundary commits maintain an audio overlap window (~1.25s) and
 *   align/deduplicate boundary words so words are never cut at window edges.
 * - Retains all audio in a session buffer to verify whether final text equals
 *   a batch pass over the same audio.
 */
export interface SingleThreadASROptions {
  id?: string;
  name?: string;
  modelId?: string;
  device?: 'wasm' | 'webgpu';
  dtype?: string;
  downloadBytes?: number;
  normalizeAudio?: boolean;
  captureDrainMs?: number;
  finalModelId?: string;
  finalDevice?: 'wasm' | 'webgpu';
  finalDownloadBytes?: number;
}

export class SingleThreadASREngine extends BaseSpeechEngine {
  readonly id: string;
  readonly name: string;
  readonly modelId: string;
  readonly device: 'wasm' | 'webgpu';
  readonly dtype: string;
  readonly expectedDownloadBytes: number;
  readonly finalModelId: string | undefined;
  private readonly finalDevice: 'wasm' | 'webgpu';
  private readonly finalDownloadBytes: number;
  private liveDecodeRatios: number[] = [];
  private initialPrompt = '';
  public setQuestionPrompt(prompt: string): void { this.initialPrompt = prompt.slice(0, 256); }
  private sessionId = 0;
  private requestNumber = 0;
  private segmentHasOverlap = false;
  private readonly requestOverlap = new Map<string, boolean>();
  private readonly downloadFiles = new Map<string, { loaded: number; total: number }>();
  private modelAfterStop: string | undefined;
  private latestInterimId: string | null = null;
  private readonly stopWaiters = new Set<() => void>();

  private readonly normalizeAudio: boolean;
  private readonly captureDrainMs: number;
  private worker: Worker | null = null;
  private loadingPromise: Promise<void> | null = null;
  private preparationPromise: Promise<void> | null = null;
  private rejectLoad: ((error: Error) => void) | null = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private captureWorklet: AudioWorkletNode | null = null;
  private isRunning = false;
  private isWorkerBusy = false;

  // Complete session audio (never cleared during session, used for batch comparison)
  private sessionChunks: Float32Array[] = [];
  private totalSessionSamples = 0;

  // Active phrase / segment audio
  private currentSegmentChunks: Float32Array[] = [];
  private currentSegmentSamples = 0;

  // Committed frozen phrases and live text
  private committedPhrases: string[] = [];
  private committedText = '';
  private currentInterimText = '';

  // Voice activity & pause tracking
  private silenceFramesCount = 0;
  private hasSpeechInCurrentSegment = false;
  private isCommitting = false;

  private pollIntervalId: any = null;
  private lastUpdateTime: number | null = null;
  private updateIntervals: number[] = [];
  private earlierWordRevisions = 0;

  constructor(options: SingleThreadASROptions = {}) {
    super();
    this.normalizeAudio = options.normalizeAudio ?? false;
    this.captureDrainMs = options.captureDrainMs ?? 0;
    this.finalModelId = options.finalModelId;
    this.finalDevice = options.finalDevice ?? 'wasm';
    this.finalDownloadBytes = options.finalDownloadBytes ?? 77000000;
    this.id = options.id || 'moonshine-single';
    this.name = options.name || 'Moonshine Tiny, single-threaded (ORT Web / transformers.js)';
    this.modelId = options.modelId || 'onnx-community/moonshine-tiny-ONNX';
    this.device = options.device || 'wasm';
    this.dtype = options.dtype || 'q8';
    this.expectedDownloadBytes = options.downloadBytes || 28180947;

    this.metrics.device =
      this.device === 'webgpu'
        ? 'WebGPU (Single-Threaded Worker, No COOP/COEP needed)'
        : 'WASM (Single-Threaded, No COOP/COEP needed)';
    this.metrics.downloadBytes = this.expectedDownloadBytes;
    this.metrics.earlierWordRevisions = 0;
    this.metrics.revisionsPerWord = 0;
  }

  private nextId(): string { return `${this.sessionId}:${++this.requestNumber}`; }

  private appendSegment(previous: string, next: string, overlap: boolean): string {
    return overlap ? alignAndAppendPhrases(previous, next) : appendPhrase(previous, next);
  }

  private reportProgress(data: any, expected = this.expectedDownloadBytes): void {
    const loaded = Number(data.loaded) || 0;
    const total = Number(data.total) || 0;
    this.downloadFiles.set(data.file ?? 'model', { loaded, total });
    let bytes = 0, knownTotal = 0;
    for (const file of this.downloadFiles.values()) { bytes += file.loaded; knownTotal += file.total; }
    this.updateMetrics({ downloadBytes: bytes, downloadProgressPct: Math.max(this.metrics.downloadProgressPct, Math.min(99, Math.round(bytes / Math.max(expected, knownTotal, 1) * 100))) });
  }

  private prepareAudio(samples: Float32Array): Float32Array {
    return trimAudioSilence(this.normalizeAudio ? normalizeQuietAudio(samples) : samples);
  }

  public override onSpeechActivity(isSpeaking: boolean, timestamp?: number): void {
    super.onSpeechActivity(isSpeaking, timestamp);
  }

  public async load(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    if (this.worker) return;
    this.downloadFiles.clear();

    this.updateMetrics({ status: 'loading', errorMessage: null, downloadProgressPct: 5 });
    const startTime = performance.now();

    this.loadingPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Speech model download timed out')), 180000);
      this.rejectLoad = (error) => { clearTimeout(timeout); reject(error); };
      try {
        this.worker = new Worker(
          new URL('../../workers/moonshineSingleThreadWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent) => {
          const { type, loadTimeMs, error, device } = e.data;

          if (type === 'progress') {
            this.reportProgress(e.data);
          } else if (type === 'init_done') {
            const finalLoadTime = loadTimeMs || Math.round(performance.now() - startTime);
            this.updateMetrics({
              status: 'ready',
              device: `${device === 'webgpu' ? 'WebGPU' : 'WASM'} (Single-Threaded Worker, No COOP/COEP needed)`,
              downloadProgressPct: 100,
              downloadBytes: this.expectedDownloadBytes,
              loadTimeMs: finalLoadTime,
              errorMessage: null,
            });
            clearTimeout(timeout);
            resolve();
          } else if (type === 'error') {
            const msg = error || 'Worker initialization failed';
            this.updateMetrics({ status: 'error', errorMessage: msg });
            clearTimeout(timeout);
            reject(new Error(msg));
          }
        };

        this.worker.onerror = (err) => {
          const msg = err.message || 'Worker syntax or import error';
          this.updateMetrics({ status: 'error', errorMessage: msg });
          clearTimeout(timeout);
          reject(new Error(msg));
        };

        this.worker.postMessage({
          id: 'init',
          op: 'init',
          payload: {
            modelId: this.modelId,
            device: this.device,
            dtype: this.dtype,
          },
        });
      } catch (err) {
        const msg = (err as Error).message;
        this.updateMetrics({ status: 'error', errorMessage: msg });
        clearTimeout(timeout);
        reject(err);
      }
    });
    try { await this.loadingPromise; } catch (error) {
      this.worker?.terminate(); this.worker = null;
      throw error;
    } finally { this.loadingPromise = null; this.rejectLoad = null; }
  }

  public async prepareForListening(): Promise<void> {
    if (this.preparationPromise) return this.preparationPromise;
    this.preparationPromise = (async () => {
      if (this.modelAfterStop && this.modelAfterStop !== this.modelId) {
        // Restore the cached live model before the page requests a microphone.
        this.worker?.terminate(); this.worker = null;
      }
      this.modelAfterStop = undefined;
      await this.load();
    })();
    try { await this.preparationPromise; } finally { this.preparationPromise = null; }
  }

  public async start(stream: MediaStream): Promise<void> {
    const session = ++this.sessionId;
    await this.prepareForListening();
    if (session !== this.sessionId) return;
    this.segmentHasOverlap = false;
    this.requestOverlap.clear();
    this.isRunning = true;
    this.isWorkerBusy = false;
    this.isCommitting = false;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();

    this.sessionChunks = [];
    this.totalSessionSamples = 0;
    this.currentSegmentChunks = [];
    this.currentSegmentSamples = 0;
    this.committedPhrases = [];
    this.committedText = '';
    this.currentInterimText = '';

    this.silenceFramesCount = 0;
    this.hasSpeechInCurrentSegment = false;
    this.updateIntervals = [];
    this.earlierWordRevisions = 0;
    this.lastUpdateTime = null;
    this.lastAudioSpeechTime = 0;

    this.updateMetrics({
      status: 'listening',
      partialText: '',
      finalText: '',
      errorMessage: null,
      updateIntervalMs: null,
      earlierWordRevisions: 0,
      revisionsPerWord: 0,
      batchTranscript: undefined,
      rawBatchTranscript: undefined,
      finalPassWarning: undefined,
      refinementDecision: undefined,
      finalDecodeRTF: undefined,
      isIdenticalToBatch: undefined,
    });

    // 1. Immediately create and connect the Web Audio graph to buffer audio from mic start
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: 16000 });
    if (this.audioContext.sampleRate !== 16000) throw new Error('Speech capture requires a 16 kHz AudioContext');
    this.updateMetrics({ captureSampleRate: this.audioContext.sampleRate, inputTrackSettings: stream.getAudioTracks?.()[0]?.getSettings?.(), inputSampleRate: stream.getAudioTracks?.()[0]?.getSettings?.().sampleRate });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const capture = (channelData: Float32Array) => {
      if (!this.isRunning) return;
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);

      // Keep complete audio in session history from the very first frame!
      this.sessionChunks.push(copy);
      this.totalSessionSamples += copy.length;

      // Keep in current active segment
      this.currentSegmentChunks.push(copy);
      this.currentSegmentSamples += copy.length;

      // Energy (RMS) computation for local voice activity & pause detection
      let sum = 0, peak = 0;
      for (let i = 0; i < copy.length; i++) {
        sum += copy[i] * copy[i];
        peak = Math.max(peak, Math.abs(copy[i]));
      }
      const gain = this.normalizeAudio && peak >= 0.0005 && peak < 0.1 ? Math.min(8, 0.1 / peak) : 1;
      const rms = Math.sqrt(sum / copy.length) * gain;

      if (rms >= 0.006) {
        this.hasSpeechInCurrentSegment = true;
        this.silenceFramesCount = 0;
        this.lastAudioSpeechTime = Date.now();
      } else {
        this.silenceFramesCount += copy.length;
      }

      // Pause duration uses samples, independent of capture callback size.
      if (
        this.hasSpeechInCurrentSegment &&
        this.silenceFramesCount >= 12000 &&
        this.currentSegmentSamples >= 16000 &&
        !this.isCommitting &&
        this.worker &&
        this.metrics.status === 'listening'
      ) {
        this.commitCurrentSegment(false);
      }

      // Max window duration trigger: ~8.5 seconds (136,000 samples)
      // Commit settled phrase and maintain ~1.25s overlap so window edges never cut words
      if (
        this.currentSegmentSamples >= 136000 &&
        !this.isCommitting &&
        this.worker &&
        this.metrics.status === 'listening'
      ) {
        this.commitCurrentSegment(true);
      }
    };

    // Prefer the rendering thread: ScriptProcessor loses audio when the main thread stalls.
    if (this.audioContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      await this.audioContext.audioWorklet.addModule(new URL('../../workers/speechCaptureWorklet.js', import.meta.url));
      if (session !== this.sessionId) return;
      this.updateMetrics({ captureBackend: 'audio-worklet' });
      this.captureWorklet = new AudioWorkletNode(this.audioContext, 'interview-capture');
      this.captureWorklet.port.onmessage = event => capture(event.data);
      source.connect(this.captureWorklet);
    } else {
      this.updateMetrics({ captureBackend: 'script-processor' });
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processorNode.onaudioprocess = event => capture(event.inputBuffer.getChannelData(0));
      source.connect(this.processorNode);
    }
    const silentGain = this.audioContext.createGain();
    silentGain.gain.value = 0;
    (this.captureWorklet ?? this.processorNode)!.connect(silentGain);
    silentGain.connect(this.audioContext.destination);

    // 2. Load worker if not already initialized (audio is already buffering into sessionChunks!)
    if (!this.worker) {
      await this.load();
    }

    if (session !== this.sessionId) return;
    // Setup worker listener for transcription results
    if (this.worker) {
      this.worker.onmessage = (e: MessageEvent) => {
        const { id, type, text, inferMs, error } = e.data;
        if (type === 'progress') { this.reportProgress(e.data, this.finalDownloadBytes); return; }
        if (type === 'model_ready') { this.updateMetrics({ downloadProgressPct: 100, device: `${e.data.device === 'webgpu' ? 'WebGPU' : 'WASM'} (Single-Threaded Worker, No COOP/COEP needed)` }); return; }
        if (typeof id !== 'string' || !id.startsWith(`${this.sessionId}:`)) return;

        if (type === 'commit_result' || type === 'result') {
          const ratio = decodeRealTimeFactor(inferMs, e.data.sampleCount);
          if (ratio !== null) { this.liveDecodeRatios.push(ratio); this.liveDecodeRatios = this.liveDecodeRatios.slice(-5); this.updateMetrics({ liveDecodeRTF: ratio }); }
        }
        if (type === 'commit_result') {
          this.isCommitting = false;
          this.isWorkerBusy = false;
          const rawText = (text || '').trim();
          if (rawText.length > 0) {
            this.committedText = this.appendSegment(this.committedText, rawText, this.requestOverlap.get(id) ?? false);
            this.requestOverlap.delete(id);
            this.committedPhrases.push(rawText);
            this.currentInterimText = '';

            this.updateMetrics({
              finalText: this.committedText,
              partialText: this.committedText,
              lagBehindSpeechMs: inferMs ?? 150,
            });
          }
        } else if (type === 'result') {
          this.isWorkerBusy = false;
          if (id !== this.latestInterimId) return;
          const now = performance.now();

          if (this.lastUpdateTime) {
            const interval = Math.round(now - this.lastUpdateTime);
            this.updateIntervals.push(interval);
          }
          this.lastUpdateTime = now;

          const rawText = (text || '').trim();
          if (rawText.length > 0) {
            if (!this.hasEmittedFirstWord) {
              this.hasEmittedFirstWord = true;
              const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
              this.updateMetrics({ timeToFirstWordMs: Math.max(0, Math.round(now - refStart)) });
            }

            this.currentInterimText = rawText;
            const liveCombined = this.appendSegment(this.committedText, this.currentInterimText, this.segmentHasOverlap);

            const avgInterval =
              this.updateIntervals.length > 0
                ? Math.round(
                    this.updateIntervals.reduce((a, b) => a + b, 0) / this.updateIntervals.length
                  )
                : null;

            this.updateMetrics({
              partialText: liveCombined,
              finalText: this.committedText,
              lagBehindSpeechMs: inferMs ?? Math.max(20, Math.round(now - (this.speechStartTime ?? now))),
              updateIntervalMs: avgInterval,
              earlierWordRevisions: this.earlierWordRevisions,
            });
          }
        } else if (type === 'busy') {
          this.isWorkerBusy = false;
        } else if (type === 'error') {
          this.isCommitting = false;
          this.isWorkerBusy = false;
          console.warn('[MoonshineWorker error]', error);
        }
      };
    }

    // Active segment interim polling loop: triggers every 300ms
    this.pollIntervalId = setInterval(() => {
      if (!this.isRunning || this.isWorkerBusy || this.isCommitting || !this.worker) return;
      if (this.currentSegmentSamples < 4000) return; // Wait for at least ~250ms of audio

      // Flatten current segment chunks
      const merged = new Float32Array(this.currentSegmentSamples);
      let offset = 0;
      for (const chunk of this.currentSegmentChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const clean = this.prepareAudio(merged);
      if (clean.length < 3200) return;

      this.isWorkerBusy = true;
      this.latestInterimId = this.nextId();
      this.worker.postMessage(
        {
          id: this.latestInterimId,
          op: 'transcribe',
          payload: { audio: clean.buffer },
        },
        [clean.buffer]
      );
    }, 300);
  }

  private commitCurrentSegment(hasOverlap: boolean): void {
    if (this.currentSegmentSamples < 4000 || !this.worker) return;

    this.isCommitting = true;
    this.latestInterimId = null;
    const samplesToCommit = this.currentSegmentSamples;
    const id = this.nextId();
    this.requestOverlap.set(id, this.segmentHasOverlap);
    this.segmentHasOverlap = hasOverlap;

    // Flatten current segment chunks
    const merged = new Float32Array(samplesToCommit);
    let offset = 0;
    for (const chunk of this.currentSegmentChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    if (hasOverlap) {
      // Overlap and align: retain the last ~1.25s (20,000 samples) in the next segment
      const overlapSamples = Math.min(20000, samplesToCommit);
      const overlapChunk = merged.subarray(samplesToCommit - overlapSamples);
      const overlapCopy = new Float32Array(overlapChunk.length);
      overlapCopy.set(overlapChunk);
      this.currentSegmentChunks = [overlapCopy];
      this.currentSegmentSamples = overlapCopy.length;
      this.hasSpeechInCurrentSegment = false;
      this.silenceFramesCount = 0;
    } else {
      // Silence pause: clear current segment
      this.currentSegmentChunks = [];
      this.currentSegmentSamples = 0;
      this.hasSpeechInCurrentSegment = false;
      this.silenceFramesCount = 0;
    }

    const clean = this.prepareAudio(merged);
    if (clean.length < 3200) {
      this.isCommitting = false;
      return;
    }
    this.worker.postMessage(
      {
        id,
        op: 'commit',
        payload: { audio: clean.buffer, hasOverlap },
      },
      [clean.buffer]
    );
  }

  public async stop(onCaptureStopped?: () => void): Promise<void> {
    const session = this.sessionId;
    const worker = this.worker;
    // ScriptProcessor callbacks arrive in 256 ms blocks. Drain the last block
    // before disconnecting, so a click on the final word does not discard it.
    if (this.isRunning && this.captureDrainMs > 0) await new Promise(resolve => setTimeout(resolve, this.captureDrainMs));
    this.isRunning = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.captureWorklet) { this.captureWorklet.port.onmessage = null; this.captureWorklet.disconnect(); this.captureWorklet = null; }
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    this.updateMetrics({ capturedSamples: this.totalSessionSamples });
    onCaptureStopped?.();
    if (session !== this.sessionId) return;

    // If there is uncommitted speech in the segment, commit it now
    if (this.currentSegmentSamples >= 4000 && worker) {
      const remainingSamples = this.currentSegmentSamples;
      const merged = new Float32Array(remainingSamples);
      let offset = 0;
      for (const chunk of this.currentSegmentChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.currentSegmentChunks = [];
      this.currentSegmentSamples = 0;

      const clean = this.prepareAudio(merged);
      if (clean.length >= 3200) {
        const id = this.nextId();
        this.requestOverlap.set(id, this.segmentHasOverlap);
        await new Promise<void>((resolve) => {
          const cancel = () => { clearTimeout(timeout); worker?.removeEventListener('message', handler); this.stopWaiters.delete(cancel); resolve(); };
          this.stopWaiters.add(cancel);
          const timeout = setTimeout(() => {
            worker?.removeEventListener('message', handler);
            if (session === this.sessionId && this.worker === worker) { worker?.terminate(); this.worker = null; }
            if (session === this.sessionId) this.updateMetrics({ errorMessage: 'Speech finalization timed out; retained live text.' });
            cancel();
          }, 60000);

          const handler = (e: MessageEvent) => {
            if (e.data.id !== id) return;
            if (e.data.type === 'commit_result') {
              clearTimeout(timeout);
              cancel();
            } else if (e.data.type === 'error') {
              clearTimeout(timeout);
              cancel();
            }
          };
          worker?.addEventListener('message', handler);
          worker?.postMessage(
            { id, op: 'commit', payload: { audio: clean.buffer, hasOverlap: false } },
            [clean.buffer]
          );
        });
      }
    }

    if (session !== this.sessionId) return;
    const liveBeforeBatch = this.appendSegment(this.committedText, this.currentInterimText, this.segmentHasOverlap);
    // Run final pass over ALL session audio in order!
    let batchTranscript = '';
    let isIdenticalToBatch = false;
    let rawBatchTranscript = '';
    let finalPassWarning: string | undefined;

    // Live throughput does not predict final-model accuracy or throughput. Always attempt refinement.
    if ( this.totalSessionSamples >= 8000 && worker && this.worker === worker) {
      const fullAudio = new Float32Array(this.totalSessionSamples);
      let offset = 0;
      for (const chunk of this.sessionChunks) {
        fullAudio.set(chunk, offset);
        offset += chunk.length;
      }

      const cleanAudio = this.normalizeAudio ? normalizeQuietAudio(fullAudio) : fullAudio;
      const audioToBatch = cleanAudio.length >= 4000 ? cleanAudio : fullAudio;

      const id = this.nextId();
      const decodeBudget = refinementBudgetMs(audioToBatch.length);
      if (this.finalModelId) {
        this.downloadFiles.clear();
        this.updateMetrics({ downloadProgressPct: 0 });
        this.modelAfterStop = this.finalModelId;
      }
      await new Promise<void>((resolve) => {
        let decodeTimer: ReturnType<typeof setTimeout> | undefined;
        const cancel = () => { clearTimeout(decodeTimer); clearTimeout(timeout); worker?.removeEventListener('message', handler); this.stopWaiters.delete(cancel); resolve(); };
        this.stopWaiters.add(cancel);
        const timeout = setTimeout(() => {
          worker?.removeEventListener('message', handler);
          if (session === this.sessionId && this.worker === worker) { worker?.terminate(); this.worker = null; }
          if (session === this.sessionId) this.updateMetrics({ errorMessage: 'Final speech check timed out; retained live text.' });
          cancel();
        }, 180000 + decodeBudget);

        const handler = (e: MessageEvent) => {
          if (e.data.id !== id) return;
          if (e.data.type === 'model_ready' && this.finalModelId && !decodeTimer) {
            decodeTimer = setTimeout(() => {
              if (session === this.sessionId && this.worker === worker) {
                worker.terminate(); this.worker = null;
                this.updateMetrics({ refinementDecision: 'aborted-slow', finalPassWarning: 'Final recognition timed out; retained live text.' });
              }
              cancel();
            }, decodeBudget);
          }
          if (e.data.type === 'batch_result') {
            if (this.finalModelId) {
              const ratio = decodeRealTimeFactor(e.data.inferMs, e.data.sampleCount);
              if (ratio !== null) this.updateMetrics({ finalDecodeRTF: ratio });
              this.updateMetrics({ refinementDecision: 'accepted', initialPrompt: this.initialPrompt });
            }
            clearTimeout(timeout);
            batchTranscript = (e.data.text || '').trim();
            cancel();
          } else if (e.data.type === 'error') {
            if (session === this.sessionId) this.updateMetrics({ errorMessage: 'Final speech check unavailable; retained live text.' });
            clearTimeout(timeout);
            cancel();
          }
        };
        worker?.addEventListener('message', handler);
        worker?.postMessage(
          { id, op: 'batch', payload: { audio: audioToBatch.buffer, ...(this.finalModelId ? { modelId: this.finalModelId, device: this.finalDevice, initialPrompt: this.initialPrompt } : {}) } },
          [audioToBatch.buffer]
        );
      });

      if (session !== this.sessionId) return;
      rawBatchTranscript = batchTranscript;
      const choice = chooseFinalTranscript(liveBeforeBatch, batchTranscript);
      this.committedText = choice.text;
      finalPassWarning = choice.warning;
      if (!choice.accepted) batchTranscript = '';

      const cleanLive = normalizeASRText(liveBeforeBatch);
      const cleanBatch = normalizeASRText(batchTranscript);
      isIdenticalToBatch = cleanLive.length > 0 && cleanLive === cleanBatch;
    }

    if (session !== this.sessionId) return;
    if (!batchTranscript) this.committedText = liveBeforeBatch;
    const words = this.committedText.split(/\s+/).filter(Boolean);
    const revPerWord = words.length > 0 ? this.earlierWordRevisions / words.length : 0;

    this.updateMetrics({
      status: 'ready',
      downloadProgressPct: 100,
      finalText: this.committedText,
      partialText: this.committedText,
      batchTranscript: batchTranscript || undefined,
      rawBatchTranscript: rawBatchTranscript || undefined,
      finalPassWarning: finalPassWarning ?? this.metrics.finalPassWarning,
      isIdenticalToBatch,
      revisionsPerWord: Math.round(revPerWord * 1000) / 1000,
      earlierWordRevisions: this.earlierWordRevisions,
    });
  }

  public reset(): void {
    this.cancel();
    this.sessionId++;
    this.requestOverlap.clear();
    this.segmentHasOverlap = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.sessionChunks = [];
    this.totalSessionSamples = 0;
    this.currentSegmentChunks = [];
    this.currentSegmentSamples = 0;
    this.committedPhrases = [];
    this.committedText = '';
    this.currentInterimText = '';
    this.updateIntervals = [];
    this.earlierWordRevisions = 0;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.lastUpdateTime = null;
    this.hasSpeechInCurrentSegment = false;
    this.silenceFramesCount = 0;
    this.isCommitting = false;

    this.updateMetrics({
      partialText: '',
      finalText: '',
      timeToFirstWordMs: null,
      lagBehindSpeechMs: null,
      updateIntervalMs: null,
      earlierWordRevisions: 0,
      revisionsPerWord: 0,
      batchTranscript: undefined,
      rawBatchTranscript: undefined,
      finalPassWarning: undefined,
      refinementDecision: undefined,
      finalDecodeRTF: undefined,
      isIdenticalToBatch: undefined,
    });
  }

  public cancel(): void {
    for (const cancel of this.stopWaiters) cancel();
    this.stopWaiters.clear();
    this.isRunning = false;
    this.sessionId++;
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    this.pollIntervalId = null;
    if (this.captureWorklet) { this.captureWorklet.port.onmessage = null; this.captureWorklet.disconnect(); this.captureWorklet = null; }
    if (this.processorNode) { this.processorNode.onaudioprocess = null; this.processorNode.disconnect(); }
    this.processorNode = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.sessionChunks = [];
    this.currentSegmentChunks = [];
    this.totalSessionSamples = 0;
    this.currentSegmentSamples = 0;
  }

  public destroy(): void {
    this.rejectLoad?.(new Error('Speech engine disposed'));
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
    this.listeners.clear();
  }
}

/**
 * Pre-configured Single-Threaded Engines:
 * 1. Moonshine Tiny (Default, 28 MB)
 * 2. Moonshine Base (62 MB)
 * 3. Whisper Tiny.en (40 MB)
 * 4. Whisper Base.en (77 MB)
 */
export class MoonshineSingleThreadEngine extends SingleThreadASREngine {
  constructor(device: 'wasm' | 'webgpu' = 'wasm') {
    super({
      id: 'moonshine-single',
      name: 'Moonshine Tiny, single-threaded (ORT Web / transformers.js)',
      modelId: 'onnx-community/moonshine-tiny-ONNX',
      device,
      dtype: 'q8',
      downloadBytes: 28180947,
    });
  }
}

export class MoonshineBaseEngine extends SingleThreadASREngine {
  constructor(device: 'wasm' | 'webgpu' = 'wasm') {
    super({
      id: 'moonshine-base',
      name: 'Moonshine Base, single-threaded (ORT Web / transformers.js)',
      modelId: 'onnx-community/moonshine-base-ONNX',
      device,
      dtype: 'q8',
      downloadBytes: 62000000,
    });
  }
}

export class WhisperTinyEngine extends SingleThreadASREngine {
  constructor(device: 'wasm' | 'webgpu' = 'wasm') {
    super({
      id: 'whisper-tiny',
      name: 'Whisper Tiny.en, single-threaded (ORT Web / transformers.js)',
      modelId: 'onnx-community/whisper-tiny.en',
      device,
      dtype: 'q8',
      downloadBytes: 39800000,
    });
  }
}

export class WhisperBaseEngine extends SingleThreadASREngine {
  constructor(device: 'wasm' | 'webgpu' = 'wasm') {
    super({
      id: 'whisper-base',
      name: 'Whisper Base.en, single-threaded (ORT Web / transformers.js)',
      modelId: 'onnx-community/whisper-base.en',
      device,
      dtype: 'q8',
      downloadBytes: 77000000,
    });
  }
}
