import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, line, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const MESSAGES = [
  { from: 'A', to: 'B', label: 'submit task: "process this invoice"' },
  { from: 'B', to: 'A', label: 'status: working' },
  { from: 'B', to: 'A', label: 'status: input-required -- "which PO does this match?"' },
  { from: 'A', to: 'B', label: 'clarification: "PO-4471"' },
  { from: 'B', to: 'A', label: 'status: working' },
  { from: 'B', to: 'A', label: 'status: completed -- result attached' },
];

/** What task delegation actually looks like on the wire -- a sequence of
 * messages over time, not one blocking call. Step through it. */
export default function DelegationSequenceDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(MESSAGES.length, 2400, 2);
  const step = cyc.value;
  const setStep = cyc.pick;
  const colorA = getConceptColor(t, 'query');
  const colorB = getConceptColor(t, 'key');

  const width = 480;
  const rowH = 30;
  const height = 30 + MESSAGES.length * rowH + 10;
  const ax = 70;
  const bx = width - 70;

  const activeMsg = MESSAGES[step];
  const activeFromX = activeMsg.from === 'A' ? ax : bx;
  const activeToX = activeMsg.from === 'A' ? bx : ax;
  const activeY = 30 + step * rowH + 15;
  const activeColor = activeMsg.from === 'A' ? colorA : colorB;

  return (
    <VisualizationContainer footer={MESSAGES[step].label}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="ds-arrow-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={colorA} />
          </marker>
          <marker id="ds-arrow-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={colorB} />
          </marker>
        </defs>
        <text x={ax} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={colorA}>Agent A</text>
        <text x={bx} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={colorB}>Agent B</text>
        <line x1={ax} y1={24} x2={ax} y2={height - 6} stroke={t.border} strokeWidth={1} />
        <line x1={bx} y1={24} x2={bx} y2={height - 6} stroke={t.border} strokeWidth={1} />
        {MESSAGES.map((m, i) => {
          const y = 30 + i * rowH + 15;
          const fromX = m.from === 'A' ? ax : bx;
          const toX = m.from === 'A' ? bx : ax;
          const color = m.from === 'A' ? colorA : colorB;
          const isActive = step === i;
          return (
            <g key={i} onClick={() => setStep(i)} onMouseEnter={() => setStep(i)} style={{ cursor: 'pointer' }} opacity={step === i ? 1 : 0.4}>
              <line x1={fromX} y1={y} x2={toX} y2={y} stroke={color} strokeWidth={isActive ? 2.5 : 1.25} markerEnd={`url(#ds-arrow-${m.from === 'A' ? 'a' : 'b'})`} />
              <rect x={Math.min(fromX, toX) + 10} y={y - 12} width={Math.abs(toX - fromX) - 20} height={16} fill={t.surface} />
              <text x={(fromX + toX) / 2} y={y - 3} textAnchor="middle" fontSize={8} fill={color}>{m.label.length > 34 ? m.label.slice(0, 34) + '…' : m.label}</text>
            </g>
          );
        })}
        <FlowDots key={step} d={line(activeFromX, activeY, activeToX, activeY)} color={activeColor} dur={1.6} count={1} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6 }}>
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, cursor: step === 0 ? 'default' : 'pointer' }}>← prev</button>
        <button type="button" onClick={() => setStep(Math.min(MESSAGES.length - 1, step + 1))} disabled={step === MESSAGES.length - 1} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, cursor: step === MESSAGES.length - 1 ? 'default' : 'pointer' }}>next →</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Step {step + 1} of {MESSAGES.length}.
      </div>
    </VisualizationContainer>
  );
}
