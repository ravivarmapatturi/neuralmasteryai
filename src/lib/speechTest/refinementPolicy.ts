/** Decode time / audio duration. A decoder above real time cannot keep up. */
export function decodeRealTimeFactor(inferMs: number, sampleCount: number): number | null {
  return Number.isFinite(inferMs) && inferMs >= 0 && sampleCount >= 8000
    ? inferMs / (sampleCount / 16) : null;
}
export function shouldSkipRefinement(ratios: number[], disabled: boolean): boolean {
  const recent = ratios.slice(-5).sort((a, b) => a - b);
  return disabled || (recent.length > 0 && recent[Math.floor(recent.length / 2)] > 0.75);
}
/** Decode-only budget; model download has a separate deadline. */
export function refinementBudgetMs(sampleCount: number): number {
  return Math.min(12000, Math.max(6000, sampleCount / 16 * 2.5));
}
