// Pure-TypeScript image tensor math for Computer Vision beginners.
// Represents a 4x4 RGB image tensor [H, W, 3], converts pixels via BT.601
// grayscale, centered [-1, 1] scaling, and ImageNet z-score normalization,
// and computes exact tensor shape and memory byte counts.

export type RgbPixel = readonly [number, number, number];
export type TensorMode = 'rgb' | 'gray' | 'unit' | 'zscore';
export type ImagePresetId = 'sunset' | 'edge' | 'forest' | 'checker';

export interface ImagePreset {
  id: ImagePresetId;
  label: string;
  grid: RgbPixel[][];
}

export const IMAGENET_MEAN: readonly [number, number, number] = [0.485, 0.456, 0.406];
export const IMAGENET_STD: readonly [number, number, number] = [0.229, 0.224, 0.225];

export const INSPECT_TOUR: readonly [number, number][] = [
  [0, 0],
  [1, 2],
  [2, 1],
  [3, 3],
];

export const IMAGE_PRESETS: readonly ImagePreset[] = [
  {
    id: 'sunset',
    label: 'Sunset',
    grid: [
      [[82, 138, 226], [96, 152, 232], [130, 168, 224], [180, 164, 198]],
      [[228, 128, 86], [244, 164, 72], [252, 206, 64], [238, 140, 82]],
      [[192, 84, 76], [236, 126, 62], [248, 178, 56], [174, 78, 84]],
      [[38, 44, 72], [52, 54, 82], [68, 58, 76], [32, 36, 60]],
    ],
  },
  {
    id: 'edge',
    label: 'Red-Blue edge',
    grid: [
      [[235, 48, 48], [230, 56, 52], [44, 86, 228], [38, 78, 220]],
      [[228, 52, 52], [220, 60, 58], [48, 92, 232], [40, 82, 224]],
      [[215, 62, 60], [210, 68, 64], [52, 98, 236], [44, 88, 228]],
      [[205, 70, 68], [198, 74, 72], [58, 104, 240], [48, 94, 232]],
    ],
  },
  {
    id: 'forest',
    label: 'Forest leaf',
    grid: [
      [[26, 78, 42], [44, 118, 56], [62, 148, 66], [34, 94, 48]],
      [[40, 112, 54], [88, 182, 74], [124, 212, 86], [56, 136, 62]],
      [[32, 92, 48], [68, 156, 68], [96, 188, 78], [46, 116, 54]],
      [[78, 64, 44], [92, 76, 52], [64, 54, 38], [52, 44, 32]],
    ],
  },
  {
    id: 'checker',
    label: 'Gray checker',
    grid: [
      [[240, 240, 240], [32, 32, 32], [240, 240, 240], [32, 32, 32]],
      [[32, 32, 32], [240, 240, 240], [32, 32, 32], [240, 240, 240]],
      [[240, 240, 240], [32, 32, 32], [240, 240, 240], [32, 32, 32]],
      [[32, 32, 32], [240, 240, 240], [32, 32, 32], [240, 240, 240]],
    ],
  },
];

export function cloneGrid(grid: readonly RgbPixel[][]): [number, number, number][][] {
  return grid.map((row) => row.map((px) => [px[0], px[1], px[2]]));
}

export function clampByte(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Standard Rec.601 luminance formula: Y = 0.299R + 0.587G + 0.114B */
export function rgbToGrayscale(pixel: RgbPixel): number {
  return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2];
}

/** Map 0..255 uint8 byte linearly into [-1, 1]. */
export function scaleToSignedUnit(value: number): number {
  return (value / 255) * 2 - 1;
}

/** Standard ImageNet channel z-score: (x / 255 - mean_c) / std_c */
export function zscoreChannel(value: number, channel: 0 | 1 | 2): number {
  return (value / 255 - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel];
}

export interface TensorMemoryStats {
  shape: [number, number, number];
  channels: number;
  totalValues: number;
  bytesPerValue: number;
  totalBytes: number;
  dtype: 'uint8' | 'float32';
}

export function tensorMemoryStats(height: number, width: number, mode: TensorMode): TensorMemoryStats {
  const channels = mode === 'gray' ? 1 : 3;
  const dtype = mode === 'rgb' ? 'uint8' : 'float32';
  const bytesPerValue = dtype === 'uint8' ? 1 : 4;
  const totalValues = height * width * channels;
  return {
    shape: [height, width, channels],
    channels,
    totalValues,
    bytesPerValue,
    totalBytes: totalValues * bytesPerValue,
    dtype,
  };
}

/** Plain-English sentence describing what the current pixel numbers mean. */
export function explainImagePixel(
  pixel: RgbPixel,
  row: number,
  col: number,
  mode: TensorMode,
): string {
  const [r, g, b] = pixel;
  const y = rgbToGrayscale(pixel);
  if (mode === 'rgb') {
    const dominant =
      Math.max(r, g, b) - Math.min(r, g, b) < 15
        ? 'nearly neutral gray (all three channels are close)'
        : r >= g && r >= b
          ? 'warm/red-heavy because the R channel is largest'
          : g >= r && g >= b
            ? 'green-heavy because the G channel leads'
            : 'cool/blue-heavy because the B channel leads';
    return `Pixel (${row}, ${col}) stores [${r}, ${g}, ${b}] across [R, G, B] — ${dominant}.`;
  }
  if (mode === 'gray') {
    return `Pixel (${row}, ${col}) collapses [${r}, ${g}, ${b}] into one brightness number Y = ${y.toFixed(1)}, cutting channels 3→1 while losing hue.`;
  }
  if (mode === 'unit') {
    return `Pixel (${row}, ${col}) rescales [${r}, ${g}, ${b}] from [0, 255] into [${scaleToSignedUnit(r).toFixed(2)}, ${scaleToSignedUnit(g).toFixed(2)}, ${scaleToSignedUnit(b).toFixed(2)}] in [-1, 1] so gradients start centered near 0.`;
  }
  return `Pixel (${row}, ${col}) normalizes [${r}, ${g}, ${b}] by ImageNet mean & std into [${zscoreChannel(r, 0).toFixed(2)}, ${zscoreChannel(g, 1).toFixed(2)}, ${zscoreChannel(b, 2).toFixed(2)}] so every channel has ~0 mean and unit scale.`;
}

/** General formula + substituted values for the selected pixel & mode. */
export function formatImageFormula(
  pixel: RgbPixel,
  mode: TensorMode,
  stats: TensorMemoryStats,
): { general: string; worked: string } {
  const [r, g, b] = pixel;
  if (mode === 'gray') {
    const y = rgbToGrayscale(pixel);
    return {
      general: 'Y = 0.299·R + 0.587·G + 0.114·B   (shape [H, W, 1])',
      worked: `Y = 0.299×${r} + 0.587×${g} + 0.114×${b} = ${y.toFixed(1)}  |  ${stats.totalValues} values (${stats.totalBytes} B)`,
    };
  }
  if (mode === 'unit') {
    return {
      general: "x' = 2·(x / 255) − 1   (maps 0..255 → −1.00..+1.00)",
      worked: `R' = 2×(${r}/255)−1 = ${scaleToSignedUnit(r).toFixed(2)}, G' = ${scaleToSignedUnit(g).toFixed(2)}, B' = ${scaleToSignedUnit(b).toFixed(2)}`,
    };
  }
  if (mode === 'zscore') {
    return {
      general: 'z_c = (x_c/255 − μ_c) / σ_c   (μ=[0.485, 0.456, 0.406])',
      worked: `z_R = (${(r / 255).toFixed(3)}−0.485)/0.229 = ${zscoreChannel(r, 0).toFixed(2)}, z_G = ${zscoreChannel(g, 1).toFixed(2)}, z_B = ${zscoreChannel(b, 2).toFixed(2)}`,
    };
  }
  return {
    general: 'Tensor size = H × W × C × bytes_per_value',
    worked: `Shape [${stats.shape.join(', ')}] = ${stats.shape[0]}×${stats.shape[1]}×${stats.shape[2]} = ${stats.totalValues} ints (${stats.totalBytes} bytes as uint8)`,
  };
}
