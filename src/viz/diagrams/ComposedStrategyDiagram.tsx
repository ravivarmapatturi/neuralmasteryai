import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { FlowDots, line } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { label: 'Shadow', desc: 'A genuinely new model architecture, tested against real traffic first -- zero user risk, technical validation only.' },
  { label: 'Canary', desc: 'Once shadow metrics look good, roll it out gradually -- confirming it\'s safe at increasing real scale.' },
  { label: 'A/B Test', desc: 'Layer this on top if the real open question is business impact, not just technical correctness.' },
];

/** In practice these aren't alternatives, they're a sequence -- click a
 * stage in the actual real-world composition. */
export default function ComposedStrategyDiagram() {
  const t = useVizTokens();
  const { value: active, pick } = useAutoCycle(STAGES.length, 3200, 1);
  const color = getConceptColor(t, 'attention');
  const width = 480;
  const y = 40;

  return (
    <VisualizationContainer footer={STAGES[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} 70`} style={{ display: 'block' }}>
        <defs>
          <marker id="comp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 70 + i * 170;
          const isActive = active === i;
          const prevX = 70 + (i - 1) * 170 + 55;
          const currLeft = x - 55;
          return (
            <g key={s.label}>
              {i > 0 && (
                <>
                  <line x1={prevX} y1={y} x2={currLeft} y2={y} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#comp-arrow)" />
                  {active === i && (
                    <FlowDots d={line(prevX, y, currLeft, y)} color={color} dur={1.2} count={3} r={2.5} />
                  )}
                </>
              )}
              <g onClick={() => pick(i)} onMouseEnter={() => pick(i)} style={{ cursor: 'pointer' }}>
                <rect x={x - 55} y={y - 18} width={110} height={36} rx={8} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={isActive ? 700 : 500} fill={color}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Not a choice between strategies -- a real rollout typically composes several of them in sequence.
      </div>
    </VisualizationContainer>
  );
}
