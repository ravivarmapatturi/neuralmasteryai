import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { RESIDUALS } from '../lib/linearRegressionDemoData';

/** The actual residuals from the fit above -- scattered randomly around
 * zero with no pattern and roughly constant spread, exactly the "healthy
 * fit" signature the prose describes, computed from the same data. */
export default function ResidualPlotDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');
  const cursor = useAutoCycle(RESIDUALS.length, 700);

  const width = 500;
  const height = 220;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const xMax = 9;
  const yRange = 15;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xFor = (x: number) => padL + (x / xMax) * plotW;
  const yFor = (r: number) => padT + plotH / 2 - (r / yRange) * (plotH / 2);

  return (
    <VisualizationContainer footer="Random scatter, centered on zero, no visible pattern, roughly constant spread across x -- this is what a healthy fit's residuals look like. A curve or a funnel shape here would signal a violated assumption.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={padL} y1={yFor(0)} x2={width - padR} y2={yFor(0)} stroke={t.textMuted} strokeWidth={1.5} />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={t.border} strokeWidth={1} />
        <text x={padL - 8} y={yFor(0) + 4} textAnchor="end" fontSize={9} fill={t.textMuted}>0</text>
        <text x={padL} y={height - 6} fontSize={10} fill={t.textMuted}>hours studied</text>
        <text x={width - padR} y={height - 6} textAnchor="end" fontSize={10} fill={t.textMuted}>{xMax}h</text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize={10} fill={t.textMuted} transform={`rotate(-90 12 ${padT + plotH / 2})`}>residual</text>

        <line x1={xFor(RESIDUALS[cursor.value].x)} y1={padT} x2={xFor(RESIDUALS[cursor.value].x)} y2={padT + plotH} stroke={color} strokeWidth={1} strokeDasharray="3 4" opacity={0.55} />
        {RESIDUALS.map((p, i) => (
          <circle key={i} cx={xFor(p.x)} cy={yFor(p.residual)} r={cursor.value === i ? 7 : 5} fill={color} fillOpacity={cursor.value === i ? 1 : 0.6} stroke={color} strokeWidth={cursor.value === i ? 2.5 : 1.5} style={{ transition: 'r 250ms, fill-opacity 250ms' }} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        residual = actual − predicted, for the same fit shown above
      </div>
    </VisualizationContainer>
  );
}
