import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Strategy = 'fixed' | 'semantic' | 'recursive' | 'parent-child';

// A short document, pre-split into "natural" sentence/paragraph units so
// each strategy can be shown carving the SAME text differently.
const UNITS = [
  'RAG retrieves', 'relevant chunks', 'at query time.', // sentence 1
  'It embeds', 'the query', 'and searches', 'a vector DB.', // sentence 2
  'Retrieved text', 'grounds the', "model's answer.", // sentence 3
];
const PARAGRAPH_BREAK_AFTER = 6; // index after which a new "paragraph" starts

// group indices per strategy -> which unit-indices belong to which chunk
const GROUPS: Record<Strategy, number[][]> = {
  fixed: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]], // every 4 tokens, ignoring meaning
  semantic: [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9, 10]], // splits at sentence boundaries
  recursive: [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10]], // tries paragraph first, falls back
  'parent-child': [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], // one parent, children shown nested below
};

const CHILD_GROUPS = [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];

const DESCRIPTIONS: Record<Strategy, string> = {
  fixed: 'Splits every N tokens regardless of meaning -- simple, but can cut a sentence in half (see the boundary inside unit 4).',
  semantic: 'Splits at natural sentence/paragraph boundaries -- each chunk is a coherent unit of meaning.',
  recursive: 'Tries the largest boundary first (paragraph); only falls back to smaller boundaries if a chunk is still too big.',
  'parent-child': 'Retrieval matches against small, precise child chunks (bottom), but the larger parent chunk (top) is what actually gets passed to the LLM.',
};

/** The same source text, chunked 4 different ways -- click a strategy to
 * see exactly where its boundaries fall, including fixed-size's
 * mid-sentence cut that the other strategies avoid. */
export default function ChunkingStrategiesDiagram() {
  const t = useVizTokens();
  const [strategy, setStrategy] = useState<Strategy>('semantic');
  const chunkColor = getConceptColor(t, 'embedding');
  const width = 600;
  const unitW = (width - 20) / UNITS.length;

  const groups = GROUPS[strategy];
  const groupOf = (i: number) => groups.findIndex((g) => g.includes(i));

  return (
    <VisualizationContainer footer={DESCRIPTIONS[strategy]}>
      <PillSelect<Strategy>
        label="Chunking strategy"
        value={strategy}
        onChange={setStrategy}
        options={[
          { value: 'fixed', label: 'Fixed-size' },
          { value: 'semantic', label: 'Semantic' },
          { value: 'recursive', label: 'Recursive' },
          { value: 'parent-child', label: 'Parent-child' },
        ]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${strategy === 'parent-child' ? 130 : 80}`} style={{ display: 'block', marginTop: 8 }}>
        {UNITS.map((u, i) => {
          const g = groupOf(i);
          const hue = chunkColor;
          const x = 10 + i * unitW;
          const isBoundary = i === PARAGRAPH_BREAK_AFTER - 1;
          return (
            <g key={i}>
              {/* alternating opacity is real data (which group this unit
                  belongs to), kept as a plain backing rect; SketchRect adds
                  only the hand-drawn border, no fillColor -- same
                  legibility fix as every other diagram converted this
                  session. */}
              <rect x={x} y={10} width={unitW - 3} height={36} rx={4} fill={`${hue}${g % 2 === 0 ? '30' : '18'}`} stroke="none" />
              <SketchRect x={x} y={10} width={unitW - 3} height={36} color={hue} strokeWidth={1.25} roughness={1.2} id={`chunk-unit-${strategy}-${i}`} />
              <text x={x + (unitW - 3) / 2} y={31} textAnchor="middle" fontSize={7} fill={t.textSecondary}>{u}</text>
              {isBoundary && <line x1={x + unitW - 1} y1={4} x2={x + unitW - 1} y2={52} stroke={t.textMuted} strokeWidth={1} strokeDasharray="2 2" />}
            </g>
          );
        })}
        {strategy === 'fixed' && (
          <text x={10 + 3.5 * unitW} y={62} fontSize={8.5} fontFamily={HAND_FONT} fill={t.accentDanger}>↑ mid-sentence cut</text>
        )}
        {strategy === 'parent-child' && (
          <>
            <text x={10} y={70} fontSize={9.5} fontWeight={700} fontFamily={HAND_FONT} fill={t.textMuted}>children (retrieved against):</text>
            {UNITS.map((_, i) => {
              const g = CHILD_GROUPS.findIndex((grp) => grp.includes(i));
              const x = 10 + i * unitW;
              return (
                <g key={i}>
                  <rect x={x} y={78} width={unitW - 3} height={20} rx={3} fill={`${chunkColor}${g % 2 === 0 ? '30' : '18'}`} stroke="none" />
                  <SketchRect x={x} y={78} width={unitW - 3} height={20} color={chunkColor} strokeWidth={1} roughness={1.2} id={`chunk-child-${i}`} />
                </g>
              );
            })}
            <text x={10} y={116} fontSize={9.5} fontFamily={HAND_FONT} fill={t.textMuted}>↑ full row above = the one parent passed to the LLM on any child match</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {groups.length} chunk{groups.length !== 1 ? 's' : ''} from the same {UNITS.length}-unit document.
      </div>
    </VisualizationContainer>
  );
}
