import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const SUITES = ['Unit/data/schema', 'Statistical/model', 'Regression', 'LLM-specific'];

/** Every test category funnels into one gate -- click a suite to
 * see it feed the same pass/fail decision, whether the underlying
 * property is deterministic logic or a statistical/generative one. */
export default function CiCdTestGateDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(3);
  const color = getConceptColor(t, 'attention');
  const width = 480;

  return (
    <VisualizationContainer footer={`${SUITES[active]} feeds the SAME deployment gate -- a bad prompt regression blocks a deploy exactly like a failing unit test would.`}>
      <svg width="100%" viewBox={`0 0 ${width} 130`} style={{ display: 'block' }}>
        <defs>
          <marker id="ctg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
          <marker id="ctg-arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>
        {SUITES.map((s, i) => {
          const y = 18 + i * 25;
          const isActive = active === i;
          const targetY = 32 + i * 19;
          return (
            <g key={s} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
              <rect x={10} y={y} width={150} height={20} rx={5} fill={isActive ? `${color}25` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2 : 1.25} />
              <text x={85} y={y + 14} textAnchor="middle" fontSize={8} fontWeight={isActive ? 700 : 500} fill={color}>{s}</text>
              <line
                x1={160}
                y1={y + 10}
                x2={274}
                y2={targetY}
                stroke={isActive ? color : t.textMuted}
                strokeWidth={isActive ? 2 : 1}
                opacity={isActive ? 1 : 0.4}
                markerEnd={isActive ? 'url(#ctg-arrow-active)' : 'url(#ctg-arrow)'}
              />
            </g>
          );
        })}
        <rect x={280} y={24} width={100} height={78} rx={8} fill={`${color}30`} stroke={color} strokeWidth={2.5} />
        <text x={330} y={67} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={color}>Deploy gate</text>
        <line x1={380} y1={63} x2={418} y2={63} stroke={t.accentPrimary} strokeWidth={1.5} markerEnd="url(#ctg-arrow-active)" />
        <text x={426} y={66} fontSize={8.5} fill={t.accentPrimary} fontWeight={700}>ship</text>
      </svg>
    </VisualizationContainer>
  );
}
