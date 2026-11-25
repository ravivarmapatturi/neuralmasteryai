export type KernelId = 'sobelX' | 'sobelY' | 'blur' | 'sharpen';
export type ImagePresetId = 'verticalEdge' | 'horizontalEdge' | 'brightBox' | 'diagonal';

export interface KernelMeta {
  id: KernelId;
  label: string;
  shortLabel: string;
  weights: number[][];
  purpose: string;
}

export const KERNELS: Record<KernelId, KernelMeta> = {
  sobelX: {
    id: 'sobelX',
    label: 'Sobel X (vertical edges)',
    shortLabel: 'Sobel X',
    weights: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    purpose: 'Subtracts the left column from the right column, weighting the middle row twice.',
  },
  sobelY: {
    id: 'sobelY',
    label: 'Sobel Y (horizontal edges)',
    shortLabel: 'Sobel Y',
    weights: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    purpose: 'Subtracts the top row from the bottom row to find horizontal brightness jumps.',
  },
  blur: {
    id: 'blur',
    label: 'Box blur (average)',
    shortLabel: 'Box blur',
    weights: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
    purpose: 'Averages all 9 pixels in the 3×3 window equally to smooth out sharp jumps.',
  },
  sharpen: {
    id: 'sharpen',
    label: 'Sharpen (boost center)',
    shortLabel: 'Sharpen',
    weights: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    purpose: 'Multiplies the center pixel by 5 and subtracts its 4 direct neighbors.',
  },
};

export const IMAGE_PRESETS: { id: ImagePresetId; label: string }[] = [
  { id: 'verticalEdge', label: 'Vertical edge' },
  { id: 'horizontalEdge', label: 'Horizontal edge' },
  { id: 'brightBox', label: 'Bright square' },
  { id: 'diagonal', label: 'Diagonal stripe' },
];

export const GRID_SIZE = 7;
export const KERNEL_SIZE = 3;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Generates a 7×7 grayscale pixel grid (values 0–255) matching the textbook
 * Vision Fundamentals worked example (default dark = 10, bright = 200).
 */
export function buildInputGrid(preset: ImagePresetId, darkValue = 10, brightValue = 200): number[][] {
  const dark = clampInt(darkValue, 0, 255);
  const bright = clampInt(brightValue, 0, 255);

  return Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => {
      if (preset === 'verticalEdge') return c < 3 ? dark : bright;
      if (preset === 'horizontalEdge') return r < 3 ? dark : bright;
      if (preset === 'brightBox') return r >= 2 && r <= 4 && c >= 2 && c <= 4 ? bright : dark;
      return Math.abs(r - c) <= 1 ? bright : dark;
    }),
  );
}

/** Exact valid 2D cross-correlation output map for integer stride 1 or 2. */
export function convolve2dValid(input: number[][], kernel: number[][], stride: 1 | 2): number[][] {
  const n = input.length;
  const k = kernel.length;
  const outSize = Math.floor((n - k) / stride) + 1;
  const output: number[][] = [];

  for (let outR = 0; outR < outSize; outR++) {
    const row: number[] = [];
    const inR = outR * stride;
    for (let outC = 0; outC < outSize; outC++) {
      const inC = outC * stride;
      let sum = 0;
      for (let kr = 0; kr < k; kr++) {
        for (let kc = 0; kc < k; kc++) {
          sum += input[inR + kr][inC + kc] * kernel[kr][kc];
        }
      }
      row.push(sum);
    }
    output.push(row);
  }
  return output;
}

export interface ConvolutionTerm {
  kr: number;
  kc: number;
  pixel: number;
  weight: number;
  product: number;
}

export interface ConvolutionPosition {
  outR: number;
  outC: number;
  inR: number;
  inC: number;
  value: number;
  explain: string;
}

export interface ConvolutionAnalysis {
  kernel: KernelMeta;
  preset: ImagePresetId;
  stride: 1 | 2;
  darkValue: number;
  brightValue: number;
  input: number[][];
  output: number[][];
  outSize: number;
  outMin: number;
  outMax: number;
  positions: ConvolutionPosition[];
  defaultActiveIndex: number;
}

export function getWindowTerms(
  input: number[][],
  kernelWeights: number[][],
  inR: number,
  inC: number,
): { terms: ConvolutionTerm[]; total: number } {
  const terms: ConvolutionTerm[] = [];
  let total = 0;
  for (let kr = 0; kr < KERNEL_SIZE; kr++) {
    for (let kc = 0; kc < KERNEL_SIZE; kc++) {
      const pixel = input[inR + kr][inC + kc];
      const weight = kernelWeights[kr][kc];
      const product = pixel * weight;
      total += product;
      terms.push({ kr, kc, pixel, weight, product });
    }
  }
  return { terms, total };
}

export function analyzeConvolution({
  kernelId,
  preset,
  stride,
  darkValue = 10,
  brightValue = 200,
}: {
  kernelId: KernelId;
  preset: ImagePresetId;
  stride: 1 | 2;
  darkValue?: number;
  brightValue?: number;
}): ConvolutionAnalysis {
  const kernel = KERNELS[kernelId];
  const cleanDark = clampInt(darkValue, 0, 255);
  const cleanBright = clampInt(brightValue, 0, 255);
  const input = buildInputGrid(preset, cleanDark, cleanBright);
  const output = convolve2dValid(input, kernel.weights, stride);
  const outSize = output.length;

  const flat = output.flat();
  const outMin = Math.min(...flat);
  const outMax = Math.max(...flat);

  const positions: ConvolutionPosition[] = [];
  let bestAbs = -1;
  let defaultActiveIndex = 0;

  for (let outR = 0; outR < outSize; outR++) {
    for (let outC = 0; outC < outSize; outC++) {
      const inR = outR * stride;
      const inC = outC * stride;
      const value = output[outR][outC];
      const roundedVal = Number.isInteger(value) ? String(value) : value.toFixed(1);

      let explain: string;
      if (Math.abs(value) < 1e-6) {
        explain = `Window starts at input (${inR}, ${inC}): left/top and right/bottom cancel out, so output[${outR},${outC}] = 0 (flat patch).`;
      } else if (kernelId === 'blur') {
        explain = `Window starts at input (${inR}, ${inC}): average of the 9 pixels is ${roundedVal}.`;
      } else {
        explain = `Window starts at input (${inR}, ${inC}): weighted sum hits ${roundedVal} because the 3×3 window straddles a brightness jump.`;
      }

      if (Math.abs(value) > bestAbs) {
        bestAbs = Math.abs(value);
        defaultActiveIndex = positions.length;
      }

      positions.push({ outR, outC, inR, inC, value, explain });
    }
  }

  return {
    kernel,
    preset,
    stride,
    darkValue: cleanDark,
    brightValue: cleanBright,
    input,
    output,
    outSize,
    outMin,
    outMax,
    positions,
    defaultActiveIndex,
  };
}
