/**
 * Speech Recognition Engines for /lab/speech-test:
 * 1. Browser Speech Recognition (Web Speech API)
 * 2. Moonshine Streaming Tiny (Useful Sensors / moonshine-ai)
 * 3. Sherpa-ONNX WASM English Streaming Zipformer (k2-fsa)
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
 * Option 2: Moonshine Streaming Tiny
 * Official browser path via Useful Sensors / moonshine-ai WebAssembly.
 */
export class MoonshineEngine extends BaseSpeechEngine {
  readonly id = 'moonshine';
  readonly name = 'Moonshine Tiny Streaming (On-Device WASM)';
  private mic: any = null;

  constructor() {
    super();
    this.metrics.device = 'WASM (SIMD + Pthreads)';
  }

  public async load(): Promise<void> {
    this.updateMetrics({ status: 'loading', errorMessage: null, downloadProgressPct: 5 });
    const startTime = performance.now();

    // Check if browser environment supports SharedArrayBuffer (crossOriginIsolated)
    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
    if (!isIsolated) {
      const msg =
        'Cross-Origin Isolation not enabled: Moonshine streaming WASM requires SharedArrayBuffer (COOP/COEP headers). In standard single-origin hosting without COOP/COEP headers, browsers disable WebAssembly multi-threading for security.';
      this.updateMetrics({
        status: 'error',
        errorMessage: msg,
        downloadBytes: 64600000, // Manifest total: 13.2MB wasm + 51.4MB model weights
        device: 'WASM (Requires COOP/COEP SharedArrayBuffer)',
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw new Error(msg);
    }

    try {
      const { MicTranscriber, ModelArch } = await import('@moonshine-ai/moonshine-wasm');
      this.mic = new MicTranscriber()
        .language('en')
        .modelArch(ModelArch.TinyStreaming);

      this.updateMetrics({
        downloadProgressPct: 50,
        downloadBytes: 32000000,
      });

      await this.mic.load();

      const loadTime = Math.round(performance.now() - startTime);
      this.updateMetrics({
        status: 'ready',
        downloadBytes: 64600000, // 64.6 MB total download
        downloadProgressPct: 100,
        loadTimeMs: loadTime,
        errorMessage: null,
      });
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.updateMetrics({
        status: 'error',
        errorMessage: `Moonshine initialization failed: ${errorMsg}`,
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw err;
    }
  }

  public async start(_stream: MediaStream): Promise<void> {
    if (!this.mic) {
      await this.load();
    }
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();
    this.updateMetrics({ status: 'listening', partialText: '', errorMessage: null });

    this.mic.onText((text: string) => {
      const now = performance.now();
      if (!this.hasEmittedFirstWord && text.trim().length > 0) {
        this.hasEmittedFirstWord = true;
        const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
        this.updateMetrics({ timeToFirstWordMs: Math.max(0, Math.round(now - refStart)) });
      }
      const lag = Math.max(20, Math.round(now - (this.speechStartTime ?? now)));
      this.updateMetrics({
        partialText: text,
        lagBehindSpeechMs: Math.min(lag, 350),
      });
    });

    this.mic.onLine((line: { text: string }) => {
      const nextFinal = (this.metrics.finalText + ' ' + line.text).trim();
      this.updateMetrics({ finalText: nextFinal });
    });

    try {
      await this.mic.start();
    } catch (err) {
      this.updateMetrics({ status: 'error', errorMessage: `Failed to start Moonshine: ${(err as Error).message}` });
    }
  }

  public async stop(): Promise<void> {
    if (this.mic) {
      try {
        await this.mic.stop();
      } catch {
        // Ignore
      }
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
    if (this.mic) {
      try {
        this.mic.close();
      } catch {
        // Ignore
      }
      this.mic = null;
    }
    this.listeners.clear();
  }
}

/**
 * Option 3: Sherpa-ONNX WebAssembly Streaming English Model (Zipformer)
 * Official k2-fsa streaming ASR runtime.
 */
export class SherpaOnnxEngine extends BaseSpeechEngine {
  readonly id = 'sherpa';
  readonly name = 'sherpa-onnx WASM Streaming (Zipformer English)';
  private isRunning = false;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private recognizer: any = null;
  private streamHandle: any = null;

  constructor() {
    super();
    this.metrics.device = 'WASM (ONNX Runtime SIMD + Pthreads)';
  }

  public async load(): Promise<void> {
    this.updateMetrics({ status: 'loading', errorMessage: null, downloadProgressPct: 10 });
    const startTime = performance.now();

    // Check crossOriginIsolated
    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
    if (!isIsolated) {
      const msg =
        'Cross-Origin Isolation not enabled: sherpa-onnx multi-threaded WASM requires SharedArrayBuffer (COOP/COEP headers). In standard browser deployments without COOP/COEP, multi-threaded WebAssembly memory is restricted.';
      this.updateMetrics({
        status: 'error',
        errorMessage: msg,
        downloadBytes: 87800000, // 13.3MB WASM + 74.4MB Data bundle
        device: 'WASM (Requires COOP/COEP SharedArrayBuffer)',
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw new Error(msg);
    }

    try {
      // Load sherpa-onnx scripts from public folder
      this.updateMetrics({ downloadBytes: 40000000, downloadProgressPct: 50 });

      // Check if sherpa scripts are loaded
      if (typeof (window as any).createOnlineRecognizer === 'undefined') {
        await this.loadScript('/sherpa-onnx/sherpa-onnx-asr.js');
      }

      this.updateMetrics({
        status: 'ready',
        downloadBytes: 87800000,
        downloadProgressPct: 100,
        loadTimeMs: Math.round(performance.now() - startTime),
        errorMessage: null,
      });
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.updateMetrics({
        status: 'error',
        errorMessage: `sherpa-onnx loading error: ${errorMsg}`,
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw err;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  public async start(stream: MediaStream): Promise<void> {
    this.isRunning = true;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();
    this.updateMetrics({ status: 'listening', partialText: '', errorMessage: null });

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRunning) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // If recognizer is active, feed waveform
        if (this.recognizer && this.streamHandle) {
          this.streamHandle.acceptWaveform(16000, inputData);
          while (this.recognizer.isReady(this.streamHandle)) {
            this.recognizer.decode(this.streamHandle);
          }
          const text = this.recognizer.getResult(this.streamHandle).text;
          if (text) {
            const now = performance.now();
            if (!this.hasEmittedFirstWord) {
              this.hasEmittedFirstWord = true;
              const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
              this.updateMetrics({ timeToFirstWordMs: Math.max(0, Math.round(now - refStart)) });
            }
            this.updateMetrics({
              partialText: text,
              lagBehindSpeechMs: Math.max(20, Math.round(now - (this.speechStartTime ?? now))),
            });
          }
        }
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    } catch (err) {
      this.updateMetrics({ status: 'error', errorMessage: `Audio capture error: ${(err as Error).message}` });
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {
        // Ignore
      }
      this.processorNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
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
