/** Decode time / audio duration. A decoder above real time cannot keep up. */
export function decodeRealTimeFactor(inferMs: number, sampleCount: number): number | null {
  return Number.isFinite(inferMs) && inferMs >= 0 && sampleCount >= 8000
    ? inferMs / (sampleCount / 16) : null;
}
/** Retained for consumers of the old policy API. Live speed never vetoes final decoding. */
export function shouldSkipRefinement(_ratios: number[], _disabled: boolean): boolean {
  return false;
}
/** A duration-scaled safety deadline, not an interactive UI deadline: review runs in background. */
export function refinementBudgetMs(sampleCount: number): number {
  return Math.min(600000, Math.max(30000, sampleCount / 16 * 8));
}
