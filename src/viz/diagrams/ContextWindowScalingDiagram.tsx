import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Attention cost is O(n^2) in sequence length -- drag context length and
 * watch full attention's compute grow quadratically against sliding-window
 * attention's linear growth, made concrete with an actual multiplier. */
export default function ContextWindowScalingDiagram() {
  const t = useVizTokens();
  const contextCycle = useAutoCycle(64, 180, 15);
  const n = (contextCycle.value + 1) * 500;
  const setN = (next: number) => contextCycle.pick(Math.max(0, Math.round(next / 500) - 1));
  const fullColor = t.accentDanger;
  const sparseColor = getConceptColor(t, 'attention');
  const maxN = 32000;
  const windowSize = 2048;

  const width = 560;
  const height = 180;
  const chartLeft = 50;
  const chartRight = width - 20;
  const chartBottom = 150;
  const chartTop = 15;

  const fullCost = (x: number) => x * x;
  const sparseCost = (x: number) => x * windowSize;
  const maxCost = fullCost(maxN);

  const xFor = (v: number) => chartLeft + (v / maxN) * (chartRight - chartLeft);
  const yFor = (v: number) => chartBottom - (Math.min(v, maxCost) / maxCost) * (chartBottom - chartTop);

  const points = (fn: (x: number) => number) =>
    Array.from({ length: 40 }, (_, i) => {
      const x = (i / 39) * maxN;
      return `${i === 0 ? 'M' : 'L'} ${xFor(x)},${yFor(fn(x))}`;
    }).join(' ');

  const ratio = fullCost(n) / sparseCost(n);

  return (
    <VisualizationContainer footer={`At ${n.toLocaleString()} tokens: full attention costs ${ratio.toFixed(1)}x more than sliding-window attention (window=${windowSize}). That multiplier only grows as context length grows -- exactly why long-context models lean on sparse/sliding-window attention plus efficient kernels rather than paying full O(n²) at scale.`}>
      <Slider label={`context length = ${n.toLocaleString()} tokens`} min={500} max={maxN} step={500} value={n} onChange={setN} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <path d={points(fullCost)} fill="none" stroke={fullColor} strokeWidth={2.5} />
        <path d={points(sparseCost)} fill="none" stroke={sparseColor} strokeWidth={2.5} />
        <line x1={xFor(n)} y1={chartTop} x2={xFor(n)} y2={chartBottom} stroke={t.textMuted} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={xFor(n)} cy={yFor(fullCost(n))} r={4} fill={fullColor} />
        <circle cx={xFor(n)} cy={yFor(sparseCost(n))} r={4} fill={sparseColor} />
        <text x={chartLeft} y={chartTop - 4} fontSize={9} fill={t.textMuted}>compute cost</text>
        <text x={chartRight} y={chartBottom + 16} textAnchor="end" fontSize={9} fill={t.textMuted}>sequence length →</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 10 }}>
        <span style={{ color: fullColor }}>■ full attention — O(n²)</span>
        <span style={{ color: sparseColor }}>■ sliding-window — O(n·w)</span>
      </div>
    </VisualizationContainer>
  );
}
