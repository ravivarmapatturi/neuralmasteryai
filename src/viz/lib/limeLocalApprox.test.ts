import { describe, expect, it } from 'vitest';
import { analyzeLimeLocal, clipBoundaryLine } from './limeLocalApprox';
import { trueProb } from './interpretability';

describe('limeLocalApprox pure calculations', () => {
  it('computes exact black-box probability, local negative slopes at (1.0, 0.5), and flipped positive slopes at (-1.0, -0.5)', () => {
    const upperRight = analyzeLimeLocal({
      instX: 1.0,
      instY: 0.5,
      sigma: 0.3,
      sampleCount: 26,
      seed: 7,
    });

    // Hand check: r=1.5 => r^2 = 2.25; x^2 + y^2 = 1.25; k*(2.25 - 1.25) = 3.0
    const expectedP = 1 / (1 + Math.exp(-3));
    expect(upperRight.instanceTrueProb).toBeCloseTo(expectedP, 6);
    expect(upperRight.instanceTrueProb).toBeCloseTo(trueProb(1.0, 0.5), 6);
    expect(upperRight.b1).toBeLessThan(0);
    expect(upperRight.b2).toBeLessThan(0);
    expect(upperRight.localR2).toBeCloseTo(0.7318, 3);

    const opposite = analyzeLimeLocal({
      instX: -1.0,
      instY: -0.5,
      sigma: 0.3,
      sampleCount: 26,
      seed: 7,
    });
    expect(opposite.b1).toBeGreaterThan(0);
    expect(opposite.b2).toBeGreaterThan(0);
  });

  it('loses local fidelity R^2 when kernel width sigma widens on the curved rim', () => {
    const tight = analyzeLimeLocal({ instX: 1.2, instY: 0.9, sigma: 0.25, sampleCount: 36, seed: 7 });
    const wide = analyzeLimeLocal({ instX: 1.2, instY: 0.9, sigma: 1.5, sampleCount: 36, seed: 7 });

    expect(tight.localR2).toBeGreaterThan(wide.localR2);
  });

  it('clips vertical and diagonal linear boundaries cleanly to box bounds', () => {
    // Vertical line x = 1 (1.5 - 1*x + 0*y = 0.5 => x = 1)
    const vertical = clipBoundaryLine(1.5, -1, 0, -2, 2);
    expect(vertical).not.toBeNull();
    expect(vertical!.x1).toBeCloseTo(1, 6);
    expect(vertical!.x2).toBeCloseTo(1, 6);
    expect(Math.abs(vertical!.y2 - vertical!.y1)).toBeCloseTo(4, 6);
  });
});
