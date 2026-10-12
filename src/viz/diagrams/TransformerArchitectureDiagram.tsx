import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchPath, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type BlockDef = { key: string; label: string; concept: 'attention' | 'output' | 'embedding' | 'query'; desc: string };

const ENCODER_BLOCKS: BlockDef[] = [
  { key: 'e-attn', label: 'Self-Attention', concept: 'attention', desc: 'every input token mixes with every other input token' },
  { key: 'e-norm1', label: 'Add & Norm', concept: 'output', desc: 'residual connection, then LayerNorm' },
  { key: 'e-ffn', label: 'Feed Forward', concept: 'embedding', desc: 'per-token non-linear transform' },
  { key: 'e-norm2', label: 'Add & Norm', concept: 'output', desc: 'residual connection, then LayerNorm' },
];

const DECODER_BLOCKS: BlockDef[] = [
  { key: 'd-mask', label: 'Masked Self-Attn', concept: 'attention', desc: "decoder tokens attend to themselves and earlier decoder tokens only -- can't see the future" },
  { key: 'd-norm1', label: 'Add & Norm', concept: 'output', desc: 'residual connection, then LayerNorm' },
  { key: 'd-cross', label: 'Cross-Attention', concept: 'query', desc: "decoder's Q attends to the encoder's K, V -- the one link between the two stacks" },
  { key: 'd-norm2', label: 'Add & Norm', concept: 'output', desc: 'residual connection, then LayerNorm' },
  { key: 'd-ffn', label: 'Feed Forward', concept: 'embedding', desc: 'per-token non-linear transform' },
  { key: 'd-norm3', label: 'Add & Norm', concept: 'output', desc: 'residual connection, then LayerNorm' },
];

/** Every block named once, top to bottom -- an encoder building a full-
 * context representation of the input, a decoder generating output one
 * token at a time conditioned on that representation via cross-attention.
 * Both stacks repeat N=6 times in the base model. */
export default function TransformerArchitectureDiagram() {
  const t = useVizTokens();
  const [hovered, setHovered] = useState<BlockDef | null>(null);

  const boxW = 150;
  const boxH = 30;
  const gap = 8;
  const encX = 130;
  const decX = 390;
  const topPad = 34;
  const crossAttnIndex = DECODER_BLOCKS.findIndex((b) => b.key === 'd-cross');

  function stackHeight(n: number) {
    return topPad + n * (boxH + gap) - gap + 30;
  }
  const height = Math.max(stackHeight(ENCODER_BLOCKS.length), stackHeight(DECODER_BLOCKS.length)) + 10;
  const width = 540;

  // Brackets sit on each stack's OUTER side (encoder: left, decoder: right)
  // so they never collide with the cross-attention wire running through the
  // middle gap between the two stacks.
  function Stack({ x, blocks, name, bracketSide }: { x: number; blocks: BlockDef[]; name: string; bracketSide: 'left' | 'right' }) {
    const sign = bracketSide === 'left' ? -1 : 1;
    const spanH = blocks.length * (boxH + gap) - gap;
    return (
      <>
        <text x={x} y={16} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={HAND_FONT} fill={t.textPrimary}>{name}</text>
        <text x={x} y={topPad - 6} textAnchor="middle" fontSize={9.5} fontFamily={HAND_FONT} fill={t.textMuted}>
          {name === 'ENCODER' ? 'input embedding + PE' : 'output embedding + PE'}
        </text>
        {blocks.map((b, i) => {
          const y = topPad + i * (boxH + gap);
          const color = getConceptColor(t, b.concept);
          const isHovered = hovered?.key === b.key;
          return (
            <g key={b.key} onMouseEnter={() => setHovered(b)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <SketchArrow points={[[x, i === 0 ? topPad - 2 : topPad + (i - 1) * (boxH + gap) + boxH], [x, y]]} color={t.textMuted} strokeWidth={1.2} arrowhead={false} id={`arch-edge-${b.key}`} />
              {/* Plain backing rect for the hover wash, SketchRect for the
                  hand-drawn border only -- same legibility fix as every
                  other diagram converted this session. */}
              {isHovered && <rect x={x - boxW / 2} y={y} width={boxW} height={boxH} rx={5} fill={`${color}30`} stroke="none" />}
              <SketchRect x={x - boxW / 2} y={y} width={boxW} height={boxH} color={color} strokeWidth={isHovered ? 2.5 : 1.25} id={`arch-box-${b.key}`} />
              <text x={x} y={y + boxH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily={HAND_FONT} fill={color}>{b.label}</text>
            </g>
          );
        })}
        <SketchArrow
          points={[[x, topPad + (blocks.length - 1) * (boxH + gap) + boxH], [x, topPad + (blocks.length - 1) * (boxH + gap) + boxH + 18]]}
          color={t.textMuted}
          strokeWidth={1.2}
          id={`arch-out-${name}`}
        />
        <text x={x} y={topPad + (blocks.length - 1) * (boxH + gap) + boxH + 30} textAnchor="middle" fontSize={9.5} fontFamily={HAND_FONT} fill={t.textMuted}>
          {name === 'ENCODER' ? 'encoder output' : 'to Linear + Softmax'}
        </text>
        <SketchPath
          d={`M ${x + sign * (boxW / 2 + 16)},${topPad} q ${sign * 8},0 ${sign * 8},${spanH / 2} q 0,${spanH / 2} ${-sign * 8},${spanH}`}
          color={t.border}
          strokeWidth={1.25}
          id={`arch-brace-${name}`}
        />
        <text x={x + sign * (boxW / 2 + 30)} y={topPad + spanH / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily={HAND_FONT} fill={t.textSecondary}>×6</text>
      </>
    );
  }

  const crossY = topPad + crossAttnIndex * (boxH + gap) + boxH / 2;
  const encOutY = topPad + (ENCODER_BLOCKS.length - 1) * (boxH + gap) + boxH;

  return (
    <VisualizationContainer footer="Hover any sublayer to see what it does. The one arrow crossing between the stacks is cross-attention -- the decoder's only window into the encoder's representation of the input.">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: width }}>
          <Stack x={encX} blocks={ENCODER_BLOCKS} name="ENCODER" bracketSide="left" />
          <Stack x={decX} blocks={DECODER_BLOCKS} name="DECODER" bracketSide="right" />

          {/* cross-attention wire: encoder output -> decoder's cross-attention
              block. Dasharray dropped -- a sketchy hand-drawn stroke already
              reads as organic/non-solid, same simplification used for every
              other previously-dashed connector converted this session. */}
          <g opacity={hovered === null || hovered.key === 'd-cross' ? 0.9 : 0.25}>
            <SketchPath
              d={`M ${encX + boxW / 2},${encOutY - 4} C ${(encX + decX) / 2},${encOutY - 4} ${(encX + decX) / 2},${crossY} ${decX - boxW / 2 - 4},${crossY}`}
              color={getConceptColor(t, 'query')}
              strokeWidth={hovered?.key === 'd-cross' ? 2.5 : 1.5}
              id="arch-cross-wire"
            />
          </g>
          <text x={(encX + decX) / 2} y={(encOutY + crossY) / 2 - 6} textAnchor="middle" fontSize={9.5} fontFamily={HAND_FONT} fill={getConceptColor(t, 'query')} opacity={hovered === null || hovered.key === 'd-cross' ? 1 : 0.3}>
            K, V
          </text>
        </svg>

        <div style={{ maxWidth: 200, paddingTop: 34 }}>
          <div style={{ fontSize: DIAGRAM_TYPE.label.size, fontWeight: 700, color: hovered ? getConceptColor(t, hovered.concept) : t.textMuted, marginBottom: 4 }}>
            {hovered ? hovered.label : 'Hover a sublayer'}
          </div>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textSecondary }}>
            {hovered ? hovered.desc : 'An encoder builds a full-context representation of the input; a decoder generates output one token at a time, conditioned on that representation.'}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
