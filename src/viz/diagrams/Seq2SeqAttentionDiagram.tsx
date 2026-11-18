import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor, valueColor } from './diagramSystem';

const INPUT = ['your', 'cat', 'is', 'lovely'];
const OUTPUT = ['votre', 'chat', 'est', 'adorable'];
// Illustrative, fixed weights per decoder step -- each output token
// plausibly attending most to its aligned input token. Not computed from
// a real model, same convention as CausalMaskAnimated's demo numbers.
const WEIGHTS = [
  [0.82, 0.08, 0.05, 0.05],
  [0.06, 0.85, 0.05, 0.04],
  [0.1, 0.1, 0.72, 0.08],
  [0.05, 0.05, 0.1, 0.8],
];

/** Instead of one fixed context vector, the decoder computes a FRESH
 * weighted combination of every encoder state at each output step --
 * click a decoder token to see which input tokens it actually leans on. */
export default function Seq2SeqAttentionDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(OUTPUT.length, 1800, 1);
  const decStep = cycle.value;
  const setDecStep = cycle.pick; // reader selection stops the automatic alignment trace
  const encColor = getConceptColor(t, 'embedding');
  const decColor = getConceptColor(t, 'attention');

  const width = 600;
  const height = 200;
  const encY = 40;
  const decY = 160;
  const cellR = 18;
  const encStep = (i: number) => 90 + i * 130;
  const decStep_ = (i: number) => 90 + i * 130;

  const weights = WEIGHTS[decStep];

  return (
    <VisualizationContainer footer="Click a decoder token -- the line thickness and color intensity are its real attention weight over each encoder state, recomputed fresh at every step instead of relying on one fixed summary.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <text x={20} y={encY - 20} fontSize={11} fontWeight={700} fill={encColor}>ENCODER STATES</text>
        <text x={20} y={decY + 34} fontSize={11} fontWeight={700} fill={decColor}>DECODER (click a token)</text>

        {INPUT.map((w, i) => (
          <g key={`enc-${i}`}>
            <circle cx={encStep(i)} cy={encY} r={cellR} fill={`${encColor}18`} stroke={encColor} strokeWidth={1.5} />
            <text x={encStep(i)} y={encY + 4} textAnchor="middle" fontSize={9} fill={encColor}>{w}</text>
          </g>
        ))}

        {INPUT.map((_, i) => {
          const wgt = weights[i];
          return (
            <line
              key={`wire-${i}`}
              x1={encStep(i)}
              y1={encY + cellR}
              x2={decStep_(decStep)}
              y2={decY - cellR}
              stroke={decColor}
              strokeWidth={1 + wgt * 8}
              opacity={0.25 + wgt * 0.7}
            />
          );
        })}

        {OUTPUT.map((w, i) => {
          const isSelected = i === decStep;
          return (
            <g key={`dec-${i}`} onClick={() => setDecStep(i)} style={{ cursor: 'pointer' }}>
              <circle cx={decStep_(i)} cy={decY} r={cellR} fill={isSelected ? `${decColor}30` : t.surfaceAlt} stroke={decColor} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={decStep_(i)} y={decY + 4} textAnchor="middle" fontSize={9} fontWeight={isSelected ? 700 : 400} fill={decColor}>{w}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
        {INPUT.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', width: 70 }}>
            <div style={{ height: 24, borderRadius: 4, background: valueColor(t, 'attention', weights[i]), border: `1px solid ${t.border}` }} />
            <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 2 }}>{w}</div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.textSecondary }}>{weights[i].toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        attention weights for decoding "{OUTPUT[decStep]}"
      </div>
    </VisualizationContainer>
  );
}
