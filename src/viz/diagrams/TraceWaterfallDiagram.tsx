import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SPANS = [
  { label: 'API Gateway', start: 0, dur: 120 },
  { label: 'Feature Store', start: 10, dur: 25 },
  { label: 'Model Server', start: 40, dur: 65 },
  { label: 'Downstream DB', start: 45, dur: 55 },
];

/** "The API was slow" -- click a span to see WHICH service actually ate
 * the time, something no single metric can show. */
export default function TraceWaterfallDiagram() {
  const t = useVizTokens();
  const { value: active, pick } = useAutoCycle(SPANS.length, 2500, 3);
  const color = getConceptColor(t, 'attention');
  const width = 480;
  const totalDur = 120;
  const xFor = (t0: number) => 100 + (t0 / totalDur) * (width - 120);

  return (
    <VisualizationContainer footer={`${SPANS[active].label}: ${SPANS[active].dur}ms of the total 120ms request -- ${active === 3 ? 'the actual bottleneck here, nested inside "Model Server" but running against a downstream database.' : 'click "Downstream DB" to see the real bottleneck.'}`}>
      <svg width="100%" viewBox={`0 0 ${width} 120`} style={{ display: 'block' }}>
        {SPANS.map((s, i) => {
          const isActive = active === i;
          const y = 15 + i * 26;
          return (
            <g key={s.label} onClick={() => pick(i)} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer' }}>
              <text x={5} y={y + 13} fontSize={8} fill={isActive ? color : t.textMuted}>{s.label}</text>
              <rect x={xFor(s.start)} y={y} width={(s.dur / totalDur) * (width - 120)} height={18} rx={3} fill={isActive ? color : `${color}50`} opacity={isActive ? 0.85 : 0.5} />
              <text x={xFor(s.start) + 4} y={y + 13} fontSize={7} fill={t.background}>{s.dur}ms</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Only a trace shows nested/overlapping timing like this -- a single "request duration" metric would just say "120ms," not why.
      </div>
    </VisualizationContainer>
  );
}
