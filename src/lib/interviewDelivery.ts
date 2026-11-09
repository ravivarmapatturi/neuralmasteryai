export const FILLERS = ['um', 'uh', 'like', 'you know', 'basically', 'actually'] as const;
export interface DeliveryTiming {
  durationSeconds: number;
  speakingSeconds: number;
  longPauses: number;
}
export interface DeliveryFeedback extends DeliveryTiming {
  wordCount: number;
  wordsPerMinute: number;
  fillers: Record<typeof FILLERS[number], number>;
}

/** Reuses the capture engine's RMS decision and sample clock, not ASR arrival times. */
export class DeliveryClock {
  private total = 0;
  private voiced = 0;
  private silence = 0;
  private pauses = 0;
  observe(speaking: boolean, samples: number) {
    if (!Number.isSafeInteger(samples) || samples <= 0) return;
    this.total += samples;
    if (speaking) {
      this.voiced += samples;
      this.silence = 0;
    } else if (this.voiced > 0) {
      const before = this.silence;
      this.silence += samples;
      if (before <= 48000 && this.silence > 48000) this.pauses++;
    }
  }
  snapshot(): DeliveryTiming {
    return { durationSeconds: this.total / 16000, speakingSeconds: this.voiced / 16000, longPauses: this.pauses };
  }
}

/** Literal matches: contextual uses of like/actually/etc. also count. */
export function measureDelivery(transcript: string, timing: DeliveryTiming): DeliveryFeedback {
  const words = transcript.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  const fillers = Object.fromEntries(FILLERS.map(f => [f, 0])) as DeliveryFeedback['fillers'];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === 'you' && words[i + 1] === 'know') fillers['you know']++;
    else if (Object.hasOwn(fillers, word)) fillers[word as keyof typeof fillers]++;
  }
  return { ...timing, wordCount: words.length,
    wordsPerMinute: timing.durationSeconds > 0 ? Math.round(words.length * 60 / timing.durationSeconds) : 0, fillers };
}

/** Ignore malformed remote/backup measurements; old attempts remain compatible. */
export function normalizeDelivery(value: unknown): DeliveryFeedback | undefined {
  if (!value || typeof value !== 'object') return;
  const d = value as DeliveryFeedback;
  if (![d.durationSeconds, d.speakingSeconds].every(n => Number.isFinite(n) && n >= 0 && n <= 86400)
    || d.speakingSeconds > d.durationSeconds
    || ![d.wordCount, d.wordsPerMinute, d.longPauses].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000)
    || !d.fillers || !FILLERS.every(f => Number.isSafeInteger(d.fillers[f]) && d.fillers[f] >= 0 && d.fillers[f] <= 1_000_000)) return;
  return { durationSeconds: d.durationSeconds, speakingSeconds: d.speakingSeconds, longPauses: d.longPauses,
    wordCount: d.wordCount, wordsPerMinute: d.wordsPerMinute,
    fillers: Object.fromEntries(FILLERS.map(f => [f, d.fillers[f]])) as DeliveryFeedback['fillers'] };
}
