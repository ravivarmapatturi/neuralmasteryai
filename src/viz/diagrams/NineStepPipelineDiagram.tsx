import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { n: 1, label: 'Problem formulation', desc: 'Translate a business need into an ML problem.' },
  { n: 2, label: 'Metrics', desc: 'Offline metrics (what you optimize in dev) vs. online metrics (what you measure in production, e.g. CTR, retention).' },
  { n: 3, label: 'Architecture', desc: 'Sketch the MVP: data → features → model → serving.' },
  { n: 4, label: 'Data', desc: 'Sourcing, labeling, cleaning.' },
  { n: 5, label: 'Features', desc: 'What signals actually predict the target.' },
  { n: 6, label: 'Model dev', desc: 'Pick a model class, validate offline.' },
  { n: 7, label: 'Serving', desc: 'Batch vs. online serving, latency budgets.' },
  { n: 8, label: 'Deployment', desc: 'A/B tests, shadow deployment, canary rollout.' },
  { n: 9, label: 'Scale & monitor', desc: 'Drift detection, retraining cadence, rollback plans.' },
];

/** The 9-step framework as one pipeline instead of 9 separate checklist
 * lines -- click a step for what it actually means before diving into the
 * full page. Steps 1-2 frame the problem, 3-6 build the model, 7-9 run it
 * in production -- that grouping is itself worth seeing at a glance. */
export default function NineStepPipelineDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const frameColor = getConceptColor(t, 'query');
  const buildColor = getConceptColor(t, 'embedding');
  const runColor = getConceptColor(t, 'attention');
  const colorFor = (n: number) => (n <= 2 ? frameColor : n <= 6 ? buildColor : runColor);

  const width = 620;
  const height = 110;
  const stepW = (width - 20) / STEPS.length;

  return (
    <VisualizationContainer footer={STEPS[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="nsp-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STEPS.map((s, i) => {
          const x = 10 + i * stepW;
          const cx = x + (stepW - 12) / 2;
          const prevCx = cx - stepW;
          const color = colorFor(s.n);
          const isActive = active === i;
          return (
            <g key={s.n} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
              {i > 0 && <line x1={prevCx + 16} y1={40} x2={cx - 21} y2={40} stroke={t.textMuted} strokeWidth={1} markerEnd="url(#nsp-arrow)" />}
              <circle cx={cx} cy={40} r={16} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={cx} y={44} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{s.n}</text>
              <text x={cx} y={70} textAnchor="middle" fontSize={8} fill={isActive ? color : t.textSecondary} fontWeight={isActive ? 700 : 400}>{s.label}</text>
            </g>
          );
        })}
        <text x={10} y={95} fontSize={8} fill={frameColor}>■ frame</text>
        <text x={70} y={95} fontSize={8} fill={buildColor}>■ build</text>
        <text x={125} y={95} fontSize={8} fill={runColor}>■ run</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Click a step. Full depth on each lives in <Link to="/docs/ml-system-design/the-9-step-framework" style={{ color: t.accentPrimary }}>the 9-Step Framework</Link>.
      </div>
    </VisualizationContainer>
  );
}
