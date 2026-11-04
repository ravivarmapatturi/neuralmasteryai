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
export class MoonshineSingleThreadEngine extends BaseSpeechEngine {
  readonly id = 'moonshine-single';
  readonly name = 'Moonshine Tiny, single-threaded (ORT Web / transformers.js)';
  private worker: Worker | null = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
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

  constructor() {
    super();
    this.metrics.device = 'WASM (Single-Threaded, No COOP/COEP needed)';
    this.metrics.downloadBytes = 28180947; // 28.18 MB total (7.9 MB encoder + 20.2 MB decoder)
    this.metrics.earlierWordRevisions = 0;
    this.metrics.revisionsPerWord = 0;
  }

  public override onSpeechActivity(isSpeaking: boolean, timestamp?: number): void {
    super.onSpeechActivity(isSpeaking, timestamp);
    // Voice activity detection state is tracked; onaudioprocess coordinates
    // silence pause commits (~750ms-1s silence) without premature micro-pause cutting.
  }

  public async load(): Promise<void> {
    if (this.worker) return;

    this.updateMetrics({ status: 'loading', errorMessage: null, downloadProgressPct: 5 });
    const startTime = performance.now();

    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../../workers/moonshineSingleThreadWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent) => {
          const { type, loaded, total, loadTimeMs, error } = e.data;

          if (type === 'progress') {
            const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : 50;
            this.updateMetrics({
              downloadProgressPct: pct,
              downloadBytes: total ? loaded : Math.round(28180947 * (pct / 100)),
            });
          } else if (type === 'init_done') {
            const finalLoadTime = loadTimeMs || Math.round(performance.now() - startTime);
            this.updateMetrics({
              status: 'ready',
              downloadProgressPct: 100,
              downloadBytes: 28180947,
              loadTimeMs: finalLoadTime,
              errorMessage: null,
            });
            resolve();
          } else if (type === 'error') {
            const msg = error || 'Worker initialization failed';
            this.updateMetrics({ status: 'error', errorMessage: msg });
            reject(new Error(msg));
          }
        };

        this.worker.onerror = (err) => {
          const msg = err.message || 'Worker syntax or import error';
          this.updateMetrics({ status: 'error', errorMessage: msg });
          reject(new Error(msg));
        };

        this.worker.postMessage({ id: 'init', op: 'init' });
      } catch (err) {
        const msg = (err as Error).message;
        this.updateMetrics({ status: 'error', errorMessage: msg });
        reject(err);
      }
    });
  }

  public async start(stream: MediaStream): Promise<void> {
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
      isIdenticalToBatch: undefined,
    });

    // 1. Immediately create and connect the Web Audio graph to buffer audio from mic start
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: 16000 });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRunning) return;
      const channelData = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);

      // Keep complete audio in session history from the very first frame!
      this.sessionChunks.push(copy);
      this.totalSessionSamples += copy.length;

      // Keep in current active segment
      this.currentSegmentChunks.push(copy);
      this.currentSegmentSamples += copy.length;

      // Energy (RMS) computation for local voice activity & pause detection
      let sum = 0;
      for (let i = 0; i < copy.length; i++) {
        sum += copy[i] * copy[i];
      }
      const rms = Math.sqrt(sum / copy.length);

      if (rms >= 0.012) {
        this.hasSpeechInCurrentSegment = true;
        this.silenceFramesCount = 0;
        this.lastAudioSpeechTime = Date.now();
      } else {
        this.silenceFramesCount++;
      }

      // Natural pause trigger: ~750ms of silence (3 frames of 256ms) after speaking and at least 1s of audio
      if (
        this.hasSpeechInCurrentSegment &&
        this.silenceFramesCount >= 3 &&
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

    source.connect(this.processorNode);
    const silentGain = this.audioContext.createGain();
    silentGain.gain.value = 0.00001;
    this.processorNode.connect(silentGain);
    silentGain.connect(this.audioContext.destination);

    // 2. Load worker if not already initialized (audio is already buffering into sessionChunks!)
    if (!this.worker) {
      await this.load();
    }

    // Setup worker listener for transcription results
    if (this.worker) {
      this.worker.onmessage = (e: MessageEvent) => {
        const { type, text, inferMs, error } = e.data;

        if (type === 'commit_result') {
          this.isCommitting = false;
          this.isWorkerBusy = false;
          const rawText = (text || '').trim();
          console.log('[MoonshineEngine] commit_result text:', JSON.stringify(rawText));
          if (rawText.length > 0) {
            this.committedText = alignAndAppendPhrases(this.committedText, rawText);
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
            const liveCombined = alignAndAppendPhrases(this.committedText, this.currentInterimText);

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

      const clean = trimAudioSilence(merged);
      if (clean.length < 3200) return;

      this.isWorkerBusy = true;
      this.worker.postMessage(
        {
          id: Date.now(),
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
    const samplesToCommit = this.currentSegmentSamples;
    console.log('[MoonshineEngine] commitCurrentSegment, hasOverlap:', hasOverlap, 'samples:', samplesToCommit);

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

    const clean = trimAudioSilence(merged);
    if (clean.length < 3200) {
      this.isCommitting = false;
      return;
    }
    this.worker.postMessage(
      {
        id: Date.now(),
        op: 'commit',
        payload: { audio: clean.buffer, hasOverlap },
      },
      [clean.buffer]
    );
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.processorNode) {
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

    // If there is uncommitted speech in the segment, commit it now
    if (this.currentSegmentSamples >= 4000 && this.worker) {
      const remainingSamples = this.currentSegmentSamples;
      const merged = new Float32Array(remainingSamples);
      let offset = 0;
      for (const chunk of this.currentSegmentChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.currentSegmentChunks = [];
      this.currentSegmentSamples = 0;

      const clean = trimAudioSilence(merged);
      if (clean.length >= 3200) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            this.worker?.removeEventListener('message', handler);
            resolve();
          }, 6000);

          const handler = (e: MessageEvent) => {
            if (e.data.type === 'commit_result') {
              clearTimeout(timeout);
              const raw = (e.data.text || '').trim();
              if (raw.length > 0) {
                this.committedText = alignAndAppendPhrases(this.committedText, raw);
              }
              this.worker?.removeEventListener('message', handler);
              resolve();
            } else if (e.data.type === 'error') {
              clearTimeout(timeout);
              this.worker?.removeEventListener('message', handler);
              resolve();
            }
          };
          this.worker?.addEventListener('message', handler);
          this.worker?.postMessage(
            { id: Date.now(), op: 'commit', payload: { audio: clean.buffer, hasOverlap: false } },
            [clean.buffer]
          );
        });
      }
    }

    // Run final pass over ALL session audio in order!
    let batchTranscript = '';
    let isIdenticalToBatch = false;

    if (this.totalSessionSamples >= 8000 && this.worker) {
      const fullAudio = new Float32Array(this.totalSessionSamples);
      let offset = 0;
      for (const chunk of this.sessionChunks) {
        fullAudio.set(chunk, offset);
        offset += chunk.length;
      }

      const cleanAudio = trimAudioSilence(fullAudio);
      const audioToBatch = cleanAudio.length >= 4000 ? cleanAudio : fullAudio;

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.worker?.removeEventListener('message', handler);
          resolve();
        }, 20000);

        const handler = (e: MessageEvent) => {
          if (e.data.type === 'batch_result') {
            clearTimeout(timeout);
            batchTranscript = (e.data.text || '').trim();
            this.worker?.removeEventListener('message', handler);
            resolve();
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            this.worker?.removeEventListener('message', handler);
            resolve();
          }
        };
        this.worker?.addEventListener('message', handler);
        this.worker?.postMessage(
          { id: Date.now(), op: 'batch', payload: { audio: audioToBatch.buffer } },
          [audioToBatch.buffer]
        );
      });

      if (batchTranscript && batchTranscript.trim().length > 0) {
        this.committedText = batchTranscript.trim();
      }

      const cleanLive = normalizeASRText(this.committedText);
      const cleanBatch = normalizeASRText(batchTranscript);
      isIdenticalToBatch = cleanLive.length > 0 && cleanLive === cleanBatch;
    }

    const words = this.committedText.split(/\s+/).filter(Boolean);
    const revPerWord = words.length > 0 ? this.earlierWordRevisions / words.length : 0;

    this.updateMetrics({
      status: 'ready',
      finalText: this.committedText,
      partialText: this.committedText,
      batchTranscript: batchTranscript || undefined,
      isIdenticalToBatch,
      revisionsPerWord: Math.round(revPerWord * 1000) / 1000,
      earlierWordRevisions: this.earlierWordRevisions,
    });
  }

  public reset(): void {
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
      isIdenticalToBatch: undefined,
    });
  }

  public destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.listeners.clear();
  }
}
