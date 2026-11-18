import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const WIDTH = 560;
const HEIGHT = 200;
const PAD = 30;
const BIT_OPTIONS = [2, 3, 4, 8] as const;

function trueSignal(t: number): number {
  return Math.sin(2 * Math.PI * 2.2 * t) * 0.85;
}

function toXY(t: number, y: number): [number, number] {
  const x = PAD + t * (WIDTH - 2 * PAD);
  const py = HEIGHT / 2 - y * (HEIGHT / 2 - 20);
  return [x, py];
}

export default function BitDepthQuantizationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(BIT_OPTIONS.length, 2800);
  const [userBits, setUserBits] = useState<number | null>(null);
  const bits = userBits ?? BIT_OPTIONS[autoIdx];

  const levels = 2 ** bits;
  const step = 2 / levels;
  const quantize = (y: number) => Math.round(y / step) * step;

  const N = 300;
  const truePath = Array.from({ length: N }, (_, i) => {
    const tt = i / (N - 1);
    const [x, y] = toXY(tt, trueSignal(tt));
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  const quantPath = Array.from({ length: N }, (_, i) => {
    const tt = i / (N - 1);
    const [x, y] = toXY(tt, quantize(trueSignal(tt)));
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  let maxError = 0;
  for (let i = 0; i < N; i++) {
    const tt = i / (N - 1);
    maxError = Math.max(maxError, Math.abs(trueSignal(tt) - quantize(trueSignal(tt))));
  }

  const trueColor = getConceptColor(t, 'token');
  const quantColor = t.accentSecondary;

  return (
    <VisualizationContainer
      footer={
        <>
          {bits}-bit depth gives 2<sup>{bits}</sup> = {levels} amplitude levels — quantization error (the gap between true and stored value) tops out at {(maxError / 2).toFixed(3)} of full scale here. Real audio uses 16-bit ({(2 ** 16).toLocaleString()} levels), where the staircase is visually indistinguishable from the smooth curve — these small bit depths are exaggerated purely to make the steps visible.
        </>
      }
    >
      <PillSelect<number> label="Bit depth" value={bits} onChange={(b) => setUserBits(Number(b))} options={BIT_OPTIONS.map((b) => ({ value: b, label: `${b}-bit` }))} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        {Array.from({ length: levels + 1 }, (_, i) => {
          const y = -1 + i * step;
          const [, py] = toXY(0, y);
          return <line key={i} x1={PAD} y1={py} x2={WIDTH - PAD} y2={py} stroke={t.border} strokeWidth={0.75} strokeOpacity={0.5} />;
        })}
        <path d={truePath} fill="none" stroke={trueColor} strokeWidth={1.5} strokeOpacity={0.55} />
        <path d={quantPath} fill="none" stroke={quantColor} strokeWidth={2.5} strokeLinejoin="round" />
        <text x={PAD} y={16} fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={trueColor}>true continuous amplitude</text>
        <text x={WIDTH - PAD} y={16} textAnchor="end" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={quantColor}>quantized ({levels} levels)</text>
      </svg>
    </VisualizationContainer>
  );
}
