import React, { useId, useMemo, useState } from 'react';
import { ReactFlow, Background, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVizTokens, RADIUS, FONT_FAMILY, type VizTokens } from '../theme/vizTokens';
import {
  VisualizationContainer,
  VisualizationHeader,
  Slider,
  PillSelect,
  StickyNote,
  StickyRow,
  VizButton,
  useVizVisible,
} from './primitives';
import { simulateRagPipeline } from './lib/rag';
import { PredictChallenge } from './diagrams/playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './diagrams/useStepPlayback';

const STAGE_INFO: Record<string, string> = {
  document: '8 short source passages covering ML fundamentals (linear regression, gradient descent, overfitting, trees, CNNs, attention, KV cache, RAG).',
  chunking: 'Splits documents into fixed word-count chunks with optional overlap. Too small breaks phrases apart; too large mixes unrelated ideas.',
  embeddings: 'Turns each chunk into a bag-of-words vector so word counts can be compared mathematically.',
  vectorstore: 'Stores all chunk vectors so the search step can rank every chunk against your question.',
  query: 'Turns your typed question into the same word-count vector space.',
  retrieval: 'Scores every chunk by cosine similarity and keeps only the top-k highest matches.',
  reranker: 'Optional second pass that rewards exact 2–3 word phrases in order over plain word overlap.',
  llm: 'Packs the surviving top-k chunks into the model prompt as grounded evidence.',
  answer: 'The final reply — it can only stay accurate when the right facts survived retrieval.',
};

const NODE_TO_STAGE: Record<string, number> = {
  document: 0,
  chunking: 0,
  embeddings: 1,
  vectorstore: 1,
  query: 1,
  retrieval: 2,
  reranker: 3,
  llm: 4,
  answer: 4,
};

const QUESTION_PRESETS = [
  { label: 'Gradient descent', text: 'how does gradient descent choose a learning rate?' },
  { label: 'KV cache', text: 'how does the KV cache avoid redundant computation?' },
  { label: 'No match (Paris)', text: 'what is the capital city of France?' },
] as const;

const CHUNK_SIZE_OPTIONS = [
  { value: 8, label: '8 words' },
  { value: 16, label: '16 words' },
  { value: 30, label: '30 words' },
];

const FORMULA_LATEX = {
  cosine: String.raw`\cos(q, c) = \frac{q \cdot c}{\|q\|\,\|c\|}`,
  rerank: String.raw`\text{score}(q, c) = \cos(q, c) + 0.15 \cdot b_{\text{phrase}}`,
};

const PREDICT_OPTIONS = [
  'More chunks are indexed, but splitting every 8 words fragments sentences and lowers match scores',
  'Fewer chunks are indexed and every chunk matches more words',
  'Chunk size only changes how long the LLM answer is, never what is retrieved',
] as const;

function buildFlow(
  t: VizTokens,
  rerankerOn: boolean,
  activeNodeIds: readonly string[],
  selectedNode: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const activeSet = new Set(activeNodeIds);
  const styleFor = (id: string, accent?: string): React.CSSProperties => {
    const isHot = activeSet.has(id) || selectedNode === id;
    const borderCol = isHot ? (accent ?? t.accentPrimary) : t.border;
    return {
      background: isHot ? `${borderCol}18` : t.surface,
      border: `${isHot ? 2.2 : 1.3}px solid ${borderCol}`,
      borderRadius: RADIUS.sm,
      color: t.textPrimary,
      fontFamily: FONT_FAMILY,
      fontSize: 15,
      fontWeight: isHot ? 700 : 500,
      padding: '6px 8px',
      width: 146,
      textAlign: 'center',
    };
  };

  const edgeStyle = { stroke: t.edge, strokeWidth: 1.6 };
  const nodes: Node[] = [
    { id: 'document', position: { x: 0, y: 10 }, data: { label: '1. Documents' }, style: styleFor('document') },
    { id: 'chunking', position: { x: 180, y: 10 }, data: { label: '2. Chunking' }, style: styleFor('chunking') },
    { id: 'embeddings', position: { x: 360, y: 10 }, data: { label: '3. Word vectors' }, style: styleFor('embeddings') },
    { id: 'vectorstore', position: { x: 540, y: 10 }, data: { label: '4. Vector index' }, style: styleFor('vectorstore', t.accentSecondary) },
    { id: 'query', position: { x: 0, y: 112 }, data: { label: '5. Your question' }, style: styleFor('query', t.accentPurple) },
    { id: 'retrieval', position: { x: 180, y: 112 }, data: { label: '6. Top-k search' }, style: styleFor('retrieval', t.accentSecondary) },
    {
      id: 'reranker',
      position: { x: 360, y: 112 },
      data: { label: rerankerOn ? '7. Reranker (on)' : '7. Reranker (off)' },
      style: { ...styleFor('reranker', t.accentWarn), opacity: rerankerOn ? 1 : 0.45 },
    },
    { id: 'llm', position: { x: 540, y: 112 }, data: { label: '8. LLM prompt' }, style: styleFor('llm', t.accentPrimary) },
    { id: 'answer', position: { x: 720, y: 112 }, data: { label: '9. Grounded reply' }, style: styleFor('answer', t.accentPrimary) },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'document', target: 'chunking', style: edgeStyle },
    { id: 'e2', source: 'chunking', target: 'embeddings', style: edgeStyle },
    { id: 'e3', source: 'embeddings', target: 'vectorstore', style: edgeStyle },
    { id: 'e4', source: 'vectorstore', target: 'retrieval', style: edgeStyle },
    { id: 'e5', source: 'query', target: 'retrieval', style: edgeStyle },
    { id: 'e6', source: 'retrieval', target: 'reranker', style: edgeStyle, animated: rerankerOn },
    { id: 'e7', source: 'reranker', target: 'llm', style: edgeStyle },
    { id: 'e8', source: 'llm', target: 'answer', style: edgeStyle, animated: true },
  ];
  return { nodes, edges };
}

function RagPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [query, setQuery] = useState('how does gradient descent choose a learning rate?');
  const [chunkSize, setChunkSize] = useState(16);
  const [overlap, setOverlap] = useState(2);
  const [topK, setTopK] = useState(3);
  const [rerankerOn, setRerankerOn] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeFormula, setActiveFormula] = useState<'cosine' | 'rerank'>('cosine');
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateRagPipeline({ query, chunkSize, overlap, topK, rerankerOn }),
    [query, chunkSize, overlap, topK, rerankerOn],
  );

  const playback = useStepPlayback(sim.stages.length, 2000, sim.stages.length - 1, outerVisible);
  const activeStage = sim.stages[playback.step] ?? sim.stages[sim.stages.length - 1];
  const { nodes, edges } = useMemo(
    () => buildFlow(t, rerankerOn, activeStage.activeNodeIds, selectedNode),
    [t, rerankerOn, activeStage.activeNodeIds, selectedNode],
  );

  const baseColor = t.accentSecondary;
  const bonusColor = t.accentWarn;
  const topColor = t.accentPrimary;
  const missColor = t.accentDanger;

  const top = sim.ranked[0];
  const activeNoteFormula: 'cosine' | 'rerank' =
    activeStage.id === 'rerank' && rerankerOn ? 'rerank' : activeFormula;

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    const stageIdx = NODE_TO_STAGE[nodeId];
    if (stageIdx !== undefined) playback.setStep(stageIdx);
  };

  const renderScoresPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 236;
    const maxScore = Math.max(0.5, ...sim.ranked.map((r) => r.finalScore));
    const barLeft = plotX + 136;
    const barMaxW = Math.max(80, plotW - 206);
    const showRerankPass = playback.step >= 3 && rerankerOn;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Top-{sim.topK} chunk scores ({showRerankPass ? 'cosine + phrase' : 'cosine only'})
        </text>
        <defs>
          <clipPath id={`${clipLeftId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipLeftId}-${offsetX})`}>
          {sim.ranked.length === 0 ? (
            <text x={plotX + plotW / 2} y={plotY + 115} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              Type a question to score chunks.
            </text>
          ) : (
            sim.ranked.map((r, idx) => {
              const rowY = plotY + 18 + idx * 42;
              const baseW = Math.max(2, (r.baseScore / maxScore) * barMaxW);
              const bonusW = showRerankPass ? (r.phraseBonus / maxScore) * barMaxW : 0;
              const shownScore = showRerankPass ? r.finalScore : r.baseScore;
              const isWinner = idx === 0 && shownScore > 0;
              return (
                <g key={r.id}>
                  <text
                    x={plotX + 10}
                    y={rowY + 17}
                    fontSize={14}
                    fontWeight={isWinner ? 700 : 500}
                    fill={isWinner ? topColor : t.textPrimary}
                  >
                    #{idx + 1} {r.topic.slice(0, 12)}
                  </text>
                  <rect x={barLeft} y={rowY + 4} width={barMaxW} height={18} rx={4} fill={t.surfaceAlt} />
                  <rect x={barLeft} y={rowY + 4} width={baseW} height={18} rx={4} fill={isWinner ? topColor : baseColor} fillOpacity={0.85} />
                  {bonusW > 0 && (
                    <rect x={barLeft + baseW} y={rowY + 4} width={bonusW} height={18} rx={2} fill={bonusColor} fillOpacity={0.9} />
                  )}
                  <text
                    x={plotX + plotW - 10}
                    y={rowY + 18}
                    textAnchor="end"
                    fontSize={14}
                    fontWeight={700}
                    fill={isWinner ? topColor : t.textSecondary}
                  >
                    {(shownScore * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })
          )}
        </g>
      </g>
    );
  };

  const renderCoveragePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 236;
    const retrievedIds = new Set(sim.ranked.map((r) => r.id));
    const shownChunks = sim.chunks.slice(0, 48);
    const cols = 8;
    const gap = 5;
    const cellW = Math.floor((plotW - 24 - (cols - 1) * gap) / cols);
    const cellH = 18;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Index ({sim.chunks.length} chunks) &amp; query hits
        </text>
        <defs>
          <clipPath id={`${clipRightId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRightId}-${offsetX})`}>
          {shownChunks.map((c, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = plotX + 12 + col * (cellW + gap);
            const y = plotY + 14 + row * (cellH + gap);
            const picked = retrievedIds.has(c.id);
            return (
              <rect
                key={c.id}
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx={3}
                fill={picked ? topColor : baseColor}
                fillOpacity={picked ? 0.9 : 0.22}
                stroke={picked ? topColor : t.border}
                strokeWidth={picked ? 1.5 : 0.8}
              />
            );
          })}

          <text x={plotX + 12} y={plotY + 178} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Query words found: {sim.matchedTerms.length}/{Math.max(1, sim.queryTerms.length)}
          </text>
          <text x={plotX + 12} y={plotY + 200} fontSize={14} fill={topColor}>
            Found: {sim.matchedTerms.slice(0, 4).join(', ') || 'none'}
          </text>
          <text x={plotX + 12} y={plotY + 222} fontSize={14} fill={sim.missedTerms.length > 0 ? missColor : t.textSecondary}>
            {sim.missedTerms.length > 0 ? `Missed: ${sim.missedTerms.slice(0, 4).join(', ')}` : 'All query keywords covered'}
          </text>
        </g>
      </g>
    );
  };

  const stepExplain = selectedNode
    ? `${selectedNode}: ${STAGE_INFO[selectedNode]}`
    : activeStage.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 280px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why chunking and ranking decide whether RAG gets the right answer"
                description="This solves the frozen-knowledge problem of an LLM: it slices documents into chunks, ranks them against your question, and hands only the surviving pieces to the model."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ flex: '1 1 240px', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>Question (type any ML question)</span>
              <input
                aria-label="RAG question"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedNode(null);
                  setPrediction(null);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 34,
                  padding: '4px 8px',
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignSelf: 'end' }}>
              {QUESTION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setQuery(p.text);
                    setSelectedNode(null);
                    setPrediction(null);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: RADIUS.sm,
                    border: `1px solid ${query === p.text ? t.accentPrimary : t.border}`,
                    background: query === p.text ? `${t.accentPrimary}18` : 'transparent',
                    color: query === p.text ? t.accentPrimary : t.textPrimary,
                    fontFamily: FONT_FAMILY,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <PillSelect<number>
              label="Chunk size (words per slice)"
              value={chunkSize}
              onChange={(v) => {
                const next = typeof v === 'function' ? v(chunkSize) : v;
                setChunkSize(next);
                setOverlap((o) => Math.min(o, next - 1));
                setPrediction(null);
              }}
              options={CHUNK_SIZE_OPTIONS}
            />
            <div style={{ minWidth: 145, flex: '1 1 145px' }}>
              <Slider
                label="Chunk overlap (shared boundary words)"
                value={overlap}
                onChange={(v) => {
                  setOverlap(v);
                  setPrediction(null);
                }}
                min={0}
                max={Math.min(8, chunkSize - 1)}
                step={1}
                format={(v) => `${v} w`}
              />
            </div>
            <div style={{ minWidth: 135, flex: '1 1 135px' }}>
              <Slider
                label="Top-k (chunks kept)"
                value={topK}
                onChange={setTopK}
                min={1}
                max={5}
                step={1}
              />
            </div>
            <PillSelect<string>
              label="Reranker (phrase pass)"
              value={rerankerOn ? 'on' : 'off'}
              onChange={(v) => {
                const val = typeof v === 'function' ? v(rerankerOn ? 'on' : 'off') : v;
                setRerankerOn(val === 'on');
              }}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>

          <div style={{ fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
            <strong style={{ color: t.textPrimary }}>{sim.chunks.length} chunks indexed</strong> · showing top{' '}
            <strong style={{ color: topColor }}>{sim.ranked.length}</strong> · Stage:{' '}
            <strong style={{ color: baseColor }}>{activeStage.title}</strong>
          </div>

          {/* Clickable ReactFlow pipeline map (borderless, fits cleanly on desktop and 375px phone) */}
          <div style={{ width: '100%', height: 220, overflow: 'hidden' }} aria-label="Interactive RAG pipeline nodes (click any stage)">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, node) => handleNodeClick(node.id)}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
            >
              <Background color={t.border} gap={18} />
            </ReactFlow>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 15 }} aria-label="RAG score colours">
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: topColor, verticalAlign: 'middle', marginRight: 6 }} />Top match / kept in prompt</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: baseColor, verticalAlign: 'middle', marginRight: 6 }} />Cosine word overlap</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: bonusColor, verticalAlign: 'middle', marginRight: 6 }} />Reranker phrase bonus</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: missColor, verticalAlign: 'middle', marginRight: 6 }} />Missing query keyword</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`RAG retrieval results: ${sim.chunks.length} chunks indexed, top match ${sim.topTopic}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderScoresPanel(0, 412)}
            {renderCoveragePanel(420, 340)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Top chunk scores" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderScoresPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Indexed chunks and keyword hits" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCoveragePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Cosine retrieval" latex={FORMULA_LATEX.cosine} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {sim.chunks.length} chunks · #1 {sim.topTopic} = <strong>{top ? `${(top.finalScore * 100).toFixed(1)}%` : '0%'}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.stages.length}`} color="blue" tilt={1} live>
            <p>{activeStage.summary}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Fast cosine retrieval"
              latex={FORMULA_LATEX.cosine}
              color="yellow"
              tilt={-1}
              active={activeNoteFormula === 'cosine'}
              onSelect={() => {
                setActiveFormula('cosine');
                playback.setStep(2);
              }}
            >
              <p style={{ textAlign: 'center' }}>q = question word counts, c = chunk word counts, ||q|| = vector length. Higher means more shared words.</p>
            </StickyNote>
            <StickyNote
              title="2. Reranker phrase pass"
              latex={FORMULA_LATEX.rerank}
              color="pink"
              tilt={1}
              active={activeNoteFormula === 'rerank'}
              onSelect={() => {
                setActiveFormula('rerank');
                setRerankerOn(true);
                playback.setStep(3);
              }}
            >
              <p style={{ textAlign: 'center' }}>b<sub>phrase</sub> counts exact 2–3 word matches in order inside the chunk.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · top chunk #${top?.id ?? '—'}`} color="green" tilt={1}>
              {top ? (
                <>
                  <p className="nm-sticky__mono">
                    q·c = <strong>{top.dot}</strong>, |q| = {top.queryNorm.toFixed(2)}, |c| = {top.chunkNorm.toFixed(2)} → cos = <strong>{(top.baseScore * 100).toFixed(1)}%</strong>
                  </p>
                  <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                    Rerank bonus = +{(top.phraseBonus * 100).toFixed(1)}% → Final = <strong>{(top.finalScore * 100).toFixed(1)}%</strong> ({top.topic})
                  </p>
                </>
              ) : (
                <p>No matching chunks found.</p>
              )}
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.stages.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{stepExplain}</p>
              {top && (
                <p style={{ marginTop: 4, color: t.textSecondary }}>
                  Top text: “{top.text.slice(0, 96)}{top.text.length > 96 ? '…' : ''}”
                </p>
              )}
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="For the question 'gradient descent', if you shrink chunk size from 30 words to 8 words with 0 overlap, what happens?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At 8 words with 0 overlap, the index jumps to 40 tiny slices, splitting 'gradient descent updates parameters...' from 'learning rate' across separate chunks."
            actionLabel="Test 8-word chunks, 0 overlap now"
            onAction={() => {
              setQuery('how does gradient descent choose a learning rate?');
              setChunkSize(8);
              setOverlap(0);
              setTopK(3);
              setRerankerOn(true);
              setSelectedNode(null);
              playback.setStep(4);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function RagPipelineSimulator({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="RAG Pipeline simulator playground"
      footer="Exact word-count chunking, bag-of-words cosine similarity, and phrase-bonus reranking computed live over 8 short ML passages (substituting for neural embeddings so every score can be inspected by hand)."
    >
      <RagPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
