/**
 * Silero VAD End-of-Speech Detector
 *
 * Borrowed from activated-intelligence/voice-chat
 * Repository: https://github.com/activated-intelligence/voice-chat
 *
 * MIT License
 * Copyright (c) 2025 iRelate
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

export interface SileroVADOptions {
  sampleRate?: number;
  speechThreshold?: number;
  exitThreshold?: number;
  endOfSpeechPauseSeconds?: number;
  minSpeechDurationMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: (silenceDurationMs: number) => void;
  onEndOfAnswer?: () => void;
}

export class SileroVADDetector {
  public readonly sampleRate: number;
  public readonly minSpeechDurationMs: number;
  private speechThreshold: number;
  private exitThreshold: number;
  private endOfSpeechPauseSeconds: number;

  private onSpeechStart?: () => void;
  private onSpeechEnd?: (silenceDurationMs: number) => void;
  private onEndOfAnswer?: () => void;

  private isSpeaking = false;
  private hasSpokenInTurn = false;
  public speechStartTime: number | null = null;
  private lastSpeechTime: number = 0;
  private consecutiveSpeechFrames = 0;
  private consecutiveSilenceFrames = 0;
  private isFinalized = false;

  constructor(options: SileroVADOptions = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.speechThreshold = options.speechThreshold || 0.5;
    this.exitThreshold = options.exitThreshold || 0.15;
    this.endOfSpeechPauseSeconds = options.endOfSpeechPauseSeconds || 6.0;
    this.minSpeechDurationMs = options.minSpeechDurationMs || 250;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
    this.onEndOfAnswer = options.onEndOfAnswer;
  }

  /**
   * Process a single audio frame or chunk (e.g. 512 samples at 16kHz)
   * probability: [0.0, 1.0] from Silero model, or computed RMS energy
   */
  public processFrame(probability: number, timestampMs: number = Date.now()): void {
    if (this.isFinalized) return;

    const threshold = this.isSpeaking ? this.exitThreshold : this.speechThreshold;
    const isSpeechFrame = probability >= threshold;

    if (isSpeechFrame) {
      this.consecutiveSpeechFrames++;
      this.consecutiveSilenceFrames = 0;
      this.lastSpeechTime = timestampMs;

      if (!this.isSpeaking && this.consecutiveSpeechFrames >= 2) {
        this.isSpeaking = true;
        this.hasSpokenInTurn = true;
        this.speechStartTime = timestampMs;
        this.onSpeechStart?.();
      }
    } else {
      this.consecutiveSilenceFrames++;
      this.consecutiveSpeechFrames = 0;

      if (this.isSpeaking && this.consecutiveSilenceFrames >= 5) {
        // Speech segment ended
        this.isSpeaking = false;
        const silenceDuration = timestampMs - this.lastSpeechTime;
        this.onSpeechEnd?.(silenceDuration);
      }

      // Check if total silence after speech exceeds end-of-answer pause
      if (this.hasSpokenInTurn && !this.isSpeaking && this.lastSpeechTime > 0) {
        const silenceSec = (timestampMs - this.lastSpeechTime) / 1000;
        if (silenceSec >= this.endOfSpeechPauseSeconds) {
          this.isFinalized = true;
          this.onEndOfAnswer?.();
        }
      }
    }
  }

  /**
   * Calculate RMS energy as fallback probability when Silero ONNX is not loaded
   */
  public static calculateRMSProbability(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    // Map RMS range [0.005, 0.08] to [0.0, 1.0]
    return Math.min(1, Math.max(0, (rms - 0.005) / 0.075));
  }

  public reset(): void {
    this.isSpeaking = false;
    this.hasSpokenInTurn = false;
    this.speechStartTime = null;
    this.lastSpeechTime = 0;
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isFinalized = false;
  }

  public getStatus(): { isSpeaking: boolean; hasSpoken: boolean; silenceSeconds: number } {
    const silenceSeconds =
      this.hasSpokenInTurn && this.lastSpeechTime > 0
        ? Math.max(0, (Date.now() - this.lastSpeechTime) / 1000)
        : 0;
    return {
      isSpeaking: this.isSpeaking,
      hasSpoken: this.hasSpokenInTurn,
      silenceSeconds,
    };
  }
}
