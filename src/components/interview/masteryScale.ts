export interface TopicProgress {
  ratio: number;
  pct: number;
  isComplete: boolean;
}

/**
 * Calculates completion ratio [0, 1] and percentage [0, 100] for a topic.
 */
export function calculateTopicProgress(done: number = 0, count: number = 0): TopicProgress {
  if (count <= 0) return { ratio: 0, pct: 0, isComplete: false };
  const clampedDone = Math.max(0, Math.min(done, count));
  const ratio = clampedDone / count;
  const pct = Math.round(ratio * 100);
  return {
    ratio,
    pct,
    isComplete: clampedDone === count && count > 0,
  };
}

/**
 * Calculates edge progress connecting topics A and B as their average mastery.
 */
export function calculateEdgeProgress(progressA: number, progressB: number): number {
  const a = Math.max(0, Math.min(1, Number.isFinite(progressA) ? progressA : 0));
  const b = Math.max(0, Math.min(1, Number.isFinite(progressB) ? progressB : 0));
  return (a + b) / 2;
}

/**
 * Calculates stroke width for connecting lines on a smooth scale from 1.0px (0%) to 2.8px (100%).
 * Active / lit edges range from 2.5px up to 3.4px.
 */
export function getEdgeStrokeWidth(edgeProgress: number, isLit: boolean): number {
  const p = Math.max(0, Math.min(1, Number.isFinite(edgeProgress) ? edgeProgress : 0));
  if (isLit) {
    return Number((2.5 + 0.9 * p).toFixed(2));
  }
  return Number((1.0 + 1.8 * p).toFixed(2));
}

/**
 * Calculates opacity for connecting lines on a smooth scale:
 * Light mode: 0.22 at 0% to 0.85 at 100%
 * Dark mode: 0.20 at 0% to 0.88 at 100%
 * Active / lit edge: 1.0
 */
export function getEdgeOpacity(edgeProgress: number, isLit: boolean, isDark: boolean): number {
  if (isLit) return 1.0;
  const p = Math.max(0, Math.min(1, Number.isFinite(edgeProgress) ? edgeProgress : 0));
  const minOpacity = isDark ? 0.20 : 0.22;
  const maxOpacity = isDark ? 0.88 : 0.85;
  return Number((minOpacity + (maxOpacity - minOpacity) * p).toFixed(3));
}

/**
 * Calculates dot diameter (thicker on smooth scale from 0% to 100%).
 */
export function getNodeDotSize(count: number, progress: number): number {
  const base = 8 + Math.sqrt(Math.max(1, count)) * 1.5;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Number((base + 3.5 * p).toFixed(1));
}

/**
 * Calculates outer diameter of progress ring.
 */
export function getNodeRingSize(dotSize: number, progress: number): number {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Number((dotSize + 8 + 4 * p).toFixed(1));
}

/**
 * Calculates stroke width of progress ring mask (from 2.0px to 4.0px).
 */
export function getNodeRingStrokeWidth(progress: number): number {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Number((2.0 + 2.0 * p).toFixed(1));
}

/**
 * Calculates node container opacity:
 * Inactive/far nodes scale from 0.42 (0%) to 0.80 (100%).
 * Active/near nodes are always 1.0.
 */
export function getNodeOpacity(progress: number, isFar: boolean): number {
  if (!isFar) return 1.0;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return Number((0.42 + 0.38 * p).toFixed(3));
}

/**
 * Formats topic label: appends percentage once above 0.
 * e.g. "Transformers" at 0%, "Transformers 42%" at 42%.
 */
export function formatTopicLabel(baseTitle: string, pct: number): string {
  if (pct > 0) {
    return `${baseTitle} ${pct}%`;
  }
  return baseTitle;
}

/**
 * Formats screen-reader accessible label with exact percentage and completion count.
 */
export function formatAccessibleTopicLabel(
  title: string,
  pct: number,
  done: number = 0,
  count: number = 0
): string {
  return `${title}, ${pct}% completed, ${done} of ${count} questions`;
}
