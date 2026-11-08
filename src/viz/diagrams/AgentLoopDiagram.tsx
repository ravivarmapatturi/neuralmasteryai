import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STEPS = [
  { stage: 'Model decides', detail: 'Given the input + history so far, decide: call a tool, or answer now?' },
  { stage: 'Call tool', detail: 'Emit a structured request — function name + arguments — instead of a plain text answer.' },
  { stage: 'Observe result', detail: 'The calling application executes the function and feeds the result back into context.' },
  { stage: 'Model decides', detail: 'With the new result in context: call another tool, or is this enough to answer?' },
  { stage: 'Final answer', detail: 'Enough information has accumulated in context — produce the final answer and stop.' },
];

/** Step through the actual agent loop one decision at a time -- the same
 * "decide, act, observe" cycle repeats until the model itself decides it
 * has enough to answer, which is exactly what separates it from a single
 * LLM call. */
export default function AgentLoopDiagram() {
  const t = useVizTokens();
  const [step, setStep] = useState(0);
  const color = getConceptColor(t, 'attention');
  const width = 520;
  const height = 210;
  const cx = 180;
  const cy = 105;
  const r = 65;
  const nodeRadius = 30;

  // 4 positions around the loop
  const loopPositions = [
    { x: cx, y: cy - r },        // Top: Model decides
    { x: cx + r, y: cy },        // Right: Call tool
    { x: cx, y: cy + r },        // Bottom: Observe result
    { x: cx - r, y: cy },        // Left: Model decides (iteration 2)
  ];
  const finalPos = { x: cx + r + 130, y: cy };

  return (
    <VisualizationContainer footer={STEPS[step].detail}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="loop-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={color} />
          </marker>
          <marker id="loop-arrow-muted" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={t.border} />
          </marker>
        </defs>

        {/* Connecting lines between loop nodes - trimmed to circle boundaries so they never cross text */}
        {loopPositions.map((pos1, i) => {
          const pos2 = loopPositions[(i + 1) % 4];
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.hypot(dx, dy);
          const ux = dx / dist;
          const uy = dy / dist;
          const x1 = pos1.x + ux * nodeRadius;
          const y1 = pos1.y + uy * nodeRadius;
          const x2 = pos2.x - ux * (nodeRadius + 6);
          const y2 = pos2.y - uy * (nodeRadius + 6);
          const isActive = step === i;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? color : t.border}
              strokeWidth={isActive ? 2 : 1.5}
              markerEnd={isActive ? 'url(#loop-arrow)' : 'url(#loop-arrow-muted)'}
              opacity={isActive ? 1 : 0.6}
            />
          );
        })}

        {/* Branch arrow to Final Answer from loop (from step 3 / left or right) */}
        {(() => {
          const fromPos = loopPositions[1]; // from right or top
          const x1 = fromPos.x + nodeRadius;
          const y1 = fromPos.y;
          const x2 = finalPos.x - nodeRadius - 6;
          const y2 = finalPos.y;
          const isBranchActive = step === 3 || step === 4;
          return (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isBranchActive ? color : t.border}
              strokeWidth={isBranchActive ? 2 : 1.5}
              strokeDasharray={step < 4 ? '4 3' : undefined}
              markerEnd={isBranchActive ? 'url(#loop-arrow)' : 'url(#loop-arrow-muted)'}
              opacity={isBranchActive ? 1 : 0.4}
            />
          );
        })()}

        {/* Render nodes */}
        {STEPS.map((s, i) => {
          const isFinal = i === 4;
          const pos = isFinal ? finalPos : loopPositions[i];
          const isActive = step === i;

          return (
            <g key={i} onClick={() => setStep(i)} style={{ cursor: 'pointer' }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={t.surface}
                stroke="none"
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={isActive ? `${color}25` : t.surfaceAlt}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive || isFinal ? 1 : 0.7}
              />
              <text
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={isActive ? 700 : 500}
                fill={isActive ? color : t.textSecondary}
              >
                {s.stage}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <VizButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← prev</VizButton>
        <VizButton onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>next →</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 6 }}>
        Step {step + 1} of {STEPS.length}: {STEPS[step].stage}
      </div>
    </VisualizationContainer>
  );
}
