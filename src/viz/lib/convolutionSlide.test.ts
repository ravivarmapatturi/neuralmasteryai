import { describe, expect, it } from 'vitest';
import {
  analyzeConvolution,
  buildInputGrid,
  convolve2dValid,
  getWindowTerms,
  KERNELS,
} from './convolutionSlide';

describe('convolutionSlide pure calculations', () => {
  it('matches the Vision Fundamentals Sobel X hand-worked example: (200 - 10) * (1 + 2 + 1) = 760', () => {
    const analysis = analyzeConvolution({
      kernelId: 'sobelX',
      preset: 'verticalEdge',
      stride: 1,
      darkValue: 10,
      brightValue: 200,
    });

    // 7x7 input with 3x3 kernel and stride 1 -> floor((7-3)/1)+1 = 5x5 output
    expect(analysis.outSize).toBe(5);
    expect(analysis.positions).toHaveLength(25);

    // Window at (0, 0) lies purely in darkValue=10 region -> cancels to 0
    expect(analysis.output[0][0]).toBe(0);
    // Window at (0, 1) has left=10, mid=10, right=200 -> (200 - 10)*(1+2+1) = 760
    expect(analysis.output[0][1]).toBe(760);
    // Window at (0, 2) has left=10, mid=200, right=200 -> (200 - 10)*(1+2+1) = 760
    expect(analysis.output[0][2]).toBe(760);
    // Window at (0, 3) lies purely in brightValue=200 region -> cancels to 0
    expect(analysis.output[0][3]).toBe(0);

    const window = getWindowTerms(analysis.input, KERNELS.sobelX.weights, 0, 1);
    expect(window.total).toBe(760);
    expect(window.terms).toHaveLength(9);
  });

  it('hand-checks Box blur, Sharpen, and Stride=2 output dimensions', () => {
    const input = buildInputGrid('verticalEdge', 10, 200);
    // Window straddling edge at (0, 1) has 6 pixels of 10 and 3 pixels of 200:
    // Average = (6*10 + 3*200)/9 = 660/9 = 73.3333...
    const blurOut = convolve2dValid(input, KERNELS.blur.weights, 1);
    expect(blurOut[0][0]).toBeCloseTo(10, 6);
    expect(blurOut[0][1]).toBeCloseTo(660 / 9, 6);

    // Stride 2 on 7x7 with 3x3 -> floor((7-3)/2)+1 = 3x3 output
    const stride2 = analyzeConvolution({
      kernelId: 'sharpen',
      preset: 'brightBox',
      stride: 2,
      darkValue: 10,
      brightValue: 200,
    });
    expect(stride2.outSize).toBe(3);
    expect(stride2.positions).toHaveLength(9);
    // Center output (1,1) maps to input (2,2), center pixel input[3][3]=200 with 4 neighbors=200:
    // 5*200 - 4*200 = 200
    expect(stride2.output[1][1]).toBe(200);
  });
});
