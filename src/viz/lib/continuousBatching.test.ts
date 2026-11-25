import { describe, expect, it } from 'vitest';
import { compareBatching, parseRequestLengths, simulateBatching } from './continuousBatching';

describe('continuous batching playground computation', () => {
  it('matches a hand-traced two-slot schedule', () => {
    const comparison = compareBatching([2, 4, 1, 3], 2, 0, 'fifo');

    // Static: R1/R2 start together. R1 ends at 2, but its slot stays empty until R2 ends at 4.
    // R3/R4 then end at 5 and 7. Continuous refills at times 2 and 3, ending at 3 and 6.
    expect(comparison.staticBatching.completions.map((request) => request.completion)).toEqual([2, 4, 5, 7]);
    expect(comparison.continuousBatching.completions.map((request) => request.completion)).toEqual([2, 4, 3, 6]);
    expect(comparison.staticBatching.makespan).toBe(7);
    expect(comparison.continuousBatching.makespan).toBe(6);
    expect(comparison.staticBatching.averageLatency).toBe(4.5);
    expect(comparison.continuousBatching.averageLatency).toBe(3.75);
  });

  it('uses shortest-first only among requests that have arrived', () => {
    const simulation = simulateBatching([4, 1, 2], 1, 0, 'shortest-first', 'continuous');
    expect(simulation.completions.map((request) => request.completion)).toEqual([7, 1, 3]);
  });

  it('parses and clamps editable request lengths', () => {
    expect(parseRequestLengths('2, 14, -3, 4.6 nope', [3])).toEqual([2, 12, 1, 5]);
    expect(parseRequestLengths('none', [2, 4])).toEqual([2, 4]);
  });
});
