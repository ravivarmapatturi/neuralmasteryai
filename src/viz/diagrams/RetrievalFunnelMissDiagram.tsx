import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** The funnel: corpus -> top-100 retrieved -> top-10 reranked. One
 * genuinely relevant document sits outside the top-100 the retriever
 * chose -- reranking never even sees it, no matter how good the reranker
 * is. Static (no interactivity needed to make the point). */
export default function RetrievalFunnelMissDiagram() {
  const t = useVizTokens();
  const biColor = getConceptColor(t, 'query');
  const crossColor = getConceptColor(t, 'attention');
  const missColor = t.accentDanger;

  const width = 640;
  const height = 220;

  return (
    <VisualizationContainer footer="The relevant document (red) never entered the retrieved top-100 -- it sits in the corpus, undiscovered. The cross-encoder reranker only ever sees the 100 documents handed to it; it cannot rerank a document it was never given. No amount of reranking accuracy recovers a document retrieval already dropped.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="funnel-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>

        {/* Corpus: scattered dots, one red */}
        <text x={20} y={16} fontSize={11} fontWeight={700} fill={t.textPrimary}>Corpus (millions)</text>
        {Array.from({ length: 24 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const isRelevant = i === 19; // the missed relevant doc, placed outside where the funnel narrows
          return (
            <circle
              key={i}
              cx={26 + col * 16}
              cy={34 + row * 16}
              r={4}
              fill={isRelevant ? missColor : `${biColor}80`}
              stroke={isRelevant ? missColor : 'none'}
              strokeWidth={isRelevant ? 2 : 0}
            />
          );
        })}
        <text x={20} y={110} fontSize={8.5} fill={missColor}>● = the genuinely relevant document</text>

        {/* Funnel stage 1: bi-encoder retrieval -> top 100 (misses the red dot) */}
        <line x1={140} y1={70} x2={210} y2={70} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#funnel-arrow)" />
        <text x={175} y={62} textAnchor="middle" fontSize={8} fill={t.textMuted}>bi-encoder</text>
        <rect x={215} y={20} width={110} height={100} rx={8} fill={`${biColor}12`} stroke={biColor} strokeWidth={1.5} />
        <text x={270} y={14} textAnchor="middle" fontSize={10} fontWeight={700} fill={biColor}>top-100</text>
        {Array.from({ length: 16 }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return <circle key={i} cx={230 + col * 24} cy={40 + row * 22} r={4} fill={`${biColor}90`} />;
        })}
        <text x={270} y={136} textAnchor="middle" fontSize={8} fill={missColor}>relevant doc not retrieved --</text>
        <text x={270} y={148} textAnchor="middle" fontSize={8} fill={missColor}>excluded before reranking starts</text>

        {/* Funnel stage 2: cross-encoder rerank -> top 10 */}
        <line x1={330} y1={70} x2={400} y2={70} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#funnel-arrow)" />
        <text x={365} y={62} textAnchor="middle" fontSize={8} fill={t.textMuted}>cross-encoder</text>
        <rect x={405} y={35} width={90} height={70} rx={8} fill={`${crossColor}18`} stroke={crossColor} strokeWidth={1.5} />
        <text x={450} y={29} textAnchor="middle" fontSize={10} fontWeight={700} fill={crossColor}>top-10</text>
        {Array.from({ length: 8 }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return <circle key={i} cx={420 + col * 20} cy={55 + row * 25} r={4} fill={`${crossColor}c0`} />;
        })}

        {/* Final arrow to "generation" */}
        <line x1={500} y1={70} x2={555} y2={70} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#funnel-arrow)" />
        <text x={560} y={74} fontSize={9} fill={t.textMuted}>to LLM</text>
      </svg>
    </VisualizationContainer>
  );
}
