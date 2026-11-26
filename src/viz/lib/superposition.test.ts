import { describe, expect, it } from 'vitest';
import { analyzeSuperposition, featureDirections } from './superposition';

describe('superposition geometry', () => {
  it('matches the hand-checked four-directions-in-two-dimensions Gram matrix', () => {
    const vectors = featureDirections(4, 2);
    expect(vectors[0][0]).toBeCloseTo(1, 12);
    expect(vectors[1][1]).toBeCloseTo(1, 12);
    const analysis = analyzeSuperposition(4, 2, 1, 0);
    expect(analysis.gram[0][1]).toBeCloseTo(0, 12);
    expect(analysis.gram[0][2]).toBeCloseTo(-1, 12);
    // Four ordered antipodal collisions among 12 ordered off-diagonal pairs.
    expect(analysis.meanAbsCosine).toBeCloseTo(1 / 3, 12);
    expect(analysis.interferenceByFeature[0]).toBeCloseTo(1, 12);
  });

  it('shows co-active collisions in 2D and exact recovery in a wide orthogonal basis', () => {
    const narrow = analyzeSuperposition(4, 2, 3, 0);
    const wide = analyzeSuperposition(4, 4, 3, 0);
    expect(narrow.mse).toBeCloseTo(0.5, 12);
    expect(wide.mse).toBeCloseTo(0, 12);
    expect(wide.meanAbsCosine).toBe(0);
  });
});
