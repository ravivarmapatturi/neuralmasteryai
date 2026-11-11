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

/** The mastery scale has five stops, at 0, 25, 50, 75 and 100 percent. */
export const HEAT_STOPS = [0, 25, 50, 75, 100] as const;
export const MASTERY_STOPS = HEAT_STOPS;

/** The 5 stops for light themes: neutral paper grey through pale green to deep saturated green. */
export const MASTERY_COLORS_LIGHT = [
  '#9ca3af',
  '#86efac',
  '#4ade80',
  '#15803d',
  '#14532d',
] as const;

/** The 5 stops for dark and forest themes: neutral dark slate grey through forest green to bright saturated green. */
export const MASTERY_COLORS_DARK = [
  '#475569',
  '#166534',
  '#15803d',
  '#22c55e',
  '#4ade80',
] as const;

/** Text and numbers drawn on top of each step for $\ge 4.5:1$ contrast in light themes. */
export const MASTERY_TEXT_COLORS_LIGHT = [
  '#1b1f3b',
  '#1b1f3b',
  '#1b1f3b',
  '#ffffff',
  '#ffffff',
] as const;

/** Text and numbers drawn on top of each step for $\ge 4.5:1$ contrast in dark themes. */
export const MASTERY_TEXT_COLORS_DARK = [
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#0d1713',
  '#0d1713',
] as const;

/**
 * Colour for a completion percentage on the mastery scale. The stops are the CSS
 * variables --heat-0 to --heat-4 (set per theme), and a percentage between
 * two stops is mixed from them, so every percent has its own colour.
 */
export function getHeatmapColorMix(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const segment = Math.min(3, Math.floor(clamped / 25));
  const share = Math.round(((clamped - segment * 25) / 25) * 100);
  if (share === 0) return `var(--heat-${segment})`;
  if (share === 100) return `var(--heat-${segment + 1})`;
  return `color-mix(in oklab, var(--heat-${segment + 1}) ${share}%, var(--heat-${segment}))`;
}

/** Diameter in px of the soft glow behind a topic: 0 at 0%, 86 at 100%. */
export function getHeatGlowSize(pct: number): number {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return clamped === 0 ? 0 : Math.round(34 + 0.52 * clamped);
}

/** Opacity of that glow: 0.25 just above 0%, 0.7 at 100%. */
export function getHeatGlowOpacity(pct: number): number {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return clamped === 0 ? 0 : Number((0.25 + 0.0045 * clamped).toFixed(3));
}

/** Width in px of the line from the centre to a topic: 1.5 at 0%, 6 at 100%. */
export function getSpokeStrokeWidth(pct: number): number {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return Number((1.5 + 0.045 * clamped).toFixed(2));
}

/** Opacity of that line: 0.55 at 0%, then 0.7 just above 0% up to 1 at 100%. */
export function getSpokeOpacity(pct: number): number {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return clamped === 0 ? 0.55 : Number((0.7 + 0.003 * clamped).toFixed(3));
}
