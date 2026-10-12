import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const N_HEADS = 8;

/** d_model=512 is projected once to Q/K/V, then split along the feature
 * dimension into 8 equal 64-wide chunks -- not 8 separate small
 * projections. Each head runs the identical Attention() primitive
 * independently, and the 8 outputs concatenate back to 512 before one
 * more projection through W^O mixes information across heads. */
export default function MultiHeadAttentionDiagram() {
  const t = useVizTokens();
  const [activeHead, setActiveHead] = useState<number | null>(null);

  const width = 620;
  const height = 260;
  const qkvColor = getConceptColor(t, 'embedding');
  const attnColor = getConceptColor(t, 'attention');

  const splitX = 130;
  const headX = 300;
  const concatX = 470;
  const outX = 570;
  const headGap = 22;
  const headH = (height - 40 - (N_HEADS - 1) * 3) / N_HEADS;
  const headY = (i: number) => 20 + i * (headH + 3);

  return (
    <VisualizationContainer footer="One full-width projection, split into 8 equal slices -- mathematically identical to 8 separate small projections, but one efficient batched matmul instead of 8 loops. Hover a head to trace it through the split.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {/* full Q/K/V block -- plain backing rect for the wash, SketchRect
            for the hand-drawn border only (same legibility fix as every
            other diagram converted this session). */}
        <rect x={20} y={height / 2 - 40} width={80} height={80} rx={8} fill={`${qkvColor}22`} stroke="none" />
        <SketchRect x={20} y={height / 2 - 40} width={80} height={80} color={qkvColor} strokeWidth={2} id="mha-qkv" />
        <text x={60} y={height / 2 - 6} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="monospace" fill={qkvColor}>Q,K,V</text>
        <text x={60} y={height / 2 + 12} textAnchor="middle" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted}>512-wide</text>

        {Array.from({ length: N_HEADS }, (_, i) => {
          const isActive = activeHead === i;
          const dim = activeHead === null || isActive ? 1 : 0.25;
          const y = headY(i);
          return (
            <g key={i} onMouseEnter={() => setActiveHead(i)} onMouseLeave={() => setActiveHead(null)} style={{ cursor: 'pointer' }} opacity={dim}>
              {/* split connector */}
              <SketchPath d={`M 100,${height / 2} C ${splitX},${height / 2} ${splitX},${y + headH / 2} ${headX - 4},${y + headH / 2}`} color={qkvColor} strokeWidth={isActive ? 2 : 1} roughness={1.3} id={`mha-connector-${i}`} />
              {/* head chunk */}
              <rect x={splitX + 30} y={y} width={40} height={headH} rx={3} fill={`${qkvColor}22`} stroke="none" />
              <SketchRect x={splitX + 30} y={y} width={40} height={headH} color={qkvColor} strokeWidth={isActive ? 2 : 1} roughness={1.2} id={`mha-chunk-${i}`} />
              {/* attention box */}
              {isActive && <rect x={headX} y={y} width={90} height={headH} rx={4} fill={`${attnColor}30`} stroke="none" />}
              <SketchRect x={headX} y={y} width={90} height={headH} color={attnColor} strokeWidth={isActive ? 2 : 1} roughness={1.2} id={`mha-head-${i}`} />
              <text x={headX + 45} y={y + headH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fontFamily="monospace" fill={isActive ? attnColor : t.textSecondary}>
                head {i + 1}
              </text>
              {/* to concat */}
              <SketchArrow points={[[headX + 90, y + headH / 2], [concatX - 4, y + headH / 2]]} color={attnColor} strokeWidth={isActive ? 2 : 1} arrowhead={false} roughness={1.3} id={`mha-toconcat-${i}`} />
            </g>
          );
        })}

        {/* concat bar */}
        <SketchRect x={concatX} y={16} width={16} height={height - 32} color={t.border} strokeWidth={1.5} id="mha-concat" />
        <text x={concatX + 8} y={height / 2} textAnchor="middle" fontSize={10.5} fontFamily={HAND_FONT} fill={t.textMuted} transform={`rotate(-90 ${concatX + 8} ${height / 2})`}>concat</text>

        {/* W^O */}
        <SketchArrow points={[[concatX + 16, height / 2], [outX - 40, height / 2]]} color={t.textSecondary} strokeWidth={2} id="mha-to-wo" />
        <SketchRect x={outX - 40} y={height / 2 - 20} width={70} height={40} color={t.textSecondary} strokeWidth={1.5} id="mha-wo" />
        <text x={outX - 5} y={height / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="monospace" fill={t.textSecondary}>W^O</text>
      </svg>

      <div style={{ display: 'flex', gap: headGap, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: N_HEADS }, (_, i) => (
          <div key={i} onMouseEnter={() => setActiveHead(i)} onMouseLeave={() => setActiveHead(null)} style={{ cursor: 'pointer', fontSize: DIAGRAM_TYPE.caption.size, color: activeHead === i ? attnColor : t.textMuted, fontWeight: activeHead === i ? 700 : 400 }}>
            h{i + 1}: dims {i * 64}–{i * 64 + 63}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <VisualizationMath latex="\text{MultiHead}(Q,K,V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_8)\,W^O" />
      </div>
    </VisualizationContainer>
  );
}
