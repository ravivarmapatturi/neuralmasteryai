/**
 * matrixFactorization.ts
 *
 * Exact educational engine for Matrix Factorization, ALS, SGD,
 * rotational identifiability, and Hu-Koren-Volinsky implicit confidence.
 * Built around a reproducible 4x4 toy interaction matrix with rank k=2.
 */

export const TOY_MF_RATINGS: (number | null)[][] = [
  [5, 4, null, 1],
  [4, 5, 2, null],
  [null, 2, 5, 4],
  [1, null, 4, 5],
];

export const MF_USER_NAMES = ['Alice (u1)', 'Bob (u2)', 'Charlie (u3)', 'Diana (u4)'];
export const MF_ITEM_NAMES = ['Linear Models (i1)', 'Neural Nets (i2)', 'Transformers (i3)', 'RL Systems (i4)'];

/** Invert a 2x2 matrix analytically. */
export function invert2x2(m: number[][]): number[][] {
  const [a, b] = m[0];
  const [c, d] = m[1];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-9) {
    // Regularized fallback
    return [
      [1, 0],
      [0, 1],
    ];
  }
  const invDet = 1 / det;
  return [
    [d * invDet, -b * invDet],
    [-c * invDet, a * invDet],
  ];
}

/** Multiply a 2x2 matrix by a 2D vector. */
export function mul2x2Vec(m: number[][], v: number[]): number[] {
  return [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]];
}

/** Multiply two 2x2 matrices. */
export function mul2x2(A: number[][], B: number[][]): number[][] {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}

/** Run deterministic ALS on the toy matrix for rank k=2. */
export function runAlsExplicit(
  ratings: (number | null)[][],
  iterations: number = 10,
  lambda: number = 0.1
): {
  U: number[][];
  V: number[][];
  reconstructed: number[][];
  loss: number;
} {
  const m = ratings.length;
  const n = ratings[0].length;

  // Pedagogical fixed initialization
  let U: number[][] = [
    [0.8, 0.2],
    [0.7, 0.3],
    [0.2, 0.8],
    [0.1, 0.9],
  ];
  let V: number[][] = [
    [0.9, 0.1],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.1, 0.9],
  ];

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Solve for U given V
    for (let u = 0; u < m; u++) {
      // Gram matrix: sum_{i in I_u} v_i v_i^T + lambda * I
      let G00 = lambda, G01 = 0, G10 = 0, G11 = lambda;
      let rhs0 = 0, rhs1 = 0;

      for (let i = 0; i < n; i++) {
        const r = ratings[u][i];
        if (r !== null) {
          const v0 = V[i][0];
          const v1 = V[i][1];
          G00 += v0 * v0;
          G01 += v0 * v1;
          G10 += v1 * v0;
          G11 += v1 * v1;
          rhs0 += r * v0;
          rhs1 += r * v1;
        }
      }

      const invG = invert2x2([
        [G00, G01],
        [G10, G11],
      ]);
      U[u] = mul2x2Vec(invG, [rhs0, rhs1]);
    }

    // 2. Solve for V given U
    for (let i = 0; i < n; i++) {
      let G00 = lambda, G01 = 0, G10 = 0, G11 = lambda;
      let rhs0 = 0, rhs1 = 0;

      for (let u = 0; u < m; u++) {
        const r = ratings[u][i];
        if (r !== null) {
          const u0 = U[u][0];
          const u1 = U[u][1];
          G00 += u0 * u0;
          G01 += u0 * u1;
          G10 += u1 * u0;
          G11 += u1 * u1;
          rhs0 += r * u0;
          rhs1 += r * u1;
        }
      }

      const invG = invert2x2([
        [G00, G01],
        [G10, G11],
      ]);
      V[i] = mul2x2Vec(invG, [rhs0, rhs1]);
    }
  }

  // Reconstructed matrix and squared loss on observed entries
  const reconstructed: number[][] = [];
  let sse = 0;
  let count = 0;

  for (let u = 0; u < m; u++) {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const pred = U[u][0] * V[i][0] + U[u][1] * V[i][1];
      row.push(pred);
      const target = ratings[u][i];
      if (target !== null) {
        sse += (target - pred) ** 2;
        count++;
      }
    }
    reconstructed.push(row);
  }

  const loss = count > 0 ? sse / count : 0;
  return { U, V, reconstructed, loss };
}

/** Apply an orthogonal rotation matrix Q(theta) to 2D factors U and V. */
export function rotateFactors2D(
  U: number[][],
  V: number[][],
  angleDegrees: number
): {
  U_rotated: number[][];
  V_rotated: number[][];
  reconstructed: number[][];
} {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const Q = [
    [cos, -sin],
    [sin, cos],
  ];

  const U_rotated = U.map((row) => mul2x2Vec(Q, row));
  const V_rotated = V.map((row) => mul2x2Vec(Q, row));

  const reconstructed = U_rotated.map((uRow) =>
    V_rotated.map((vRow) => uRow[0] * vRow[0] + uRow[1] * vRow[1])
  );

  return { U_rotated, V_rotated, reconstructed };
}
