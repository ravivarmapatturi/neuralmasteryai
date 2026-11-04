/**
 * Voice Activity Detection (VAD) and Audio Capture Pipeline
 *
 * Captures microphone stream, calculates live volume levels,
 * and performs voice activity detection (using Silero VAD or RMS energy fallback).
 */

export interface VADCallbacks {
  onSpeechStart: (timestamp: number) => void;
  onSpeechEnd: (timestamp: number) => void;
  onAudioLevel: (levelPercent: number) => void;
  onError: (error: string) => void;
}

export class AudioVADPipeline {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private monitorIntervalId: number | null = null;
  private isSpeaking = false;
  private callbacks: VADCallbacks;
  private vadInstance: any = null;
  private rmsSpeechThreshold = 0.015; // threshold for fallback voice activity detection
  private silenceFramesCount = 0;
  private speechFramesCount = 0;

  constructor(callbacks: VADCallbacks) {
    this.callbacks = callbacks;
  }

  public async start(customStream?: MediaStream): Promise<MediaStream> {
    if (customStream) {
      this.mediaStream = customStream;
    } else {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          const msg = 'Microphone permission blocked or denied. Please grant microphone access in your browser address bar.';
          this.callbacks.onError(msg);
          throw new Error(msg);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          const msg = 'No microphone device found on this system.';
          this.callbacks.onError(msg);
          throw new Error(msg);
        } else {
          const msg = `Microphone error: ${err.message || err.name}`;
          this.callbacks.onError(msg);
          throw new Error(msg);
        }
      }
    }

    // Set up AudioContext for volume analysis and fallback VAD
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;
      source.connect(this.analyser);

      // Connect to destination through a silent gain node to ensure WebAudio clock runs in all environments
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.analyser.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.startVolumeMonitoring();
    } catch (e) {
      console.warn('AudioContext volume meter setup warning:', e);
    }

    // Attempt to load Silero VAD from @ricky0123/vad-web with timeout
    try {
      const vadWeb = await import('@ricky0123/vad-web');
      if (vadWeb?.MicVAD) {
        const vadPromise = vadWeb.MicVAD.new({
          getStream: async () => this.mediaStream!,
          startOnLoad: true,
          positiveSpeechThreshold: 0.5,
          negativeSpeechThreshold: 0.35,
          onSpeechStart: () => {
            const now = performance.now();
            this.isSpeaking = true;
            this.callbacks.onSpeechStart(now);
          },
          onSpeechEnd: () => {
            const now = performance.now();
            this.isSpeaking = false;
            this.callbacks.onSpeechEnd(now);
          },
        });

        // 2 second timeout fallback so mic starts instantly even if VAD model assets are loading
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Silero VAD web assets unavailable')), 2000)
        );

        this.vadInstance = await Promise.race([vadPromise, timeoutPromise]);
      }
    } catch (err) {
      // If Silero VAD model download or ONNX fails, fallback to real-time RMS energy VAD
      console.info('Silero VAD web package note (using RMS energy VAD fallback):', (err as Error).message);
    }

    return this.mediaStream;
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);

    const checkLevel = () => {
      if (!this.analyser) return;

      this.analyser.getFloatTimeDomainData(buffer);

      // Compute Root Mean Square (RMS) energy
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const levelPct = Math.min(100, Math.round(rms * 400));
      this.callbacks.onAudioLevel(levelPct);

      // If Silero VAD is not active, run RMS energy fallback VAD
      if (!this.vadInstance) {
        const now = performance.now();
        if (rms > this.rmsSpeechThreshold) {
          this.speechFramesCount++;
          this.silenceFramesCount = 0;
          if (this.speechFramesCount >= 3 && !this.isSpeaking) {
            this.isSpeaking = true;
            this.callbacks.onSpeechStart(now);
          }
        } else {
          this.silenceFramesCount++;
          this.speechFramesCount = 0;
          if (this.silenceFramesCount >= 10 && this.isSpeaking) {
            // Approx 250-300ms of sustained quiet
            this.isSpeaking = false;
            this.callbacks.onSpeechEnd(now);
          }
        }
      }
    };

    // Use setInterval so volume calculation never stalls if RAF is throttled in headless Chrome
    this.monitorIntervalId = window.setInterval(checkLevel, 30);
  }

  public stop(): void {
    if (this.monitorIntervalId !== null) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.vadInstance) {
      try {
        this.vadInstance.destroy();
      } catch {
        // Ignore
      }
      this.vadInstance = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.isSpeaking = false;
    this.analyser = null;
  }
}
