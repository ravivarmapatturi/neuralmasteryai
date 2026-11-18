import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, PulseRect, line } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  { label: 'Source', desc: 'CSVs, databases, APIs, object storage, streams -- often several at once.' },
  { label: 'Ingestion', desc: 'Getting data from the source into your system, scheduled or continuous.' },
  { label: 'Validation', desc: 'Schema/type/range checks BEFORE anything downstream touches it -- catch a broken source here, not as a confusing model failure 3 stages later.' },
  { label: 'Transformation', desc: 'Cleaning, joining, reshaping into a usable table.' },
  { label: 'Storage', desc: 'A warehouse, a lake, or object storage, depending on scale and query patterns.' },
  { label: 'Feature Eng.', desc: 'Turning stored data into actual model inputs.' },
];

/** The 6-stage pipeline, click a stage for its job. Validation sits
 * deliberately early -- catching a bad source before 3 more stages waste
 * work on it. */
export default function DataPipelineFlowDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(STAGES.length, 2500);
  const active = cyc.value;
  const color = getConceptColor(t, 'attention');
  const width = 600;
  const y = 40;
  const dx = (width - 100) / (STAGES.length - 1);

  return (
    <VisualizationContainer footer={STAGES[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} 70`} style={{ display: 'block' }}>
        <defs>
          <marker id="dpf-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 55 + i * dx;
          const isActive = active === i;
          const prevX = 55 + (i - 1) * dx + 42;
          const isEdgeActive = active === i && i > 0;
          return (
            <g key={s.label}>
              {i > 0 && (
                <>
                  <line x1={prevX} y1={y} x2={x - 42} y2={y} stroke={isEdgeActive ? color : t.textMuted} strokeWidth={isEdgeActive ? 2 : 1.5} markerEnd="url(#dpf-arrow)" />
                  {isEdgeActive && !reducedMotion && (
                    <FlowDots d={line(prevX, y, x - 42, y)} color={color} count={1} dur={1.4} r={2.5} />
                  )}
                </>
              )}
              <g onClick={() => cyc.pick(i)} onMouseEnter={() => cyc.pick(i)} style={{ cursor: 'pointer' }}>
                <rect x={x - 42} y={y - 18} width={84} height={36} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                {isActive && !reducedMotion && (
                  <PulseRect x={x - 42} y={y - 18} w={84} h={36} color={color} />
                )}
                <text x={x} y={y + 4} textAnchor="middle" fontSize={8} fontWeight={isActive ? 700 : 500} fill={color}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}