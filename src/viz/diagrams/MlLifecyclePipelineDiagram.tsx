import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  'Validation', 'Preprocessing', 'Feature Engineering', 'Training', 'Evaluation', 'Registry', 'Deployment', 'Monitoring', 'Retraining',
];

/** The 9-stage lifecycle, click a stage -- each takes the PREVIOUS
 * stage's output as input, and "Retraining" loops back to the start,
 * making this a cycle, not a one-shot line. */
export default function MlLifecyclePipelineDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(3);
  const color = getConceptColor(t, 'attention');
  const width = 600;
  const y = 40;

  return (
    <VisualizationContainer footer={`"${STAGES[active]}" takes "${STAGES[active - 1] ?? STAGES[STAGES.length - 1]}"'s output as input.`}>
      <svg width="100%" viewBox={`0 0 ${width} 105`} style={{ display: 'block' }}>
        <defs>
          <marker id="mlp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 45 + i * ((width - 90) / (STAGES.length - 1));
          const isActive = active === i;
          return (
            <g key={s}>
              {i > 0 && <line x1={45 + (i - 1) * ((width - 90) / (STAGES.length - 1)) + 38} y1={y} x2={x - 38} y2={y} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#mlp-arrow)" />}
              <g onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={isActive ? 22 : 18} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={y + 3} textAnchor="middle" fontSize={6.5} fontWeight={isActive ? 700 : 500} fill={color}>{s.split(' ')[0]}</text>
              </g>
            </g>
          );
        })}
        <path d={`M ${45 + 8 * ((width - 90) / 8)},${y + 22} C ${width - 20},${y + 48} 20,${y + 48} 45,${y + 22}`} fill="none" stroke={color} strokeWidth={1.25} strokeDasharray="3 2" markerEnd="url(#mlp-arrow)" />
        <rect x={width / 2 - 80} y={y + 36} width={160} height={14} rx={3} fill={t.surface} />
        <text x={width / 2} y={y + 46} textAnchor="middle" fontSize={8} fontWeight={600} fill={color}>retraining loops back to validation</text>
      </svg>
    </VisualizationContainer>
  );
}
