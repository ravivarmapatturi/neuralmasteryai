import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Discipline = 'research' | 'design' | 'mlops';

const INFO: Record<Discipline, { label: string; question: string; section: string; color: (t: ReturnType<typeof useVizTokens>) => string }> = {
  research: { label: 'Research / Modeling', question: 'Can a model learn this pattern, and how well?', section: 'Deep Learning, Machine Learning', color: (t) => getConceptColor(t, 'query') },
  design: { label: 'ML System Design', question: 'What system does this model need around it to solve the real problem, at scale?', section: 'This section', color: (t) => getConceptColor(t, 'attention') },
  mlops: { label: 'MLOps', question: 'How do you build, deploy, and operate that design reliably?', section: 'MLOps', color: (t) => t.accentWarn },
};

/** Three adjacent jobs, often conflated -- click each to see the distinct
 * question it answers. The middle one (this section) is deliberately
 * model-agnostic: the reasoning applies whether the model underneath is a
 * gradient-boosted tree or a transformer. */
export default function ThreeDisciplinesDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState<Discipline>('design');
  const width = 520;
  const height = 110;
  const order: Discipline[] = ['research', 'design', 'mlops'];

  return (
    <VisualizationContainer footer={`${INFO[active].label}: ${INFO[active].question} — covered in ${INFO[active].section}.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="td-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {order.map((d, i) => {
          const x = 20 + i * 175;
          const color = INFO[d].color(t);
          const isActive = active === d;
          return (
            <g key={d}>
              {i > 0 && <line x1={x - 24} y1={50} x2={x - 1} y2={50} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#td-arrow)" />}
              <g onClick={() => setActive(d)} onMouseEnter={() => setActive(d)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={20} width={150} height={60} rx={8} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x + 75} y={54} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{INFO[d].label}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a discipline — each answers a genuinely different question, in roughly this pipeline order.
      </div>
    </VisualizationContainer>
  );
}
