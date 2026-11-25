import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import { PillSelect, VisualizationContainer, useVizVisible } from '../primitives';
import {
  TFIDF_STAGES,
  TOY_TFIDF_DOCS,
  explainTfidfStep,
  formatTfidfFormula,
  runTfidfSearch,
  tokenizeText,
  type TfidfStage,
  type TfidfVariant,
  type ToyDocument,
} from '../lib/tfidf';
import {
  FormulaStrip,
  PlaygroundHeaderBar,
  PredictChallenge,
  StepCaptionStrip,
} from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PRESET_QUERIES: { label: string; query: string }[] = [
  { label: 'machine learning', query: 'machine learning' },
  { label: 'deep learning', query: 'deep learning' },
  { label: 'cooking food', query: 'cooking food' },
  { label: 'machine search', query: 'machine search' },
];

const VARIANT_OPTIONS: { value: TfidfVariant; label: string }[] = [
  { value: 'classic', label: 'Classic TF×IDF' },
  { value: 'cosine', label: 'Cosine TF-IDF' },
  { value: 'raw-count', label: 'Raw count' },
];

const PREDICT_OPTIONS = [
  'D2 wins (says "learning" 2/7 = 0.286)',
  'D1 and D3 still tie at the top',
  'All three tie equally',
] as const;

function shortText(text: string, maxLen = 28): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function TfidfSearchPlayground({ outerVisible }: { outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(700);
  const [queryText, setQueryText] = useState('machine learning');
  const [docs, setDocs] = useState<ToyDocument[]>(() => TOY_TFIDF_DOCS.map((d) => ({ ...d, tokens: [...d.tokens] })));
  const [variant, setVariant] = useState<TfidfVariant>('classic');
  const [inspectedDocId, setInspectedDocId] = useState('D1');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(TFIDF_STAGES.length, 2100, 3, outerVisible);
  const stage = playback.step as TfidfStage;

  const { queryTerms, queryStats, results } = useMemo(
    () => runTfidfSearch(queryText, docs, variant),
    [queryText, docs, variant],
  );

  const activeDoc = results.find((r) => r.docId === inspectedDocId) ?? results[0];
  const maxScore = Math.max(0.001, ...results.map((r) => r.activeScore));
  const isTopTied =
    results.length >= 2 &&
    results[0].activeScore > 0 &&
    Math.abs(results[0].activeScore - results[1].activeScore) < 1e-4;

  const isDefaultCorpus = docs.every((d, i) => d.text === TOY_TFIDF_DOCS[i].text);

  const updateDocText = (docId: string, nextText: string) => {
    playback.stop();
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, text: nextText, tokens: tokenizeText(nextText) } : d)),
    );
  };

  const resetCorpus = () => {
    playback.stop();
    setDocs(TOY_TFIDF_DOCS.map((d) => ({ ...d, tokens: [...d.tokens] })));
  };

  const caption = explainTfidfStep(stage, activeDoc, queryStats, variant, docs.length);
  const formula = formatTfidfFormula(stage, activeDoc, queryStats, variant);
  const formatScore = (val: number) => (variant === 'raw-count' ? String(Math.round(val)) : val.toFixed(4));

  const renderBarsSvg = (offsetX: number, panelW: number) => {
    const barStart = offsetX + 70;
    const maxBarW = Math.max(70, panelW - 196);
    const axisY = 196;

    return (
      <g>
        <text x={offsetX + 4} y={16} fontSize={14.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Ranked documents (higher = better)
        </text>
        <circle cx={offsetX + 10} cy={34} r={5} fill={t.accentPrimary} />
        <text x={offsetX + 19} y={39} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Selected
        </text>
        <circle cx={offsetX + 94} cy={34} r={5} fill={t.accentSecondary} />
        <text x={offsetX + 103} y={39} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Match
        </text>
        <circle cx={offsetX + 162} cy={34} r={5} fill={t.textMuted} />
        <text x={offsetX + 171} y={39} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          No match
        </text>

        <text x={offsetX + 4} y={59} fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Doc (words) ↓
        </text>

        {results.map((doc, idx) => {
          const y = 70 + idx * 30;
          const isSelected = doc.docId === activeDoc?.docId;
          const barColor = doc.activeScore <= 0 ? t.textMuted : isSelected ? t.accentPrimary : t.accentSecondary;
          const barW = doc.activeScore > 0 ? Math.max(6, (doc.activeScore / maxScore) * maxBarW) : 2;
          return (
            <g
              key={doc.docId}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                playback.stop();
                setInspectedDocId(doc.docId);
              }}
            >
              <text
                x={barStart - 8}
                y={y + 17}
                textAnchor="end"
                fontSize={14}
                fontWeight={isSelected ? 700 : 500}
                fontFamily={FONT_FAMILY}
                fill={isSelected ? t.accentPrimary : t.textPrimary}
              >
                {doc.docId} ({doc.docLength}w)
              </text>
              <rect x={barStart} y={y + 2} width={maxBarW} height={20} rx={4} fill={t.surfaceAlt} />
              <rect x={barStart} y={y + 2} width={barW} height={20} rx={4} fill={barColor} />
              {isSelected && (
                <SketchRect
                  x={barStart - 2}
                  y={y}
                  width={maxBarW + 4}
                  height={24}
                  color={t.accentPrimary}
                  strokeWidth={1.6}
                  roughness={1}
                  id={`tfidf-bar-${doc.docId}`}
                />
              )}
              <text
                x={barStart + maxBarW + 8}
                y={y + 17}
                fontSize={13.5}
                fontFamily="monospace"
                fontWeight={isSelected ? 700 : 600}
                fill={doc.activeScore > 0 ? barColor : t.textMuted}
              >
                Score: {formatScore(doc.activeScore)}
              </text>
            </g>
          );
        })}

        <line x1={barStart} y1={axisY} x2={barStart + maxBarW} y2={axisY} stroke={t.border} strokeWidth={1.3} />
        <text
          x={barStart + maxBarW / 2}
          y={217}
          textAnchor="middle"
          fontSize={13.5}
          fontWeight={600}
          fontFamily={FONT_FAMILY}
          fill={t.textSecondary}
        >
          Score → ({variant === 'cosine' ? 'Cosine' : variant === 'raw-count' ? 'Raw count' : 'TF × IDF'})
        </text>
      </g>
    );
  };

  const renderTableSvg = (offsetX: number, panelW: number) => {
    const rows = (activeDoc?.breakdown ?? []).slice(0, 4);
    const colTerm = offsetX + 4;
    const colCount = offsetX + Math.round(panelW * 0.36);
    const colTf = offsetX + Math.round(panelW * 0.54);
    const colIdf = offsetX + Math.round(panelW * 0.74);
    const colProd = offsetX + panelW - 4;

    const highlightCol =
      stage === 0
        ? { x: colCount - 44, w: 48 }
        : stage === 1
          ? { x: colTf - 52, w: 56 }
          : stage === 2
            ? { x: colIdf - 54, w: 58 }
            : { x: colProd - 64, w: 68 };

    return (
      <g>
        <text x={offsetX + 4} y={16} fontSize={14.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Inside {activeDoc?.docId}: &ldquo;{shortText(activeDoc?.text ?? '', 26)}&rdquo;
        </text>

        <SketchRect
          x={highlightCol.x}
          y={32}
          width={highlightCol.w}
          height={152}
          color={t.accentPrimary}
          strokeWidth={1.6}
          roughness={1}
          id={`tfidf-col-${stage}`}
        />

        <text x={colTerm} y={50} fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Word
        </text>
        <text x={colCount} y={50} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 0 ? t.accentPrimary : t.textSecondary}>
          Cnt
        </text>
        <text x={colTf} y={50} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 1 ? t.accentPrimary : t.textSecondary}>
          TF
        </text>
        <text x={colIdf} y={50} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 2 ? t.accentPrimary : t.textSecondary}>
          IDF
        </text>
        <text x={colProd} y={50} textAnchor="end" fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 3 ? t.accentPrimary : t.textSecondary}>
          TF×IDF
        </text>
        <line x1={offsetX + 4} y1={58} x2={offsetX + panelW - 4} y2={58} stroke={t.border} strokeWidth={1.1} />

        {rows.length === 0 ? (
          <text x={offsetX + 4} y={92} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            Type search words above to fill table.
          </text>
        ) : (
          rows.map((b, idx) => {
            const ry = 82 + idx * 26;
            return (
              <g key={b.term}>
                <text x={colTerm} y={ry} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
                  {b.term.length > 9 ? `${b.term.slice(0, 8)}…` : b.term}
                </text>
                <text x={colCount} y={ry} textAnchor="end" fontSize={13.5} fontFamily="monospace" fill={t.textPrimary}>
                  {b.count}/{b.docLength}
                </text>
                <text x={colTf} y={ry} textAnchor="end" fontSize={13.5} fontFamily="monospace" fill={t.textSecondary}>
                  {b.tf.toFixed(3)}
                </text>
                <text x={colIdf} y={ry} textAnchor="end" fontSize={13.5} fontFamily="monospace" fill={t.accentSecondary}>
                  {b.idf.toFixed(4)}
                </text>
                <text x={colProd} y={ry} textAnchor="end" fontSize={13.5} fontFamily="monospace" fontWeight={700} fill={b.tfidf > 0 ? t.accentPrimary : t.textMuted}>
                  {b.tfidf.toFixed(4)}
                </text>
              </g>
            );
          })
        )}

        <text x={offsetX + 4} y={214} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          {activeDoc?.docId} total ({variant === 'cosine' ? 'cosine' : variant === 'raw-count' ? 'count' : 'TF×IDF'}):{' '}
        </text>
        <text x={colProd} y={214} textAnchor="end" fontSize={14.5} fontWeight={800} fontFamily="monospace" fill={t.accentPrimary}>
          {activeDoc ? formatScore(activeDoc.activeScore) : '0'}
        </text>
      </g>
    );
  };

  return (
    <>
      <PlaygroundHeaderBar
        eyebrow="Try it"
        title="Score the four documents for a search"
        description="Type any search query, edit a document's text, or switch scoring formulas to see how TF and IDF rank matches."
        playing={playback.playing}
        onToggle={playback.toggle}
        onNext={playback.next}
        onReset={playback.reset}
      />

      {/* Row 1: Free text query input + presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <label htmlFor="tfidf-query-input" style={{ fontSize: 14, fontWeight: 700, color: t.textSecondary }}>
          Search query:
        </label>
        <input
          id="tfidf-query-input"
          type="text"
          value={queryText}
          maxLength={60}
          placeholder="Type any search words…"
          onChange={(e) => {
            playback.stop();
            setQueryText(e.target.value);
          }}
          style={{
            flex: '1 1 180px',
            minWidth: 0,
            padding: '5px 10px',
            borderRadius: RADIUS.sm,
            border: `1.5px solid ${t.border}`,
            background: t.background,
            color: t.textPrimary,
            fontFamily: FONT_FAMILY,
            fontSize: 15,
          }}
        />
        <div role="group" aria-label="Preset search queries" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESET_QUERIES.map((q) => {
            const active = queryText.trim().toLowerCase() === q.query;
            return (
              <button
                key={q.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  playback.stop();
                  setQueryText(q.query);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? t.accentPrimary : t.border}`,
                  background: active ? t.surfaceAlt : 'transparent',
                  color: active ? t.accentPrimary : t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                &ldquo;{q.label}&rdquo;
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Scoring variant + editable document text */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<TfidfVariant>
            value={variant}
            onChange={(nextVar) => {
              playback.stop();
              setVariant(typeof nextVar === 'function' ? nextVar(variant) : nextVar);
            }}
            options={VARIANT_OPTIONS}
          />
        </div>
        <label htmlFor="tfidf-doc-edit" style={{ fontSize: 14, color: t.textSecondary, display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 220px', minWidth: 0 }}>
          <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Edit {activeDoc?.docId}:</span>
          <input
            id="tfidf-doc-edit"
            type="text"
            value={activeDoc?.text ?? ''}
            maxLength={90}
            onChange={(e) => activeDoc && updateDocText(activeDoc.docId, e.target.value)}
            style={{
              width: '100%',
              minWidth: 0,
              padding: '4px 8px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: FONT_FAMILY,
              fontSize: 14,
            }}
          />
        </label>
        {!isDefaultCorpus && (
          <button
            type="button"
            onClick={resetCorpus}
            style={{
              padding: '4px 10px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: 'transparent',
              color: t.textSecondary,
              fontFamily: FONT_FAMILY,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reset docs
          </button>
        )}
      </div>

      {/* Stage selector + live readout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TFIDF_STAGES.map((st) => {
            const active = stage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                aria-pressed={active}
                onClick={() => playback.setStep(st.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? t.accentPrimary : t.border}`,
                  background: active ? t.accentPrimary : 'transparent',
                  color: active ? t.background : t.textSecondary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {st.shortLabel}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Query terms: <strong style={{ color: t.textPrimary }}>{queryTerms.length}</strong> · Top:{' '}
          <strong style={{ color: t.accentPrimary }}>
            {results[0]?.docId} ({formatScore(results[0]?.activeScore ?? 0)})
          </strong>
          {isTopTied && variant === 'classic' && (
            <span style={{ marginLeft: 8, color: t.accentSecondary, fontWeight: 700 }}>
              · {results[0].docId} and {results[1].docId} tie exactly
            </span>
          )}
        </div>
      </div>

      <StepCaptionStrip caption={`Step ${stage + 1}/4: ${caption}`} accentColor={t.accentPrimary} />

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 228"
            role="img"
            aria-label={`TF-IDF ranking for "${queryText}": top document ${results[0]?.docId} scores ${formatScore(results[0]?.activeScore ?? 0)}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderBarsSvg(0, 336)}
            <line x1={345} y1={10} x2={345} y2={218} stroke={t.border} strokeDasharray="4 4" strokeWidth={1} />
            {renderTableSvg(354, 344)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 340 226"
              role="img"
              aria-label={`TF-IDF ranked documents for "${queryText}"`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderBarsSvg(0, 340)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 340 224"
              role="img"
              aria-label={`TF-IDF per-word numbers inside ${activeDoc?.docId}`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderTableSvg(0, 340)}
            </svg>
          </div>
        )}
      </div>

      <FormulaStrip general={formula.general} worked={formula.worked} />

      <PredictChallenge
        prompt={'Search only "learning" — which document ranks #1?'}
        options={PREDICT_OPTIONS}
        correctIndex={0}
        selected={prediction}
        onSelect={setPrediction}
        explanation={'D2 says "learning" 2 out of 7 words (TF = 0.2857), beating D1 and D3 (1/4 = 0.2500).'}
        actionLabel={'Search "learning" now'}
        onAction={() => {
          playback.stop();
          setVariant('classic');
          setQueryText('learning');
          setInspectedDocId('D2');
          playback.setStep(3);
        }}
      />
    </>
  );
}

export function TfidfSearchExplorer() {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Interactive TF-IDF Search Engine"
      footer="Exact TF = count/|d| and IDF = ln(N/df) over the four editable documents. Click any document bar to inspect its per-word calculation."
    >
      <TfidfSearchPlayground outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}

export default TfidfSearchExplorer;
