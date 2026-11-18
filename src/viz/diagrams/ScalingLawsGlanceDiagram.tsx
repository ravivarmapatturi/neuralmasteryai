import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

/** Simplified power-law loss curve: loss ~ C^-a. Drag the compute budget
 * and watch loss fall along the curve, and watch the compute-optimal split
 * (tokens per parameter, Chinchilla's ~20:1 finding) stay fixed regardless
 * of scale -- scale changes WHERE you are on the curve, not the ratio. */
export default function ScalingLawsGlanceDiagram() {
  const t = useVizTokens();
  const computeCycle = useAutoCycle(51, 140, 20);
  const logCompute = 1 + computeCycle.value / 10;
  const setLogCompute = (next: number) => computeCycle.pick(Math.round((next - 1) * 10));
  const color = t.accentPrimary;
  const compute = Math.pow(10, logCompute);
  const loss = 3.5 * Math.pow(compute, -0.05);
  const params = Math.sqrt(compute / 6 / 20); // C ~ 6*N*D, D = 20N (Chinchilla ratio)
  const tokens = 20 * params;

  const width = 520;
  const height = 170;
  const left = 40, right = width - 20, top = 15, bottom = 130;
  const xFor = (lc: number) => left + ((lc - 1) / 5) * (right - left);
  const yFor = (l: number) => bottom - ((l - 1.0) / (3.5 - 1.0)) * (bottom - top);
  const path = Array.from({ length: 50 }, (_, i) => {
    const lc = 1 + (i / 49) * 5;
    const c = Math.pow(10, lc);
    const l = 3.5 * Math.pow(c, -0.05);
    return `${i === 0 ? 'M' : 'L'} ${xFor(lc)},${yFor(l)}`;
  }).join(' ');

  return (
    <VisualizationContainer footer="Loss falls as a smooth power law in compute -- precise enough to extrapolate a training run's expected final loss before running it at full scale. Chinchilla's finding: at any point on this curve, compute-optimal training keeps tokens-per-parameter fixed (~20:1), so a bigger compute budget means a bigger model AND proportionally more data, not one or the other.">
      <Slider label={`compute budget = 10^${logCompute.toFixed(1)}`} min={1} max={6} step={0.1} value={logCompute} onChange={setLogCompute} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 6 }}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={t.border} strokeWidth={1} />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={t.border} strokeWidth={1} />
        <path d={path} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 2" />
        <line x1={xFor(logCompute)} y1={top} x2={xFor(logCompute)} y2={bottom} stroke={color} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={xFor(logCompute)} cy={yFor(loss)} r={5} fill={color} />
        <text x={left} y={top - 4} fontSize={9} fill={t.textMuted}>pretraining loss</text>
        <text x={right} y={bottom + 16} textAnchor="end" fontSize={9} fill={t.textMuted}>log10(compute) →</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 4 }}>
        loss ≈ {loss.toFixed(2)} · compute-optimal split ≈ {params.toExponential(1)} params × {tokens.toExponential(1)} tokens
      </div>
    </VisualizationContainer>
  );
}
