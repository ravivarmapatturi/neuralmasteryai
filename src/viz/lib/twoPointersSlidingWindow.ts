export type PointerOutcome = 'too-small' | 'too-large' | 'match' | 'not-found';

export interface TwoPointerStep {
  left: number;
  right: number;
  leftValue: number | null;
  rightValue: number | null;
  sum: number | null;
  outcome: PointerOutcome;
}

export interface SlidingWindowStep {
  right: number;
  left: number;
  character: string;
  repeatedAt: number | null;
  window: string;
  bestStart: number;
  bestLength: number;
}

export function parseNumberList(text: string, limit = 12): number[] {
  return text
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Number.isFinite)
    .slice(0, limit);
}

export function isAscending(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

/** Exact two-pointer trace for a sorted list. Each non-terminal comparison
 * discards one impossible end of the remaining search interval. */
export function buildTwoPointerTrace(values: readonly number[], target: number): TwoPointerStep[] {
  if (values.length < 2 || !isAscending(values)) return [];
  const trace: TwoPointerStep[] = [];
  let left = 0;
  let right = values.length - 1;

  while (left < right) {
    const sum = values[left] + values[right];
    const outcome: PointerOutcome = sum === target ? 'match' : sum < target ? 'too-small' : 'too-large';
    trace.push({
      left,
      right,
      leftValue: values[left],
      rightValue: values[right],
      sum,
      outcome,
    });
    if (outcome === 'match') return trace;
    if (outcome === 'too-small') left += 1;
    else right -= 1;
  }

  trace.push({ left, right, leftValue: values[left] ?? null, rightValue: values[right] ?? null, sum: null, outcome: 'not-found' });
  return trace;
}
/** Exact longest-substring-without-repeats trace. The left edge jumps past a
 * repeated character instead of rescanning characters it has already seen. */
export function buildSlidingWindowTrace(text: string, limit = 20): SlidingWindowStep[] {
  const input = [...text].slice(0, limit);
  const lastSeen = new Map<string, number>();
  const trace: SlidingWindowStep[] = [];
  let left = 0;
  let bestStart = 0;
  let bestLength = 0;

  input.forEach((character, right) => {
    const previous = lastSeen.get(character);
    const repeatedAt = previous !== undefined && previous >= left ? previous : null;
    if (repeatedAt !== null) left = repeatedAt + 1;
    lastSeen.set(character, right);
    const length = right - left + 1;
    if (length > bestLength) {
      bestLength = length;
      bestStart = left;
    }
    trace.push({
      right,
      left,
      character,
      repeatedAt,
      window: input.slice(left, right + 1).join(''),
      bestStart,
      bestLength,
    });
  });
  return trace;
}
