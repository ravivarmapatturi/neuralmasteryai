import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STEPS = 14;
/** tanh'(z) at a "typical" activation point -- fixed so the slider isolates
 * the effect of W_h alone, the same simplification the derivation above
 * makes when it says "every factor is bounded by roughly ||W_h||". */
const TANH_PRIME = 0.9;

/** Same product-of-Jacobians math as the derivation above, made draggable:
 * move w_h and watch |dh_T/dh_t| either decay to ~0 (vanish) or blow up
 * (explode) as it's carried back through more steps, exactly as
 * prod_{k=t+1}^{T} tanh'(z_k) W_h predicts. */
export default function VanishingGradientDiagram() {
  const t = useVizTokens();
  const weightCycle = useAutoCycle(31, 140, 12);
  const w = 0.3 + weightCycle.value * 0.05;
  const setW = (value: number) => weightCycle.pick(Math.round((value - 0.3) / 0.05));
  const stepCycle = useAutoCycle(STEPS, 900);
  const hoveredStep: number | null = stepCycle.value;
  const setHoveredStep = (value: number | null) => { if (value !== null) stepCycle.pick(value); };
  const factor = w * TANH_PRIME;
  const vanishing = factor < 1;

  const magnitudes = Array.from({ length: STEPS }, (_, i) => Math.pow(factor, i + 1));
  const color = vanishing ? t.accentSecondary : t.accentDanger;

  const width = 600;
  const height = 210;
  const chartTop = 20;
  const chartH = 130;
  const barGap = 4;
  const barW = (width - 60) / STEPS - barGap;
  const maxBar = Math.max(1, ...magnitudes);
  const barX = (i: number) => 40 + i * ((width - 60) / STEPS);
  const barH = (m: number) => Math.max(2, (Math.min(m, maxBar) / maxBar) * chartH);

  return (
    <VisualizationContainer footer="Drag w_h -- below the threshold, |dh_T/dh_t| decays exponentially with distance (vanishing); above it, the same product blows up (exploding). Both come from the identical mechanism: (T-t) repeated multiplications by the same W_h.">
      <div style={{ marginBottom: 12 }}>
        <Slider label={`w_h = ${w.toFixed(2)}  (per-step factor tanh'(z)·w_h ≈ ${factor.toFixed(3)})`} min={0.3} max={1.8} step={0.05} value={w} onChange={setW} />
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={40} y1={chartTop + chartH} x2={width - 20} y2={chartTop + chartH} stroke={t.border} strokeWidth={1} />
        <line x1={40} y1={chartTop} x2={40} y2={chartTop + chartH} stroke={t.border} strokeWidth={1} />
        {magnitudes.map((m, i) => {
          const h = barH(m);
          const isHovered = hoveredStep === i;
          return (
            <g key={i} onMouseEnter={() => setHoveredStep(i)} onMouseLeave={() => setHoveredStep(null)} style={{ cursor: 'pointer' }}>
              <rect
                x={barX(i)}
                y={chartTop + chartH - h}
                width={barW}
                height={h}
                fill={color}
                opacity={isHovered ? 1 : 0.75}
                rx={1.5}
              />
              <text x={barX(i) + barW / 2} y={chartTop + chartH + 14} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>
                {i + 1}
              </text>
            </g>
          );
        })}
        <text x={40} y={chartTop - 6} fontSize={10} fontFamily="monospace" fill={t.textMuted}>
          |∂h_T/∂h_t|
        </text>
        <text x={width - 20} y={chartTop + chartH + 28} textAnchor="end" fontSize={10} fill={t.textMuted}>
          steps back (T - t)
        </text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 4 }}>
        {hoveredStep !== null
          ? `after ${hoveredStep + 1} steps: factor^${hoveredStep + 1} ≈ ${magnitudes[hoveredStep].toExponential(2)}`
          : vanishing
            ? 'factor < 1 — gradient vanishes exponentially with distance'
            : 'factor > 1 — gradient explodes exponentially with distance'}
      </div>
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <VisualizationMath latex="\frac{\partial h_T}{\partial h_t} = \prod_{k=t+1}^{T} \mathrm{diag}(\tanh'(z_k))\, W_h" />
      </div>
    </VisualizationContainer>
  );
}
