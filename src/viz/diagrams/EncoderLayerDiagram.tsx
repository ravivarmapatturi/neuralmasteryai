import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const BLOCKS = [
  { key: 'attn', label: 'Self-Attention', concept: 'attention' as const, desc: 'every token mixes information with every other token' },
  { key: 'norm1', label: 'Add & Norm', concept: 'output' as const, desc: 'residual connection, then LayerNorm' },
  { key: 'ffn', label: 'Feed Forward', concept: 'embedding' as const, desc: 'per-token non-linear transform, 512→2048→512' },
  { key: 'norm2', label: 'Add & Norm', concept: 'output' as const, desc: 'residual connection, then LayerNorm' },
];

/** One full encoder layer, assembled from every piece derived above --
 * then stacked N=6 times, each layer's output feeding the next layer's
 * input, weights independently learned per layer. */
export default function EncoderLayerDiagram() {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<number | null>(null);

  const boxW = 200;
  const boxH = 40;
  const gap = 14;
  const width = 340;
  const topPad = 20;
  const height = topPad + BLOCKS.length * (boxH + gap) - gap + 30;
  const cx = 100;

  return (
    <VisualizationContainer footer="Hover a sublayer to see what it does. Six of these layers stack, each with its own independently learned weights -- the input/output shape never changes, which is exactly what lets them stack.">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <text x={cx} y={16} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={t.textMuted}>input</text>
          {BLOCKS.map((b, i) => {
            const y = topPad + i * (boxH + gap);
            const color = getConceptColor(t, b.concept);
            const isHovered = hovered === i;
            return (
              <g key={b.key} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                <SketchArrow points={[[cx, i === 0 ? 22 : topPad + (i - 1) * (boxH + gap) + boxH], [cx, y]]} color={t.textMuted} strokeWidth={1.5} id={`enc-arrow-${i}`} />
                {/* Plain backing rect for the hover wash, SketchRect for the
                    hand-drawn border only -- no rough.js fillColor (see
                    LoopGraphAnatomyDiagram's comment on the text/hachure
                    legibility bug this avoids repeating). */}
                <rect x={cx - boxW / 2} y={y} width={boxW} height={boxH} rx={6} fill={isHovered ? `${color}30` : t.surfaceAlt} stroke="none" />
                <SketchRect x={cx - boxW / 2} y={y} width={boxW} height={boxH} color={color} strokeWidth={isHovered ? 2.5 : 1.5} id={`enc-box-${i}`} />
                <text x={cx} y={y + boxH / 2 + 4} textAnchor="middle" fontSize={12.5} fontWeight={700} fontFamily={HAND_FONT} fill={color}>{b.label}</text>
              </g>
            );
          })}
          <SketchArrow points={[[cx, topPad + (BLOCKS.length - 1) * (boxH + gap) + boxH], [cx, height - 8]]} color={t.textMuted} strokeWidth={1.5} id="enc-arrow-out" />
          <text x={cx} y={height - 2} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={t.textMuted}>output</text>

          <SketchPath
            d={`M ${cx + boxW / 2 + 20},${topPad} q 10,0 10,${(height - topPad - 30) / 2} q 0,${(height - topPad - 30) / 2} -10,${(height - topPad - 30)}`}
            color={t.border}
            strokeWidth={1.5}
            id="enc-loop-brace"
          />
          <text x={cx + boxW / 2 + 44} y={height / 2} textAnchor="middle" fontSize={16} fontWeight={700} fontFamily={HAND_FONT} fill={t.textSecondary}>×6</text>
        </svg>

        <div style={{ maxWidth: 220, paddingTop: 20 }}>
          <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: hovered !== null ? getConceptColor(t, BLOCKS[hovered].concept) : t.textMuted, marginBottom: 4 }}>
            {hovered !== null ? BLOCKS[hovered].label : 'Hover a sublayer'}
          </div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textSecondary }}>
            {hovered !== null ? BLOCKS[hovered].desc : 'Four sublayers, repeated 6 times with independent weights each.'}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
