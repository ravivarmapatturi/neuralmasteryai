import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, valueColor } from './diagramSystem';

type KernelName = 'sobelX' | 'sobelY' | 'blur' | 'sharpen';

const KERNELS: Record<KernelName, number[][]> = {
  sobelX: [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ],
  sobelY: [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ],
  blur: [
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
  ],
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ],
};

const SIZE = 10;
// A clean vertical edge -- dark on the left, bright on the right, with a
// short gradient in between (a synthetic stand-in for a real photo edge).
const INPUT: number[][] = Array.from({ length: SIZE }, () =>
  Array.from({ length: SIZE }, (_, c) => (c < 4 ? 0.15 : c < 6 ? 0.15 + ((c - 4) / 2) * 0.75 : 0.9)),
);

function convolve(input: number[][], kernel: number[][]): number[][] {
  const kSize = kernel.length;
  const outSize = input.length - kSize + 1;
  const out: number[][] = [];
  for (let r = 0; r < outSize; r++) {
    const row: number[] = [];
    for (let c = 0; c < outSize; c++) {
      let sum = 0;
      for (let kr = 0; kr < kSize; kr++) {
        for (let kc = 0; kc < kSize; kc++) {
          sum += input[r + kr][c + kc] * kernel[kr][kc];
        }
      }
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

const CELL = 22;
const KCELL = 26;
const HIGHLIGHT_R = 4;
const HIGHLIGHT_C = 4; // a window straddling the edge -- always a meaningful example

export default function ConvolutionSlideDiagram() {
  const t = useVizTokens();
  const [kernelName, setKernelName] = useState<KernelName>('sobelX');
  const kernel = KERNELS[kernelName];
  const output = convolve(INPUT, kernel);

  const outMin = Math.min(...output.flat());
  const outMax = Math.max(...output.flat());
  const norm = (v: number) => (outMax === outMin ? 0.5 : (v - outMin) / (outMax - outMin));

  const highlightVal = output[HIGHLIGHT_R][HIGHLIGHT_C];
  const terms: string[] = [];
  for (let kr = 0; kr < 3; kr++) {
    for (let kc = 0; kc < 3; kc++) {
      const iv = INPUT[HIGHLIGHT_R + kr][HIGHLIGHT_C + kc];
      const kv = kernel[kr][kc];
      if (kv !== 0) terms.push(`${iv.toFixed(2)}×${kv.toFixed(2)}`);
    }
  }

  return (
    <VisualizationContainer
      footer={
        <>
          The highlighted 3×3 window: {terms.join(' + ')} = <strong>{highlightVal.toFixed(2)}</strong>. This is the entire mechanical operation a CNN's first convolutional layer performs — slide this same small window across the whole image, computing one weighted sum per position. The only difference from a real CNN layer: this kernel is hand-designed and fixed; a CNN <em>learns</em> the kernel values from data via backpropagation instead.
        </>
      }
    >
      <PillSelect<KernelName>
        label="Kernel"
        value={kernelName}
        onChange={setKernelName}
        options={[
          { value: 'sobelX', label: 'Sobel X (vertical edges)' },
          { value: 'sobelY', label: 'Sobel Y (horizontal edges)' },
          { value: 'blur', label: 'Box blur' },
          { value: 'sharpen', label: 'Sharpen' },
        ]}
      />
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 8 }}>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginBottom: 4 }}>Input (10×10)</div>
          <svg width={SIZE * CELL} height={SIZE * CELL} viewBox={`0 0 ${SIZE * CELL} ${SIZE * CELL}`} className="nm-fit-svg">
            {INPUT.map((row, r) =>
              row.map((v, c) => {
                const inWindow = r >= HIGHLIGHT_R && r < HIGHLIGHT_R + 3 && c >= HIGHLIGHT_C && c < HIGHLIGHT_C + 3;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={c * CELL}
                    y={r * CELL}
                    width={CELL - 1}
                    height={CELL - 1}
                    fill={`rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`}
                    stroke={inWindow ? t.accentPrimary : 'transparent'}
                    strokeWidth={inWindow ? 2 : 0}
                  />
                );
              }),
            )}
          </svg>
        </div>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginBottom: 4 }}>Kernel (3×3)</div>
          <svg width={3 * KCELL} height={3 * KCELL} viewBox={`0 0 ${3 * KCELL} ${3 * KCELL}`} className="nm-fit-svg">
            {kernel.map((row, r) =>
              row.map((v, c) => (
                <g key={`${r}-${c}`}>
                  <rect x={c * KCELL} y={r * KCELL} width={KCELL - 1} height={KCELL - 1} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
                  <text x={c * KCELL + KCELL / 2} y={r * KCELL + KCELL / 2 + 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={t.textPrimary}>
                    {v.toFixed(2)}
                  </text>
                </g>
              )),
            )}
          </svg>
        </div>
        <div>
          <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginBottom: 4 }}>Output (8×8)</div>
          <svg width={output.length * CELL} height={output.length * CELL} viewBox={`0 0 ${output.length * CELL} ${output.length * CELL}`} className="nm-fit-svg">
            {output.map((row, r) =>
              row.map((v, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * CELL}
                  y={r * CELL}
                  width={CELL - 1}
                  height={CELL - 1}
                  fill={valueColor(t, 'attention', norm(v))}
                  stroke={r === HIGHLIGHT_R && c === HIGHLIGHT_C ? t.accentPrimary : 'transparent'}
                  strokeWidth={r === HIGHLIGHT_R && c === HIGHLIGHT_C ? 2 : 0}
                />
              )),
            )}
          </svg>
        </div>
      </div>
    </VisualizationContainer>
  );
}
