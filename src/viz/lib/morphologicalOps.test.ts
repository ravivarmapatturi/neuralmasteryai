import { describe, expect, it } from 'vitest';
import {
  applyMorphologicalOp,
  buildMorphPresetGrid,
  countOnPixels,
} from './morphologicalOps';

describe('morphologicalOps', () => {
  it('computes exact hand-checked pixel counts on default 7x7 blob + hole + speck (49 ON pixels)', () => {
    const grid = buildMorphPresetGrid('blob-hole-speck');
    expect(countOnPixels(grid)).toBe(49); // 49 - 1 (hole) + 1 (speck) = 49

    // Erosion with 3x3 square: inner 5x5 (25) minus 3x3 ring around center hole (9) = 16; speck dies
    // Note: (1, 9)'s 3x3 window touches blob corner (2, 8), so 2 of 9 cells are ON (needs all 9 -> 0)
    const eroded = applyMorphologicalOp({ inputGrid: grid, op: 'erosion', shape: 'square', inspectPos: [1, 9] });
    expect(eroded.outputOnCount).toBe(16);
    expect(eroded.outputGrid[1][9]).toBe(0);
    expect(eroded.inspected.onInNeighborhood).toBe(2);

    // Opening (erode then dilate): restores 7x7 minus center hole = 48; speck stays erased!
    const opened = applyMorphologicalOp({ inputGrid: grid, op: 'opening', shape: 'square', inspectPos: [1, 9] });
    expect(opened.outputOnCount).toBe(48);
    expect(opened.outputGrid[1][9]).toBe(0);
    expect(opened.outputGrid[5][5]).toBe(0);

    // Dilation: 9x9 around blob (81) + 5 extra cells from speck growth = 86; center hole fills
    const dilated = applyMorphologicalOp({ inputGrid: grid, op: 'dilation', shape: 'square', inspectPos: [5, 5] });
    expect(dilated.outputOnCount).toBe(86);
    expect(dilated.outputGrid[5][5]).toBe(1);

    // Closing: fills center hole -> 7x7 = 49, AND speck at (1,9) survives (50)
    const closed = applyMorphologicalOp({ inputGrid: grid, op: 'closing', shape: 'square', inspectPos: [5, 5] });
    expect(closed.outputGrid[5][5]).toBe(1);
    expect(closed.outputGrid[1][9]).toBe(1);
    expect(closed.outputOnCount).toBe(50);
  });

  it('opening deletes a 2x2 object completely because a 3x3 square element never fits inside it', () => {
    const grid = buildMorphPresetGrid('small-object');
    // 4x4 (16) + 2x2 (4) + 2 specks = 22
    expect(countOnPixels(grid)).toBe(22);

    const opened = applyMorphologicalOp({ inputGrid: grid, op: 'opening', shape: 'square', inspectPos: [2, 2] });
    // Only the 4x4 object survives (16 pixels)
    expect(opened.outputOnCount).toBe(16);
    expect(opened.outputGrid[2][2]).toBe(0);
    expect(opened.outputGrid[6][6]).toBe(1);
  });

  it('closing bridges a 1-pixel vertical gap between two blocks', () => {
    const grid = buildMorphPresetGrid('broken-bridge');
    expect(grid[4][5]).toBe(0);

    const closed = applyMorphologicalOp({ inputGrid: grid, op: 'closing', shape: 'square', inspectPos: [4, 5] });
    expect(closed.outputGrid[4][5]).toBe(1);
  });
});
