import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PulseRect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TOKENS = ['[CLS]', 'The', 'bank', '[MASK]', 'money', '[SEP]'];
const MASK_INDEX = 3;

/** BERT's real input representation: three embeddings -- token identity,
 * which of the two sentences a token belongs to (segment), and its
 * position in the sequence -- summed element-wise into one vector per
 * token before anything else happens. [CLS] is prepended (its final
 * hidden state becomes the pooled classification representation); [SEP]
 * separates sentence pairs. The masked position is highlighted: its
 * summed embedding is what MLM has to predict from, using only
 * surrounding context -- the token's own identity is exactly the thing
 * hidden here. */
export default function BertInputRepresentationDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(TOKENS.length, 1200, MASK_INDEX);
  const tokenColor = getConceptColor(t, 'embedding');
  const segmentColor = getConceptColor(t, 'key');
  const positionColor = getConceptColor(t, 'value');
  const sumColor = getConceptColor(t, 'output');
  const maskColor = t.accentDanger;

  const colW = 80;
  const gap = 6;
  const startX = 10;
  const width = startX * 2 + TOKENS.length * colW + (TOKENS.length - 1) * gap;
  const height = 210;

  const rowH = 26;
  const rowGap = 4;
  const tokenY = 30;
  const segmentY = tokenY + rowH + rowGap;
  const positionY = segmentY + rowH + rowGap;
  const sumY = positionY + rowH + 26;

  return (
    <VisualizationContainer footer="Every token's final input embedding is the ELEMENT-WISE SUM of three separate embeddings, not a concatenation and not just the token's identity alone. The masked position (red) is predicted using only this summed representation at every OTHER position -- full context from both directions, never the hidden token's own identity.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <text x={startX} y={14} fontSize={DIAGRAM_TYPE.label.size} fontWeight={700} fill={t.textPrimary}>
          Input = Token Embedding + Segment Embedding + Position Embedding
        </text>

        {TOKENS.map((tok, i) => {
          const x = startX + i * (colW + gap);
          const isMasked = i === MASK_INDEX;
          return (
            <g key={i}>
              {i === cycle.value && <PulseRect x={x - 3} y={tokenY - 3} w={colW + 6} h={sumY + rowH + 6 - tokenY} color={isMasked ? maskColor : sumColor} dur={1.4} />}
              {isMasked && (
                <rect
                  x={x - 4}
                  y={tokenY - 4}
                  width={colW + 8}
                  height={sumY + rowH + 8 - tokenY}
                  rx={8}
                  fill="none"
                  stroke={maskColor}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )}
              <rect x={x} y={tokenY} width={colW} height={rowH} rx={4} fill={`${tokenColor}20`} stroke={tokenColor} strokeWidth={1.5} />
              <text x={x + colW / 2} y={tokenY + rowH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={tokenColor}>
                {tok}
              </text>

              <rect x={x} y={segmentY} width={colW} height={rowH} rx={4} fill={`${segmentColor}20`} stroke={segmentColor} strokeWidth={1.5} />
              <text x={x + colW / 2} y={segmentY + rowH / 2 + 4} textAnchor="middle" fontSize={9} fill={segmentColor}>
                Seg {i === 0 ? 'A' : 'A'}
              </text>

              <rect x={x} y={positionY} width={colW} height={rowH} rx={4} fill={`${positionColor}20`} stroke={positionColor} strokeWidth={1.5} />
              <text x={x + colW / 2} y={positionY + rowH / 2 + 4} textAnchor="middle" fontSize={9} fill={positionColor}>
                Pos {i}
              </text>

              <text x={x + colW / 2} y={positionY + rowH + 16} textAnchor="middle" fontSize={13} fill={t.textMuted}>
                +
              </text>

              <rect
                x={x}
                y={sumY}
                width={colW}
                height={rowH}
                rx={4}
                fill={isMasked ? `${maskColor}25` : `${sumColor}20`}
                stroke={isMasked ? maskColor : sumColor}
                strokeWidth={isMasked ? 2 : 1.5}
              />
              <text x={x + colW / 2} y={sumY + rowH / 2 + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={isMasked ? maskColor : sumColor}>
                {isMasked ? 'predict this' : 'sum'}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        [CLS] is prepended to every input (its final hidden state becomes the pooled classification vector); [SEP] separates sentence pairs for tasks like NSP.
      </div>
    </VisualizationContainer>
  );
}
