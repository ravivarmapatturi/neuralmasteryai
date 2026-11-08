import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TOKENS = ['the', 'bank', 'by', 'the', 'river'];

/** Two independent RNNs over the same sequence -- one reading left-to-right,
 * one right-to-left -- concatenated at every position. Hover a position to
 * see why "bank" only resolves once both the past ("the") and the future
 * ("river") have reached it. */
export default function BidirectionalRnnDiagram() {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<number | null>(null);
  const fwdColor = getConceptColor(t, 'query');
  const bwdColor = getConceptColor(t, 'key');
  const outColor = getConceptColor(t, 'attention');

  const width = 560;
  const height = 220;
  const fwdY = 55;
  const bwdY = 110;
  const outY = 165;
  const tokenY = 205;
  const stepX = (i: number) => 60 + i * ((width - 100) / (TOKENS.length - 1));

  return (
    <VisualizationContainer footer="Hover a position -- its output depends on BOTH directions, which is exactly why BiRNN needs the whole sequence upfront and can't be used for streaming/left-to-right generation.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="birnn-fwd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={fwdColor} />
          </marker>
          <marker id="birnn-bwd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={bwdColor} />
          </marker>
          <marker id="birnn-down" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill={t.textMuted} />
          </marker>
        </defs>

        <text x={12} y={fwdY + 4} fontSize={10} fontFamily="monospace" fontWeight={700} fill={fwdColor}>→</text>
        <text x={12} y={bwdY + 4} fontSize={10} fontFamily="monospace" fontWeight={700} fill={bwdColor}>←</text>

        {/* Forward sequence arrows */}
        {TOKENS.map((_, i) => i > 0 && (
          <line
            key={`f${i}`}
            x1={stepX(i - 1) + 15}
            y1={fwdY}
            x2={stepX(i) - 15}
            y2={fwdY}
            stroke={fwdColor}
            strokeWidth={hovered === i || hovered === i - 1 ? 2.5 : 1.5}
            markerEnd="url(#birnn-fwd)"
            opacity={hovered === null || hovered === i || hovered === i - 1 ? 1 : 0.3}
          />
        ))}

        {/* Backward sequence arrows */}
        {TOKENS.map((_, i) => i < TOKENS.length - 1 && (
          <line
            key={`b${i}`}
            x1={stepX(i + 1) - 15}
            y1={bwdY}
            x2={stepX(i) + 15}
            y2={bwdY}
            stroke={bwdColor}
            strokeWidth={hovered === i || hovered === i + 1 ? 2.5 : 1.5}
            markerEnd="url(#birnn-bwd)"
            opacity={hovered === null || hovered === i || hovered === i + 1 ? 1 : 0.3}
          />
        ))}

        {TOKENS.map((w, i) => {
          const x = stepX(i);
          const isHovered = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {/* Forward hidden state node */}
              <circle cx={x} cy={fwdY} r={14} fill={t.surface} stroke="none" />
              <circle cx={x} cy={fwdY} r={14} fill={isHovered ? `${fwdColor}30` : t.surfaceAlt} stroke={fwdColor} strokeWidth={isHovered ? 2.5 : 1.5} />
              <text x={x} y={fwdY + 3.5} textAnchor="middle" fontSize={9} fontFamily="monospace" fontWeight={600} fill={fwdColor}>h→{i}</text>

              {/* Backward hidden state node */}
              <circle cx={x} cy={bwdY} r={14} fill={t.surface} stroke="none" />
              <circle cx={x} cy={bwdY} r={14} fill={isHovered ? `${bwdColor}30` : t.surfaceAlt} stroke={bwdColor} strokeWidth={isHovered ? 2.5 : 1.5} />
              <text x={x} y={bwdY + 3.5} textAnchor="middle" fontSize={9} fontFamily="monospace" fontWeight={600} fill={bwdColor}>h←{i}</text>

              {/* Curved connector from forward node bypassing backward node without crossing through it */}
              <path
                d={`M ${x - 10},${fwdY + 10} C ${x - 24},${(fwdY + bwdY) / 2} ${x - 24},${bwdY + 6} ${x - 8},${outY - 14}`}
                fill="none"
                stroke={t.textMuted}
                strokeWidth={1.2}
                markerEnd="url(#birnn-down)"
                opacity={isHovered ? 1 : 0.4}
              />

              {/* Direct vertical connector from backward node */}
              <line
                x1={x + 6}
                y1={bwdY + 14}
                x2={x + 6}
                y2={outY - 14}
                stroke={t.textMuted}
                strokeWidth={1.2}
                markerEnd="url(#birnn-down)"
                opacity={isHovered ? 1 : 0.4}
              />

              {/* Concatenated representation box */}
              <rect x={x - 24} y={outY - 12} width={48} height={22} rx={5} fill={isHovered ? `${outColor}30` : t.surfaceAlt} stroke={outColor} strokeWidth={isHovered ? 2.5 : 1.5} />
              <text x={x} y={outY + 3} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={outColor}>[h→,h←]</text>

              {/* Token link */}
              <line x1={x} y1={outY + 10} x2={x} y2={tokenY - 12} stroke={t.textMuted} strokeWidth={1} opacity={isHovered ? 1 : 0.4} />
              <text x={x} y={tokenY} textAnchor="middle" fontSize={11} fontWeight={isHovered ? 700 : 500} fill={isHovered ? outColor : t.textSecondary}>{w}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {hovered !== null
          ? `"${TOKENS[hovered]}" — resolved using ${hovered} word(s) of left context and ${TOKENS.length - 1 - hovered} word(s) of right context`
          : 'Two independent RNNs, concatenated per position -- forward and backward context, combined.'}
      </div>
    </VisualizationContainer>
  );
}
