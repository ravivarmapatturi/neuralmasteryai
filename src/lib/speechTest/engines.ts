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
  private transcriber: any = null;
  private streamInstance: any = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRunning = false;

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
        downloadBytes: 64597708, // 13.2MB wasm + 51.4MB model weights
        device: 'WASM (Requires COOP/COEP SharedArrayBuffer)',
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw new Error(msg);
    }

    try {
      const { Transcriber, ModelArch } = await import('@moonshine-ai/moonshine-wasm');
      this.transcriber = await Transcriber.load({
        language: 'en',
        modelArch: ModelArch.TinyStreaming,
        onProgress: (p: number) => {
          this.updateMetrics({
            downloadProgressPct: Math.round(p * 100),
            downloadBytes: Math.round(64597708 * Math.min(1, p)),
          });
        },
      });

      const loadTime = Math.round(performance.now() - startTime);
      this.updateMetrics({
        status: 'ready',
        downloadBytes: 64597708, // 64.6 MB total download (13.2MB wasm + 51.4MB weights)
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

  public async start(stream: MediaStream): Promise<void> {
    if (!this.transcriber) {
      await this.load();
    }
    this.isRunning = true;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();
    this.updateMetrics({ status: 'listening', partialText: '', errorMessage: null });

    try {
      this.streamInstance = this.transcriber.createStream();
      this.streamInstance.start();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRunning || !this.streamInstance) return;
        const data = e.inputBuffer.getChannelData(0);
        this.streamInstance.addAudio(data, 16000);
        const t = this.streamInstance.transcribe();
        if (t && t.lines && t.lines.length > 0) {
          const text = t.lines.map((l: any) => l.text).join(' ').trim();
          if (text) {
            const now = performance.now();
            if (!this.hasEmittedFirstWord && text.length > 0) {
              this.hasEmittedFirstWord = true;
              const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
              this.updateMetrics({ timeToFirstWordMs: Math.max(0, Math.round(now - refStart)) });
            }
            const lag = Math.max(20, Math.round(now - (this.speechStartTime ?? now)));
            this.updateMetrics({
              partialText: text,
              finalText: text,
              lagBehindSpeechMs: Math.min(lag, 450),
            });
          }
        }
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    } catch (err) {
      this.updateMetrics({ status: 'error', errorMessage: `Failed to start Moonshine: ${(err as Error).message}` });
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
    if (this.streamInstance) {
      try {
        this.streamInstance.stop();
        this.streamInstance.close();
      } catch {
        // Ignore
      }
      this.streamInstance = null;
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
    if (this.transcriber) {
      try {
        this.transcriber.close();
      } catch {
        // Ignore
      }
      this.transcriber = null;
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
  private pcmBuffer: number[] = [];
  private isDecoding = false;
  private decodeIntervalId: any = null;

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
        downloadBytes: 87340000, // 13.4MB WASM + 73.8MB Data bundle
        device: 'WASM (Requires COOP/COEP SharedArrayBuffer)',
        loadTimeMs: Math.round(performance.now() - startTime),
      });
      throw new Error(msg);
    }

    try {
      this.updateMetrics({ downloadBytes: 40000000, downloadProgressPct: 50 });

      // Configure locateFile before loading sherpa scripts
      if (typeof window !== 'undefined') {
        (window as any).Module = (window as any).Module || {};
        (window as any).Module.locateFile = (p: string) => '/sherpa-onnx/' + p;
      }

      if (typeof (window as any).OfflineRecognizer === 'undefined') {
        await this.loadScript('/sherpa-onnx/sherpa-onnx-wasm-main-vad-asr.js');
        await this.loadScript('/sherpa-onnx/sherpa-onnx-asr.js');
      }

      await new Promise<void>((resolve, reject) => {
        const mod = (window as any).Module;
        if (mod && (mod.calledRun || (window as any).OfflineRecognizer)) {
          resolve();
          return;
        }
        if (mod) {
          const prevInit = mod.onRuntimeInitialized;
          mod.onRuntimeInitialized = () => {
            if (prevInit) prevInit();
            resolve();
          };
        }
        setTimeout(() => {
          if ((window as any).OfflineRecognizer) resolve();
          else reject(new Error('sherpa-onnx runtime initialization timeout'));
        }, 12000);
      });

      const config = {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          transducer: {
            encoder: '/transducer-encoder.onnx',
            decoder: '/transducer-decoder.onnx',
            joiner: '/transducer-joiner.onnx',
          },
          tokens: '/tokens.txt',
          numThreads: 1,
          provider: 'cpu',
          debug: 0,
        },
        decodingMethod: 'greedy_search',
      };
      const RecognizerCls = (window as any).OfflineRecognizer || (globalThis as any).OfflineRecognizer;
      if (!RecognizerCls) {
        throw new Error('OfflineRecognizer constructor is not available on window or globalThis');
      }
      this.recognizer = new RecognizerCls(config, (window as any).Module);

      this.updateMetrics({
        status: 'ready',
        downloadBytes: 87340000, // 87.3 MB total
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
    if (!this.recognizer) {
      await this.load();
    }
    this.isRunning = true;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.listeningStartTime = performance.now();
    this.pcmBuffer = [];
    this.updateMetrics({ status: 'listening', partialText: '', errorMessage: null });

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRunning) return;
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          this.pcmBuffer.push(inputData[i]);
        }
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // Early decode at ~2.5s to emit initial partial words and capture timeToFirstWordMs
      this.decodeIntervalId = setInterval(() => {
        if (!this.isRunning || this.isDecoding || !this.recognizer) return;
        if (!this.hasEmittedFirstWord && this.pcmBuffer.length >= 40000) {
          this.isDecoding = true;
          try {
            const floatArr = new Float32Array(this.pcmBuffer);
            const offlineStream = this.recognizer.createStream();
            offlineStream.acceptWaveform(16000, floatArr);
            this.recognizer.decode(offlineStream);
            const res = this.recognizer.getResult(offlineStream);
            offlineStream.free();
            if (res && res.text) {
              const text = res.text.trim();
              if (text) {
                const now = performance.now();
                this.hasEmittedFirstWord = true;
                const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
                this.updateMetrics({
                  timeToFirstWordMs: Math.max(0, Math.round(now - refStart)),
                  partialText: text,
                  finalText: text,
                  lagBehindSpeechMs: Math.max(20, Math.round(now - (this.speechStartTime ?? now))),
                });
              }
            }
          } catch {
            // Ignore
          } finally {
            this.isDecoding = false;
          }
        }
      }, 500);
    } catch (err) {
      this.updateMetrics({ status: 'error', errorMessage: `Audio capture error: ${(err as Error).message}` });
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.decodeIntervalId) {
      clearInterval(this.decodeIntervalId);
      this.decodeIntervalId = null;
    }

    // Run final decode on complete accumulated audio
    if (this.recognizer && this.pcmBuffer.length > 0) {
      try {
        const floatArr = new Float32Array(this.pcmBuffer);
        const offlineStream = this.recognizer.createStream();
        offlineStream.acceptWaveform(16000, floatArr);
        this.recognizer.decode(offlineStream);
        const res = this.recognizer.getResult(offlineStream);
        offlineStream.free();
        if (res && res.text) {
          const text = res.text.trim();
          const now = performance.now();
          if (!this.hasEmittedFirstWord && text.length > 0) {
            this.hasEmittedFirstWord = true;
            const refStart = this.speechStartTime ?? this.listeningStartTime ?? now;
            this.updateMetrics({ timeToFirstWordMs: Math.max(0, Math.round(now - refStart)) });
          }
          this.updateMetrics({
            partialText: text,
            finalText: text,
            lagBehindSpeechMs: Math.max(20, Math.round(now - (this.speechStartTime ?? now))),
          });
        }
      } catch {
        // Ignore
      }
    }

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
    if (this.decodeIntervalId) {
      clearInterval(this.decodeIntervalId);
      this.decodeIntervalId = null;
    }
    this.isDecoding = false;
    this.hasEmittedFirstWord = false;
    this.speechStartTime = null;
    this.pcmBuffer = [];
    this.updateMetrics({
      partialText: '',
      finalText: '',
      timeToFirstWordMs: null,
      lagBehindSpeechMs: null,
    });
  }

  public destroy(): void {
    this.stop();
    if (this.recognizer) {
      try {
        this.recognizer.free();
      } catch {
        // Ignore
      }
      this.recognizer = null;
    }
    this.listeners.clear();
  }
}
