import { det2, matVec2, rank2, type Mat2, type Vec2 } from './linalg';

export type MatrixPresetId = 'shear' | 'rotate' | 'collapse' | 'reflect' | 'custom';

export interface MatrixPreset {
  id: Exclude<MatrixPresetId, 'custom'>;
  label: string;
  A: Mat2;
}

export const MATRIX_PRESETS: readonly MatrixPreset[] = [
  { id: 'shear', label: 'Shear', A: [[1.4, 0.6], [0.2, 1.1]] },
  { id: 'rotate', label: '45° rotation', A: [[0.7, -0.7], [0.7, 0.7]] },
  { id: 'collapse', label: 'Line collapse (rank 1)', A: [[1.0, 0.5], [2.0, 1.0]] },
  { id: 'reflect', label: 'Mirror flip', A: [[-1.0, 0.0], [0.0, 1.0]] },
];

export const MORPH_FRACTIONS = [0, 0.25, 0.5, 0.75, 1.0] as const;

export type OrientationKind = 'normal' | 'flipped' | 'collapsed';

export interface MatrixTransformAnalysis {
  targetA: Mat2;
  activeA: Mat2;
  morphFraction: number;
  inputV: Vec2;
  outputV: Vec2;
  col1: Vec2;
  col2: Vec2;
  scaledCol1: Vec2;
  scaledCol2: Vec2;
  determinant: number;
  areaScale: number;
  rank: number;
  orientation: OrientationKind;
  unitParallelogram: [Vec2, Vec2, Vec2, Vec2];
  explain: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function interpolateMatrix(targetA: Mat2, t: number): Mat2 {
  const frac = clamp(Number.isFinite(t) ? t : 1, 0, 1);
  return [
    [(1 - frac) * 1 + frac * targetA[0][0], frac * targetA[0][1]],
    [frac * targetA[1][0], (1 - frac) * 1 + frac * targetA[1][1]],
  ];
}

export function analyzeMatrixTransform({
  targetA,
  inputV = [1, 1],
  morphFraction = 1,
}: {
  targetA: Mat2;
  inputV?: Vec2;
  morphFraction?: number;
}): MatrixTransformAnalysis {
  const safeTarget: Mat2 = [
    [clamp(Number.isFinite(targetA[0][0]) ? targetA[0][0] : 1, -2, 2), clamp(Number.isFinite(targetA[0][1]) ? targetA[0][1] : 0, -2, 2)],
    [clamp(Number.isFinite(targetA[1][0]) ? targetA[1][0] : 0, -2, 2), clamp(Number.isFinite(targetA[1][1]) ? targetA[1][1] : 1, -2, 2)],
  ];
  const safeV: Vec2 = [
    clamp(Number.isFinite(inputV[0]) ? inputV[0] : 1, -2.5, 2.5),
    clamp(Number.isFinite(inputV[1]) ? inputV[1] : 1, -2.5, 2.5),
  ];
  const frac = clamp(Number.isFinite(morphFraction) ? morphFraction : 1, 0, 1);

  const activeA = interpolateMatrix(safeTarget, frac);
  const col1 = matVec2(activeA, [1, 0]);
  const col2 = matVec2(activeA, [0, 1]);
  const outputV = matVec2(activeA, safeV);
  const scaledCol1: Vec2 = [safeV[0] * col1[0], safeV[0] * col1[1]];
  const scaledCol2: Vec2 = [safeV[1] * col2[0], safeV[1] * col2[1]];

  const determinant = det2(activeA);
  const areaScale = Math.abs(determinant);
  const rank = rank2(col1, col2);
  const orientation: OrientationKind =
    areaScale < 0.05 ? 'collapsed' : determinant < 0 ? 'flipped' : 'normal';

  const unitParallelogram: [Vec2, Vec2, Vec2, Vec2] = [
    [0, 0],
    col1,
    [col1[0] + col2[0], col1[1] + col2[1]],
    col2,
  ];

  let explain = '';
  if (frac < 0.01) {
    explain = `Start at the untouched square grid (identity matrix, det = 1.00): Column 1 sits at (1.00, 0.00), Column 2 at (0.00, 1.00), and input v = (${safeV[0].toFixed(1)}, ${safeV[1].toFixed(1)}) has not moved yet.`;
  } else if (orientation === 'collapsed') {
    explain = `At ${Math.round(frac * 100)}% warp, Column 2 lies right along Column 1: det(A) = ${determinant.toFixed(2)}, rank = ${rank}, and the entire 2D grid collapses onto a 1D line.`;
  } else if (orientation === 'flipped') {
    explain = `At ${Math.round(frac * 100)}% warp, Column 1 crossed past Column 2: det(A) = ${determinant.toFixed(2)} (negative flips orientation like a mirror; area = ${areaScale.toFixed(2)}×), moving v to (${outputV[0].toFixed(2)}, ${outputV[1].toFixed(2)}).`;
  } else {
    explain = `At ${Math.round(frac * 100)}% warp, Column 1 lands at (${col1[0].toFixed(2)}, ${col1[1].toFixed(2)}) and Column 2 at (${col2[0].toFixed(2)}, ${col2[1].toFixed(2)}); the unit square becomes area ${areaScale.toFixed(2)}× and v lands at (${outputV[0].toFixed(2)}, ${outputV[1].toFixed(2)}).`;
  }

  return {
    targetA: safeTarget,
    activeA: [
      [round2(activeA[0][0]), round2(activeA[0][1])],
      [round2(activeA[1][0]), round2(activeA[1][1])],
    ],
    morphFraction: frac,
    inputV: safeV,
    outputV,
    col1,
    col2,
    scaledCol1,
    scaledCol2,
    determinant,
    areaScale,
    rank,
    orientation,
    unitParallelogram,
    explain,
  };
}
