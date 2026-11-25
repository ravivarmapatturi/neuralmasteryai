// Pure 2D binary mathematical morphology operations on an 11x11 pixel grid.

export type MorphOp = 'original' | 'erosion' | 'dilation' | 'opening' | 'closing';
export type StructuringShape = 'square' | 'cross' | 'hline';
export type MorphPresetId = 'blob-hole-speck' | 'small-object' | 'broken-bridge';

export const MORPH_GRID_SIZE = 11;
export const MORPH_OPS: readonly MorphOp[] = ['original', 'erosion', 'dilation', 'opening', 'closing'];

export interface PixelInspection {
  r: number;
  c: number;
  inputValue: number;
  outputValue: number;
  neighborhoodPositions: readonly [number, number][];
  onInNeighborhood: number;
  totalInNeighborhood: number;
  ruleSummary: string;
}

export interface MorphResult {
  op: MorphOp;
  shape: StructuringShape;
  inputGrid: number[][];
  intermediateGrid: number[][] | null;
  outputGrid: number[][];
  inputOnCount: number;
  outputOnCount: number;
  addedCount: number;
  removedCount: number;
  inspected: PixelInspection;
  explain: string;
}

export const MORPH_PRESETS: readonly { id: MorphPresetId; label: string; defaultInspect: readonly [number, number] }[] = [
  { id: 'blob-hole-speck', label: '7×7 blob + hole + speck', defaultInspect: [1, 9] },
  { id: 'small-object', label: '4×4 + 2×2 small block + specks', defaultInspect: [2, 2] },
  { id: 'broken-bridge', label: 'Two blocks + 1-px gap', defaultInspect: [5, 5] },
];

export const STRUCTURING_OFFSETS: Record<StructuringShape, readonly [number, number][]> = {
  square: [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],  [0, 0],  [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ],
  cross: [
    [-1, 0],
    [0, -1], [0, 0], [0, 1],
    [1, 0],
  ],
  hline: [
    [0, -1], [0, 0], [0, 1],
  ],
};

export function buildMorphPresetGrid(preset: MorphPresetId): number[][] {
  const g = Array.from({ length: MORPH_GRID_SIZE }, () => Array(MORPH_GRID_SIZE).fill(0));
  if (preset === 'blob-hole-speck') {
    // 7x7 blob (rows 2..8, cols 2..8), centered 1-pixel hole at (5,5), isolated speck at (1,9)
    for (let r = 2; r <= 8; r++) {
      for (let c = 2; c <= 8; c++) g[r][c] = 1;
    }
    g[5][5] = 0;
    g[1][9] = 1;
    return g;
  }
  if (preset === 'small-object') {
    // 4x4 main object + tiny 2x2 real object + two single-pixel noise specks
    for (let r = 5; r <= 8; r++) for (let c = 5; c <= 8; c++) g[r][c] = 1;
    for (let r = 2; r <= 3; r++) for (let c = 2; c <= 3; c++) g[r][c] = 1;
    g[1][9] = 1;
    g[9][1] = 1;
    return g;
  }
  // broken-bridge: two 4x4 blocks separated by a 1-pixel gap along column 5
  for (let r = 3; r <= 6; r++) {
    for (let c = 1; c <= 4; c++) g[r][c] = 1;
    for (let c = 6; c <= 9; c++) g[r][c] = 1;
  }
  return g;
}

export function erodeGrid(grid: readonly number[][], shape: StructuringShape): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const offsets = STRUCTURING_OFFSETS[shape];
  return grid.map((row, r) =>
    row.map((_, c) => {
      for (const [dr, dc] of offsets) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || grid[rr][cc] === 0) return 0;
      }
      return 1;
    }),
  );
}

export function dilateGrid(grid: readonly number[][], shape: StructuringShape): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const offsets = STRUCTURING_OFFSETS[shape];
  return grid.map((row, r) =>
    row.map((_, c) => {
      for (const [dr, dc] of offsets) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc] === 1) return 1;
      }
      return 0;
    }),
  );
}

export function countOnPixels(grid: readonly number[][]): number {
  let count = 0;
  for (const row of grid) for (const v of row) if (v === 1) count++;
  return count;
}

export function applyMorphologicalOp({
  inputGrid,
  op,
  shape = 'square',
  inspectPos = [1, 9],
}: {
  inputGrid: readonly number[][];
  op: MorphOp;
  shape?: StructuringShape;
  inspectPos?: readonly [number, number];
}): MorphResult {
  const rows = inputGrid.length;
  const cols = inputGrid[0]?.length ?? 0;
  const r = Math.max(0, Math.min(rows - 1, Math.round(inspectPos[0])));
  const c = Math.max(0, Math.min(cols - 1, Math.round(inspectPos[1])));

  const copy = inputGrid.map((row) => row.slice());
  let intermediateGrid: number[][] | null = null;
  let outputGrid: number[][];

  if (op === 'original') {
    outputGrid = copy;
  } else if (op === 'erosion') {
    outputGrid = erodeGrid(copy, shape);
  } else if (op === 'dilation') {
    outputGrid = dilateGrid(copy, shape);
  } else if (op === 'opening') {
    intermediateGrid = erodeGrid(copy, shape);
    outputGrid = dilateGrid(intermediateGrid, shape);
  } else {
    intermediateGrid = dilateGrid(copy, shape);
    outputGrid = erodeGrid(intermediateGrid, shape);
  }

  const offsets = STRUCTURING_OFFSETS[shape];
  const neighborhoodPositions: [number, number][] = [];
  let onInNeighborhood = 0;
  for (const [dr, dc] of offsets) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      neighborhoodPositions.push([rr, cc]);
      if (copy[rr][cc] === 1) onInNeighborhood++;
    }
  }

  const totalInNeighborhood = offsets.length;
  const inputOnCount = countOnPixels(copy);
  const outputOnCount = countOnPixels(outputGrid);
  let addedCount = 0;
  let removedCount = 0;
  for (let rr = 0; rr < rows; rr++) {
    for (let cc = 0; cc < cols; cc++) {
      if (copy[rr][cc] === 0 && outputGrid[rr][cc] === 1) addedCount++;
      if (copy[rr][cc] === 1 && outputGrid[rr][cc] === 0) removedCount++;
    }
  }

  const inputValue = copy[r][c];
  const outputValue = outputGrid[r][c];

  let ruleSummary = '';
  if (op === 'original') {
    ruleSummary = `Input pixel (${r}, ${c}) is ${inputValue} (${onInNeighborhood}/${totalInNeighborhood} stamp cells ON).`;
  } else if (op === 'erosion') {
    ruleSummary =
      onInNeighborhood === totalInNeighborhood
        ? `All ${totalInNeighborhood}/${totalInNeighborhood} stamp cells are ON → pixel (${r}, ${c}) stays 1.`
        : `Only ${onInNeighborhood}/${totalInNeighborhood} stamp cells are ON (needs all ${totalInNeighborhood}) → pixel (${r}, ${c}) becomes 0.`;
  } else if (op === 'dilation') {
    ruleSummary =
      onInNeighborhood >= 1
        ? `${onInNeighborhood}/${totalInNeighborhood} stamp cell(s) ON (needs ≥ 1) → pixel (${r}, ${c}) becomes 1.`
        : `0/${totalInNeighborhood} stamp cells ON → pixel (${r}, ${c}) stays 0.`;
  } else if (op === 'opening') {
    const mid = intermediateGrid![r][c];
    ruleSummary = `Pass 1 (erode): (${r}, ${c}) becomes ${mid}. Pass 2 (dilate): output (${r}, ${c}) is ${outputValue}.`;
  } else {
    const mid = intermediateGrid![r][c];
    ruleSummary = `Pass 1 (dilate): (${r}, ${c}) becomes ${mid}. Pass 2 (erode): output (${r}, ${c}) is ${outputValue}.`;
  }

  let explain = '';
  if (op === 'original') {
    explain = `Original mask has ${inputOnCount} ON pixels. Watch how each filter transforms isolated specks and holes.`;
  } else if (op === 'erosion') {
    explain = `Erosion keeps a pixel ON only if every cell under the ${shape} stamp is ON — erasing ${removedCount} edge and speck pixels (${inputOnCount} → ${outputOnCount}).`;
  } else if (op === 'dilation') {
    explain = `Dilation turns a pixel ON if at least one stamp cell is ON — adding ${addedCount} pixels (${inputOnCount} → ${outputOnCount}), filling holes but also growing specks.`;
  } else if (op === 'opening') {
    explain = `Opening (erode then dilate) permanently deletes specks smaller than the stamp (−${removedCount} px, +${addedCount} px → ${outputOnCount} total) while restoring large shapes.`;
  } else {
    explain = `Closing (dilate then erode) seals narrow holes and gaps (+${addedCount} px, −${removedCount} px → ${outputOnCount} total) while keeping the overall object width.`;
  }

  return {
    op,
    shape,
    inputGrid: copy,
    intermediateGrid,
    outputGrid,
    inputOnCount,
    outputOnCount,
    addedCount,
    removedCount,
    inspected: {
      r,
      c,
      inputValue,
      outputValue,
      neighborhoodPositions,
      onInNeighborhood,
      totalInNeighborhood,
      ruleSummary,
    },
    explain,
  };
}
