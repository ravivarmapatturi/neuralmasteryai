import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, FlowDots } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor, type DiagramConcept } from './diagramSystem';

interface Stage {
  label: string;
  detail: string;
  concept: DiagramConcept;
}

const STAGES: Stage[] = [
  { label: 'Historical data', detail: 'Evaluate on a fixed past dataset.', concept: 'token' },
  { label: 'Offline metric', detail: 'Optimize a measurable proxy.', concept: 'embedding' },
  { label: 'A/B test', detail: 'Expose a controlled live slice.', concept: 'query' },
  { label: 'Online metric', detail: 'Observe actual product impact.', concept: 'attention' },
];

export default function OfflineVsOnlineMetricsDiagram() {
  const t = useVizTokens();
  const { value: active, pick, stop } = useAutoCycle(STAGES.length, 2500, 0);
  const width = 620;
  const stageW = Math.min(138, (width - 28) / STAGES.length - 8);
  const gap = (width - STAGES.length * stageW) / (STAGES.length + 1);
  const height = 116;

  return (
    <VisualizationContainer footer={`Validate the proxy against real user or business outcomes. ${STAGES[active].detail}`}>
      <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: DIAGRAM_TYPE.label.weight, marginBottom: 8 }}>Offline improvement is a hypothesis</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="ovom-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        <FlowDots d={`M ${gap + stageW / 2} 48 H ${width - gap - stageW / 2}`} color={t.accentPrimary} dur={3} />
        {STAGES.map((stage, i) => {
          const x = gap + i * (stageW + gap);
          const color = getConceptColor(t, stage.concept);
          const selected = active === i;
          return (
            <g key={stage.label} onClick={() => { stop(); pick(i); }} onMouseEnter={() => { stop(); pick(i); }} style={{ cursor: 'pointer' }}>
              {i > 0 && <line x1={x - gap} y1={48} x2={x - 6} y2={48} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#ovom-arrow)" />}
              <rect x={x} y={23} width={stageW} height={50} rx={8} fill={selected ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={selected ? 2.5 : 1.5} />
              <text x={x + stageW / 2} y={45} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{stage.label}</text>
              <text x={x + stageW / 2} y={62} textAnchor="middle" fontSize={8} fill={t.textSecondary}>{selected ? 'selected' : 'inspect'}</text>
            </g>
          );
        })}
        <text x={width / 2} y={101} textAnchor="middle" fontSize={10} fill={t.textMuted}>Hover or click a stage to inspect its role.</text>
      </svg>
    </VisualizationContainer>
  );
}
