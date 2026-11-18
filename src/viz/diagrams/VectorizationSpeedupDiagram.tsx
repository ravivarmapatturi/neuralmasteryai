import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PER_ITER_OVERHEAD_US = 0.08; // Python interpreter overhead per loop iteration, microseconds
const DISPATCH_OVERHEAD_US = 5; // one-time cost of dispatching a single vectorized call
const COMPUTE_PER_ELEM_US = 0.002; // actual arithmetic cost per element, compiled C/CUDA

function loopTimeUs(n: number): number {
  return n * PER_ITER_OVERHEAD_US;
}
function vectorizedTimeUs(n: number): number {
  return DISPATCH_OVERHEAD_US + n * COMPUTE_PER_ELEM_US;
}

const WIDTH = 460;
const HEIGHT = 190;
const PAD_L = 55;
const PAD_B = 30;
const MAX_N = 1_000_000;

const N_PRESETS = [10000, 500, 100000, 2000];

export default function VectorizationSpeedupDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(N_PRESETS.length, 3000, 0);
  const [userN, setUserN] = useState<number | null>(null);
  const n = userN ?? N_PRESETS[autoIdx];

  const loop = loopTimeUs(n);
  const vec = vectorizedTimeUs(n);
  const speedup = loop / vec;
  const loopColor = t.accentDanger;
  const vecColor = getConceptColor(t, 'attention');

  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 20;
  const maxTime = loopTimeUs(MAX_N);
  const xFor = (nn: number) => PAD_L + (Math.log(nn + 1) / Math.log(MAX_N + 1)) * plotW;
  const yFor = (us: number) => 20 + plotH - (Math.log(us + 1) / Math.log(maxTime + 1)) * plotH;

  const pathFor = (fn: (nn: number) => number) =>
    Array.from({ length: 40 }, (_, i) => {
      const nn = Math.exp((i / 39) * Math.log(MAX_N + 1)) - 1;
      return `${i === 0 ? 'M' : 'L'} ${xFor(nn)},${yFor(fn(nn))}`;
    }).join(' ');

  return (
    <VisualizationContainer footer={`At n=${n.toLocaleString()}: a Python for-loop takes ~${loop.toFixed(0)}µs (paying ${PER_ITER_OVERHEAD_US}µs of interpreter overhead every single iteration); the vectorized operation takes ~${vec.toFixed(1)}µs (one ${DISPATCH_OVERHEAD_US}µs dispatch, then the actual arithmetic runs in compiled code at ${COMPUTE_PER_ELEM_US}µs/element) -- a ${speedup.toFixed(0)}x speedup. The gap only widens as n grows, which is exactly why "reach for the array operation, never the element-wise loop" is the single highest-leverage performance habit in this whole page.`}>
      <Slider label="Array size (n)" value={n} onChange={(val) => { stop(); setUserN(val); }} min={10} max={MAX_N} step={10} format={(v) => v.toLocaleString()} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={PAD_L} y1={20} x2={PAD_L} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <line x1={PAD_L} y1={20 + plotH} x2={PAD_L + plotW} y2={20 + plotH} stroke={t.border} strokeWidth={1} />
        <text x={2} y={16} fontSize={9} fill={t.textMuted}>time (µs, log)</text>
        <text x={PAD_L + plotW} y={20 + plotH + 20} textAnchor="end" fontSize={9} fill={t.textMuted}>n (log scale) →</text>

        <path d={pathFor(loopTimeUs)} fill="none" stroke={loopColor} strokeWidth={2} />
        <path d={pathFor(vectorizedTimeUs)} fill="none" stroke={vecColor} strokeWidth={2} />

        <line x1={xFor(n)} y1={20} x2={xFor(n)} y2={20 + plotH} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" style={{ transition: 'x1 0.25s ease, x2 0.25s ease' }} />
        <circle cx={xFor(n)} cy={yFor(loop)} r={5} fill={loopColor} style={{ transition: 'cx 0.25s ease, cy 0.25s ease' }} />
        <circle cx={xFor(n)} cy={yFor(vec)} r={5} fill={vecColor} style={{ transition: 'cx 0.25s ease, cy 0.25s ease' }} />
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 4 }}>
        <span style={{ color: loopColor }}>■ Python for-loop</span>
        <span style={{ color: vecColor }}>■ Vectorized (NumPy/PyTorch)</span>
      </div>
    </VisualizationContainer>
  );
}
