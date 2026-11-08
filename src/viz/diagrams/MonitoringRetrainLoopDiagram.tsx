import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'serve', label: 'Serve (step 7)', desc: 'The model is live, making real predictions.' },
  { key: 'monitor', label: 'Monitor (step 9)', desc: 'Track live metrics vs. offline expectations -- watching for concept drift.' },
  { key: 'detect', label: 'Detect degradation', desc: 'Performance drops below an acceptable threshold, or drift crosses a set boundary.' },
  { key: 'retrain', label: 'Retrain (back to step 6)', desc: 'The loop closes -- new data, possibly a new model, re-evaluated offline before redeploying.' },
];

/** The framework isn't a straight line -- step 9 loops back to step 6.
 * Click a stage in the cycle for what happens there. */
export default function MonitoringRetrainLoopDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('detect');
  const color = getConceptColor(t, 'attention');
  const info = STAGES.find((s) => s.key === active)!;
  const width = 300;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  const r = 100;

  return (
    <VisualizationContainer footer={info.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: 320, margin: '0 auto' }}>
        <defs>
          <marker id="mrl-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>
        {STAGES.map((_, i) => {
          const a1 = (i / STAGES.length) * 2 * Math.PI - Math.PI / 2 + 0.46;
          const a2 = ((i + 1) / STAGES.length) * 2 * Math.PI - Math.PI / 2 - 0.46;
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2);
          const y2 = cy + r * Math.sin(a2);
          return (
            <path
              key={i}
              d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`}
              fill="none"
              stroke={color}
              strokeWidth={1.75}
              markerEnd="url(#mrl-arrow)"
            />
          );
        })}
        {STAGES.map((s, i) => {
          const angle = (i / STAGES.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          const isActive = active === s.key;
          return (
            <g key={s.key} onClick={() => setActive(s.key)} onMouseEnter={() => setActive(s.key)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={36} fill={isActive ? `${color}25` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={x} y={y - 2} textAnchor="middle" fontSize={8} fontWeight={isActive ? 700 : 500} fill={color}>{s.label.split(' (')[0]}</text>
              {s.label.includes('(') && <text x={x} y={y + 9} textAnchor="middle" fontSize={6.5} fill={t.textMuted}>({s.label.split('(')[1]}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        A live model is never "done" -- this loop is the step most interview answers skip, and the one real production systems live or die by.
      </div>
    </VisualizationContainer>
  );
}
