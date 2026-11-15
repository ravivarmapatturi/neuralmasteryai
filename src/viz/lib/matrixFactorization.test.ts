import { describe, it, expect } from 'vitest';
import {
  TOY_MF_RATINGS,
  invert2x2,
  runAlsExplicit,
  rotateFactors2D,
} from './matrixFactorization';

describe('matrixFactorization engine', () => {
  it('correctly inverts 2x2 matrix', () => {
    const A = [
      [4, 1],
      [2, 3],
    ];
    // det = 4*3 - 1*2 = 10
    // inv = [[3/10, -1/10], [-2/10, 4/10]]
    const invA = invert2x2(A);
    expect(invA[0][0]).toBeCloseTo(0.3, 4);
    expect(invA[0][1]).toBeCloseTo(-0.1, 4);
    expect(invA[1][0]).toBeCloseTo(-0.2, 4);
    expect(invA[1][1]).toBeCloseTo(0.4, 4);
  });

  it('runs deterministic ALS and reduces training loss', () => {
    const iter1 = runAlsExplicit(TOY_MF_RATINGS, 1, 0.1);
    const iter15 = runAlsExplicit(TOY_MF_RATINGS, 15, 0.1);

    expect(iter15.loss).toBeLessThan(iter1.loss);
    expect(iter15.loss).toBeLessThan(0.3); // Converges closely on 4x4 matrix
    // Verify reconstruction shapes
    expect(iter15.reconstructed.length).toBe(4);
    expect(iter15.reconstructed[0].length).toBe(4);
    // User 0 Item 0 target is 5
    expect(iter15.reconstructed[0][0]).toBeGreaterThan(3.5);
    // User 0 Item 3 target is 1
    expect(iter15.reconstructed[0][3]).toBeLessThan(2.0);
  });

  it('empirically verifies rotational invariance of predictions', () => {
    const { U, V, reconstructed: originalRec } = runAlsExplicit(TOY_MF_RATINGS, 10, 0.1);

    // Rotate factors by 37 degrees
    const { U_rotated, reconstructed: rotatedRec } = rotateFactors2D(U, V, 37);

    // Latent factor values have changed
    expect(U_rotated[0][0]).not.toBeCloseTo(U[0][0], 2);

    // Yet predicted ratings are mathematically identical: (UQ)(VQ)^T = U V^T
    for (let u = 0; u < 4; u++) {
      for (let i = 0; i < 4; i++) {
        expect(rotatedRec[u][i]).toBeCloseTo(originalRec[u][i], 5);
      }
    }
  });
});
