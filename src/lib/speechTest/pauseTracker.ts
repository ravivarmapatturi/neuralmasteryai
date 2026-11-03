/**
 * Pause Tracker for End-of-Answer Voice Activity Detection
 *
 * Tracks pause thresholds [1.5s, 2.5s, 4.0s, 6.0s] without stopping the audio,
 * recording which threshold would have cut in while someone was thinking
 * versus which threshold cleanly detects the end of the answer.
 */

export interface PauseThresholdState {
  threshold: number; // e.g. 1.5, 2.5, 4.0, 6.0 (seconds)
  triggerCount: number; // total times this threshold was reached
  cutInCount: number; // times this threshold triggered, but speaker resumed (cut in!)
  cleanEndCount: number; // times this threshold triggered and was a genuine end of answer
  isCurrentlyTriggered: boolean; // currently active in ongoing silence
}

export interface PauseLogEvent {
  id: string;
  timestampMs: number;
  type: 'speech_start' | 'speech_stop' | 'threshold_triggered' | 'cut_in' | 'final_end';
  threshold?: number;
  silenceDurationMs?: number;
  detail: string;
}

export interface PauseReport {
  isSpeaking: boolean;
  currentSilenceSeconds: number;
  speechDurationSeconds: number;
  thresholds: Record<number, PauseThresholdState>;
  recentEvents: PauseLogEvent[];
  summary: string;
}

export const DEFAULT_PAUSE_THRESHOLDS = [1.5, 2.5, 4.0, 6.0] as const;

export class PauseTracker {
  private thresholds: number[];
  private thresholdStates: Map<number, PauseThresholdState>;
  private isSpeaking = false;
  private hasSpokenOnce = false;
  private silenceStartTime: number | null = null;
  private speechStartTime: number | null = null;
  private totalSpeechMs = 0;
  private currentSilenceMs = 0;
  private events: PauseLogEvent[] = [];
  private eventCounter = 0;

  constructor(thresholds: readonly number[] = DEFAULT_PAUSE_THRESHOLDS) {
    this.thresholds = [...thresholds].sort((a, b) => a - b);
    this.thresholdStates = new Map();
    this.initStates();
  }

  private initStates() {
    this.thresholdStates.clear();
    for (const t of this.thresholds) {
      this.thresholdStates.set(t, {
        threshold: t,
        triggerCount: 0,
        cutInCount: 0,
        cleanEndCount: 0,
        isCurrentlyTriggered: false,
      });
    }
  }

  private log(type: PauseLogEvent['type'], detail: string, threshold?: number, silenceDurationMs?: number, timestamp?: number) {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.events.unshift({
      id: `evt-${++this.eventCounter}`,
      timestampMs: time,
      type,
      threshold,
      silenceDurationMs,
      detail,
    });
    // Keep last 40 events
    if (this.events.length > 40) {
      this.events.pop();
    }
  }

  /**
   * Called when voice activity begins (speech detected).
   */
  public onSpeechStart(timestamp?: number): void {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (this.isSpeaking) return; // already speaking

    // If speaker was silent after having spoken previously, check if any thresholds triggered
    if (this.hasSpokenOnce && this.silenceStartTime !== null) {
      const pauseDurationMs = time - this.silenceStartTime;

      // Check all thresholds that triggered during this pause:
      // Since speaker has resumed, any triggered threshold was a CUT-IN on someone thinking!
      for (const t of this.thresholds) {
        const state = this.thresholdStates.get(t);
        if (state && state.isCurrentlyTriggered) {
          state.cutInCount++;
          state.isCurrentlyTriggered = false;
          this.log(
            'cut_in',
            `Cut in on thinking: ${t}s pause threshold triggered after ${(pauseDurationMs / 1000).toFixed(2)}s, but speaker resumed!`,
            t,
            pauseDurationMs,
            time
          );
        }
      }
    }

    this.isSpeaking = true;
    this.hasSpokenOnce = true;
    this.speechStartTime = time;
    this.silenceStartTime = null;
    this.currentSilenceMs = 0;

    // Reset current trigger flags for all thresholds
    for (const state of this.thresholdStates.values()) {
      state.isCurrentlyTriggered = false;
    }

    this.log('speech_start', 'Speech started', undefined, undefined, time);
  }

  /**
   * Called when voice activity ceases (silence begins).
   */
  public onSpeechEnd(timestamp?: number): void {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (!this.isSpeaking) return; // already in silence

    if (this.speechStartTime !== null) {
      this.totalSpeechMs += time - this.speechStartTime;
    }

    this.isSpeaking = false;
    this.silenceStartTime = time;
    this.speechStartTime = null;
    this.currentSilenceMs = 0;

    this.log('speech_stop', 'Speech stopped; silence began', undefined, undefined, time);
  }

  /**
   * Periodic tick (e.g. per animation frame, audio frame, or 50ms timer)
   * to evaluate pause progress against thresholds.
   */
  public tick(timestamp?: number): void {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (!this.hasSpokenOnce) return;

    if (!this.isSpeaking && this.silenceStartTime !== null) {
      this.currentSilenceMs = Math.max(0, time - this.silenceStartTime);
      const silenceSec = this.currentSilenceMs / 1000;

      for (const t of this.thresholds) {
        const state = this.thresholdStates.get(t);
        if (state && !state.isCurrentlyTriggered && silenceSec >= t) {
          state.isCurrentlyTriggered = true;
          state.triggerCount++;
          this.log(
            'threshold_triggered',
            `Reached ${t}s pause (silence: ${silenceSec.toFixed(2)}s)`,
            t,
            this.currentSilenceMs,
            time
          );
        }
      }
    }
  }

  /**
   * Called when the session finishes (e.g. user clicks Stop Answer).
   * Marks any currently triggered thresholds as clean ends rather than cut-ins.
   */
  public finalize(timestamp?: number): void {
    const time = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (this.isSpeaking) {
      this.onSpeechEnd(time);
    }

    for (const t of this.thresholds) {
      const state = this.thresholdStates.get(t);
      if (state && state.isCurrentlyTriggered) {
        state.cleanEndCount++;
        this.log(
          'final_end',
          `Clean end: ${t}s threshold detected final completion of answer.`,
          t,
          this.currentSilenceMs,
          time
        );
      }
    }
  }

  /**
   * Resets all session metrics and events.
   */
  public reset(): void {
    this.isSpeaking = false;
    this.hasSpokenOnce = false;
    this.silenceStartTime = null;
    this.speechStartTime = null;
    this.totalSpeechMs = 0;
    this.currentSilenceMs = 0;
    this.events = [];
    this.initStates();
  }

  /**
   * Generates a snapshot report for UI and JSON export.
   */
  public getReport(): PauseReport {
    const thresholdsObj: Record<number, PauseThresholdState> = {};
    for (const [k, v] of this.thresholdStates.entries()) {
      thresholdsObj[k] = { ...v };
    }

    const summaryParts: string[] = [];
    for (const t of this.thresholds) {
      const s = thresholdsObj[t];
      if (s.cutInCount > 0) {
        summaryParts.push(`${t}s cut in ${s.cutInCount} time${s.cutInCount > 1 ? 's' : ''}`);
      } else if (s.triggerCount > 0) {
        summaryParts.push(`${t}s triggered without cutting in`);
      } else {
        summaryParts.push(`${t}s was not reached`);
      }
    }

    return {
      isSpeaking: this.isSpeaking,
      currentSilenceSeconds: Math.round((this.currentSilenceMs / 1000) * 10) / 10,
      speechDurationSeconds: Math.round((this.totalSpeechMs / 1000) * 10) / 10,
      thresholds: thresholdsObj,
      recentEvents: [...this.events],
      summary: summaryParts.join('; '),
    };
  }
}
