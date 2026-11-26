import { describe, expect, it } from 'vitest';
import { buildSlidingWindowTrace, buildTwoPointerTrace, isAscending, parseNumberList } from './twoPointersSlidingWindow';

describe('twoPointersSlidingWindow', () => {
  it('finds 2 + 4 = 6 after discarding the hand-checked impossible ends', () => {
    const trace = buildTwoPointerTrace([1, 2, 3, 4, 6], 6);
    expect(trace.map((step) => [step.left, step.right, step.sum, step.outcome])).toEqual([
      [0, 4, 7, 'too-large'],
      [0, 3, 5, 'too-small'],
      [1, 3, 6, 'match'],
    ]);
  });

  it('tracks abc as the longest unique window in abcabcbb', () => {
    const trace = buildSlidingWindowTrace('abcabcbb');
    expect(trace.at(-1)).toMatchObject({ left: 7, window: 'b', bestStart: 0, bestLength: 3 });
    expect(trace[3]).toMatchObject({ character: 'a', repeatedAt: 0, left: 1, window: 'bca' });
  });

  it('parses finite comma-separated numbers and detects unsorted input', () => {
    expect(parseNumberList('1, 2, nope, 4')).toEqual([1, 2, 4]);
    expect(isAscending([1, 2, 2, 4])).toBe(true);
    expect(isAscending([2, 1])).toBe(false);
  });
});
