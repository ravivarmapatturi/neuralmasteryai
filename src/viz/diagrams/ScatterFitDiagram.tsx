import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { POINTS, SLOPE, INTERCEPT, predict } from '../lib/linearRegressionDemoData';

/** Real least-squares fit on a small illustrative dataset -- the line is
 * computed live from the points, not hand-drawn to look plausible. */
export default function ScatterFitDiagram() {
  const t = useVizTokens();
  const pointColor = getConceptColor(t, 'embedding');
  const lineColor = getConceptColor(t, 'attention');
  const reduced = usePrefersReducedMotion();

  const width = 500;
  const height = 260;
  const padL = 44;
  const padR = 16;
  const padT = 12;
  const padB = 32;
  const xMax = 9;
  const yMax = 100;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xFor = (x: number) => padL + (x / xMax) * plotW;
  const yFor = (y: number) => padT + plotH - (y / yMax) * plotH;

  return (
    <VisualizationContainer footer={`Real least-squares fit on this data: ŷ = ${SLOPE.toFixed(1)}·x + ${INTERCEPT.toFixed(1)}. Try dragging your own fit in the Studio above and see how close you get to this real optimum.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke={t.border} strokeWidth={1} />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={t.border} strokeWidth={1} />
        <text x={padL - 8} y={padT + 6} textAnchor="end" fontSize={9} fill={t.textMuted}>{yMax}</text>
        <text x={padL - 8} y={padT + plotH} textAnchor="end" fontSize={9} fill={t.textMuted}>0</text>
        <text x={padL} y={height - 6} fontSize={10} fill={t.textMuted}>hours studied</text>
        <text x={width - padR} y={height - 6} textAnchor="end" fontSize={10} fill={t.textMuted}>{xMax}h</text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize={10} fill={t.textMuted} transform={`rotate(-90 12 ${padT + plotH / 2})`}>exam score</text>

        <line x1={xFor(0)} y1={yFor(predict(0))} x2={xFor(xMax)} y2={yFor(predict(xMax))} stroke={lineColor} strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={0}>
          {!reduced && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.55;1" dur="4s" repeatCount="indefinite" />}
        </line>

        {POINTS.map((p, i) => (
          <circle key={i} cx={xFor(p.x)} cy={yFor(p.y)} r={5} fill={pointColor} fillOpacity={0.7} stroke={pointColor} strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Each point is one student; the line minimizes total squared vertical distance to every point.
      </div>
    </VisualizationContainer>
  );
}
