import { describe, expect, it } from 'vitest';
import { BENCHMARKS, gainOver } from './Fable52Figures';

describe('Fable 5.2 benchmark figure matches the launch post', () => {
  it('keeps the published scores', () => {
    const robo = BENCHMARKS.find(b => b.name === 'RoboDojo Sim')!;
    expect([robo.fable52, robo.fable51, robo.opus55]).toEqual([64.9, 27.6, 39.4]);
    const fc = BENCHMARKS.find(b => b.name === 'FrontierCode 2.0')!;
    expect([fc.fable52, fc.opus55]).toEqual([49.1, 45.5]);
  });
  it('computes gaps in percentage points', () => {
    expect(gainOver(BENCHMARKS[5], 'fable51')).toBe(37.3);
    expect(gainOver(BENCHMARKS[4], 'opus55')).toBe(2.1);
  });
});
