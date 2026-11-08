import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor, type DiagramConcept } from './diagramSystem';

export type SystemDesignFlow = {
  title: string;
  footer: string;
  stages: { label: string; detail: string; concept: DiagramConcept }[];
};

/** A compact, interactive flow used where the lesson is the relationship
 * between a small number of system-design choices. Each named wrapper below
 * supplies its own domain-specific stages and explanation. */
export default function SystemDesignFlowDiagram({ flow }: { flow: SystemDesignFlow }) {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const width = 620;
  const stageW = Math.min(138, (width - 28) / flow.stages.length - 8);
  const gap = (width - flow.stages.length * stageW) / (flow.stages.length + 1);
  const height = 116;

  return (
    <VisualizationContainer footer={`${flow.footer} ${flow.stages[active].detail}`}>
      <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: DIAGRAM_TYPE.label.weight, marginBottom: 8 }}>{flow.title}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs><marker id="system-flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} /></marker></defs>
        {flow.stages.map((stage, i) => {
          const x = gap + i * (stageW + gap);
          const color = getConceptColor(t, stage.concept);
          const selected = active === i;
          return <g key={stage.label} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
            {i > 0 && <line x1={x - gap} y1={48} x2={x - 6} y2={48} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#system-flow-arrow)" />}
            <rect x={x} y={23} width={stageW} height={50} rx={8} fill={selected ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={selected ? 2.5 : 1.5} />
            <text x={x + stageW / 2} y={45} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{stage.label}</text>
            <text x={x + stageW / 2} y={62} textAnchor="middle" fontSize={8} fill={t.textSecondary}>{selected ? 'selected' : 'inspect'}</text>
          </g>;
        })}
        <text x={width / 2} y={101} textAnchor="middle" fontSize={10} fill={t.textMuted}>Hover or click a stage to inspect its role.</text>
      </svg>
    </VisualizationContainer>
  );
}
