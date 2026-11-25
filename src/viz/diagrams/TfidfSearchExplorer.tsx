import { useEffect, useMemo, useRef, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from '../primitives';
import {
  TFIDF_STAGES,
  TOY_TFIDF_DOCS,
  explainTfidfStep,
  runTfidfSearch,
  tokenizeText,
  type ScoredDocument,
  type TfidfStage,
  type TfidfVariant,
  type ToyDocument,
} from '../lib/tfidf';

const PRESET_QUERIES: { label: string; query: string }[] = [
  { label: 'machine learning', query: 'machine learning' },
  { label: 'deep learning', query: 'deep learning' },
  { label: 'cooking food', query: 'cooking food' },
  { label: 'machine search', query: 'machine search' },
];

const VARIANT_OPTIONS: { value: TfidfVariant; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'cosine', label: 'Cosine' },
  { value: 'raw-count', label: 'Raw count' },
];

const FORMULA_NOTES: {
  id: TfidfVariant;
  title: string;
  latex: string;
  explain: string;
  color: 'yellow' | 'pink' | 'orange';
}[] = [
  {
    id: 'classic',
    title: 'Classic TF×IDF',
    latex: '\\mathrm{Score}(q,d) = \\sum_{t \\in q} \\frac{c(t,d)}{|d|}\\cdot\\ln\\!\\left(\\frac{N}{\\mathrm{df}(t)}\\right)',
    explain: 'Divides word hits c(t,d) by page length |d|, then multiplies by rarity ln(N/df).',
    color: 'yellow',
  },
  {
    id: 'cosine',
    title: 'Cosine TF-IDF',
    latex: '\\cos(q,d) = \\frac{q \\cdot d}{\\lVert q\\rVert\\,\\lVert d\\rVert}',
    explain: 'Compares vector angle (direction), so repeating the same text twice gives the same score.',
    color: 'pink',
  },
  {
    id: 'raw-count',
    title: 'Raw word count',
    latex: '\\mathrm{Count}(q,d) = \\sum_{t \\in q} c(t,d)',
    explain: 'Just counts word hits; ignores page length and common filler words like "is".',
    color: 'orange',
  },
];

const PREDICT_OPTIONS = [
  'D2 wins (says "learning" 2/7 = 0.286)',
  'D1 and D3 still tie at the top',
  'All three tie equally',
] as const;

function shortText(text: string, maxLen = 24): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function formatScore(val: number, variant: TfidfVariant): string {
  return variant === 'raw-count' ? String(Math.round(val)) : val.toFixed(4);
}

function termPartValue(
  b: ScoredDocument['breakdown'][number],
  variant: TfidfVariant,
): number {
  if (variant === 'raw-count') return b.count;
  if (variant === 'cosine') return b.cosineContribution;
  return b.tfidf;
}

function workedTermsSummary(
  doc: ScoredDocument | undefined,
  stage: TfidfStage,
  variant: TfidfVariant,
): string {
  if (!doc || doc.breakdown.length === 0) {
    return 'Type at least one search word above to plug live numbers into the formula.';
  }
  const first = doc.breakdown[0];
  if (variant === 'raw-count' || stage === 0) {
    const parts = doc.breakdown.map((b) => `${b.count}`).join(' + ');
    return `${doc.docId}: ${parts} = ${doc.rawCountTotal} total hit${doc.rawCountTotal === 1 ? '' : 's'} (of ${doc.docLength} words).`;
  }
  if (stage === 1) {
    return `${doc.docId} ("${first.term}"): ${first.count} hits ÷ ${first.docLength} words = ${first.tf.toFixed(4)}.`;
  }
  if (stage === 2) {
    return doc.breakdown
      .map((b) => `"${b.term}": ln(${b.N}/${b.df}) = ${b.idf.toFixed(4)}`)
      .join(' · ');
  }
  if (variant === 'cosine') {
    const parts = doc.breakdown.map((b) => b.cosineContribution.toFixed(4)).join(' + ');
    return `${doc.docId}: ${doc.dotProduct.toFixed(4)} ÷ (${doc.queryNorm.toFixed(4)} × ${doc.docNorm.toFixed(4)}) = ${parts} = ${doc.cosineScore.toFixed(4)}.`;
  }
  const parts = doc.breakdown
    .map((b) => `(${b.tf.toFixed(4)} × ${b.idf.toFixed(4)})`)
    .join(' + ');
  return `${doc.docId}: ${parts} = ${doc.classicScore.toFixed(4)}.`;
}

function TfidfSearchPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const innerVisible = useVizVisible();
  const visible = outerVisible && innerVisible;

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 760;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompactPhone = hostWidth < 540;

  const [queryText, setQueryText] = useState('machine learning');
  const [docs, setDocs] = useState<ToyDocument[]>(() => TOY_TFIDF_DOCS.map((d) => ({ ...d, tokens: [...d.tokens] })));
  const [variant, setVariant] = useState<TfidfVariant>('classic');
  const [inspectedDocId, setInspectedDocId] = useState('D1');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [stage, setStage] = useState<TfidfStage>(() => (reducedMotion ? 3 : 0));
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setStage(3);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return undefined;
    const id = window.setTimeout(() => {
      setStage((curr) => ((curr + 1) % TFIDF_STAGES.length) as TfidfStage);
    }, 2100);
    return () => window.clearTimeout(id);
  }, [playing, visible, reducedMotion, stage]);

  const stopPlay = () => setPlaying(false);

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

  // Distinct colour per query term (Blue, Purple, Teal, Amber); Green highlights top/selected total.
  const termColors = useMemo(
    () => [t.accentSecondary, t.accentPurple, t.accentTeal, t.accentWarn],
    [t],
  );

  const updateDocText = (docId: string, nextText: string) => {
    stopPlay();
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, text: nextText, tokens: tokenizeText(nextText) } : d)),
    );
  };

  const resetCorpus = () => {
    stopPlay();
    setDocs(TOY_TFIDF_DOCS.map((d) => ({ ...d, tokens: [...d.tokens] })));
  };

  const selectVariant = (next: TfidfVariant | ((prev: TfidfVariant) => TfidfVariant)) => {
    stopPlay();
    setVariant((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  const caption = explainTfidfStep(stage, activeDoc, queryStats, variant, docs.length);
  const workedText = workedTermsSummary(activeDoc, stage, variant);
  const activeFormulaMeta = FORMULA_NOTES.find((f) => f.id === variant) ?? FORMULA_NOTES[0];
  const variantLabel = variant === 'cosine' ? 'Cosine' : variant === 'raw-count' ? 'Raw count' : 'TF × IDF';

  // ---- SVG Panel 1: Stacked Ranked Document Bars (clipped to plot area) ----
  const renderBarsSvg = (offsetX: number, panelW: number) => {
    const labelEnd = offsetX + 94;
    const barStart = offsetX + 102;
    const scoreReserve = 82;
    const maxBarW = Math.max(70, panelW - (barStart - offsetX) - scoreReserve);
    const rowH = 38;
    const topY = 58;
    const axisY = topY + results.length * rowH + 4;
    const clipId = `tfidf-bars-clip-${offsetX}-${panelW}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={barStart} y={topY - 2} width={maxBarW} height={results.length * rowH + 6} rx={4} />
          </clipPath>
        </defs>
        <text x={offsetX + 4} y={20} fontSize={15.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Document ranking (click a row)
        </text>
        <text x={offsetX + 4} y={44} fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Doc (words)
        </text>
        <text x={offsetX + panelW - 4} y={44} textAnchor="end" fontSize={14} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Total score
        </text>
        <line x1={offsetX + 4} y1={52} x2={offsetX + panelW - 4} y2={52} stroke={t.border} strokeWidth={1.1} />

        {results.map((doc, idx) => {
          const y = topY + idx * rowH;
          const isSelected = doc.docId === activeDoc?.docId;
          let segCursor = barStart;
          return (
            <g
              key={doc.docId}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                stopPlay();
                setInspectedDocId(doc.docId);
              }}
            >
              <text
                x={labelEnd}
                y={y + 23}
                textAnchor="end"
                fontSize={14}
                fontWeight={isSelected ? 700 : 500}
                fontFamily={FONT_FAMILY}
                fill={isSelected ? t.accentPrimary : t.textPrimary}
              >
                {doc.docId} ({doc.docLength}w)
              </text>
              <rect x={barStart} y={y + 6} width={maxBarW} height={22} rx={4} fill={t.surfaceAlt} />
              <g clipPath={`url(#${clipId})`}>
                {doc.breakdown.map((b, termIdx) => {
                  const val = termPartValue(b, variant);
                  const segW = val > 0 ? Math.max(3, (val / maxScore) * maxBarW) : 0;
                  const segX = segCursor;
                  segCursor += segW;
                  return (
                    <rect
                      key={`${doc.docId}-${b.term}`}
                      x={segX}
                      y={y + 6}
                      width={segW}
                      height={22}
                      fill={termColors[termIdx % termColors.length]}
                    />
                  );
                })}
              </g>
              {isSelected && (
                <SketchRect
                  x={barStart - 2}
                  y={y + 4}
                  width={maxBarW + 4}
                  height={26}
                  color={t.accentPrimary}
                  strokeWidth={2}
                  roughness={1}
                  id={`tfidf-bar-${doc.docId}`}
                />
              )}
              <text
                x={offsetX + panelW - 4}
                y={y + 22}
                textAnchor="end"
                fontSize={14}
                fontFamily="monospace"
                fontWeight={isSelected ? 700 : 600}
                fill={doc.activeScore > 0 ? (isSelected ? t.accentPrimary : t.textPrimary) : t.textMuted}
              >
                {formatScore(doc.activeScore, variant)}
              </text>
            </g>
          );
        })}

        <line x1={barStart} y1={axisY} x2={barStart + maxBarW} y2={axisY} stroke={t.border} strokeWidth={1.3} />
        <text
          x={barStart + maxBarW / 2}
          y={axisY + 20}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fontFamily={FONT_FAMILY}
          fill={t.textSecondary}
        >
          Score → ({variantLabel})
        </text>
      </g>
    );
  };

  // ---- SVG Panel 2: Inside Inspected Document (plain column titles + exact math) ----
  const visibleRows = activeDoc?.breakdown ?? [];
  const tableRowsCount = Math.max(1, visibleRows.length);
  const desktopSvgH = Math.max(254, 134 + tableRowsCount * 32);

  const renderTableSvg = (offsetX: number, panelW: number) => {
    const colTerm = offsetX + 6;
    const colCount = offsetX + Math.round(panelW * 0.41);
    const colTf = offsetX + Math.round(panelW * 0.58);
    const colIdf = offsetX + Math.round(panelW * 0.77);
    const colProd = offsetX + panelW - 6;

    const colBoxH = 38 + tableRowsCount * 32;
    const highlightCol =
      stage === 0
        ? { x: colCount - 44, w: 48 }
        : stage === 1
          ? { x: colTf - 54, w: 58 }
          : stage === 2
            ? { x: colIdf - 60, w: 64 }
            : { x: colProd - 64, w: 68 };

    const totalY = 82 + tableRowsCount * 32;

    return (
      <g>
        <text x={offsetX + 6} y={20} fontSize={15.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Inside {activeDoc?.docId}: &ldquo;{shortText(activeDoc?.text ?? '', 22)}&rdquo;
        </text>

        <SketchRect
          x={highlightCol.x}
          y={32}
          width={highlightCol.w}
          height={colBoxH}
          color={t.accentPrimary}
          strokeWidth={1.8}
          roughness={1}
          id={`tfidf-col-${stage}`}
        />

        <text x={colTerm} y={50} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Word
        </text>
        <text x={colCount} y={50} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 0 ? t.accentPrimary : t.textSecondary}>
          Hits
        </text>
        <text x={colTf} y={50} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 1 ? t.accentPrimary : t.textSecondary}>
          TF
        </text>
        <text x={colIdf} y={50} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 2 ? t.accentPrimary : t.textSecondary}>
          IDF
        </text>
        <text x={colProd} y={50} textAnchor="end" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={stage === 3 ? t.accentPrimary : t.textSecondary}>
          {variant === 'cosine' ? 'Cos' : variant === 'raw-count' ? 'Pts' : 'TF×IDF'}
        </text>
        <line x1={offsetX + 4} y1={58} x2={offsetX + panelW - 4} y2={58} stroke={t.border} strokeWidth={1.1} />

        {visibleRows.length === 0 ? (
          <text x={offsetX + 6} y={90} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            Type search words above to compute scores.
          </text>
        ) : (
          visibleRows.map((b, idx) => {
            const ry = 82 + idx * 32;
            const termCol = termColors[idx % termColors.length];
            const finalPart = termPartValue(b, variant);
            return (
              <g key={b.term}>
                <circle cx={colTerm + 5} cy={ry - 5} r={4.5} fill={termCol} />
                <text x={colTerm + 14} y={ry} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
                  {b.term.length > 9 ? `${b.term.slice(0, 8)}…` : b.term}
                </text>
                <text x={colCount} y={ry} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textPrimary}>
                  {b.count}/{b.docLength}
                </text>
                <text x={colTf} y={ry} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textSecondary}>
                  {b.tf.toFixed(3)}
                </text>
                <text x={colIdf} y={ry} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textSecondary}>
                  {b.idf.toFixed(4)}
                </text>
                <text x={colProd} y={ry} textAnchor="end" fontSize={14} fontFamily="monospace" fontWeight={700} fill={finalPart > 0 ? t.accentPrimary : t.textMuted}>
                  {variant === 'raw-count' ? String(Math.round(finalPart)) : finalPart.toFixed(4)}
                </text>
              </g>
            );
          })
        )}

        <line x1={offsetX + 4} y1={totalY - 12} x2={offsetX + panelW - 4} y2={totalY - 12} stroke={t.border} strokeWidth={1.1} />
        <text x={colTerm} y={totalY + 12} fontSize={14.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          {activeDoc?.docId} total ({variantLabel}):
        </text>
        <text x={colProd} y={totalY + 12} textAnchor="end" fontSize={15} fontWeight={700} fontFamily="monospace" fill={t.accentPrimary}>
          {activeDoc ? formatScore(activeDoc.activeScore, variant) : '0'}
        </text>
        <text x={colTerm} y={totalY + 34} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          TF = hits ÷ doc words · IDF = ln(N ÷ docs with word)
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How TF-IDF decides which document matches best"
            description={
              <span style={{ fontSize: 15 }}>
                If search only counted matching words, long pages and common filler words like &ldquo;is&rdquo; would dominate. TF-IDF fixes both: it divides each match count by document length (TF) and multiplies by how rare the word is across all documents (IDF).
              </span>
            }
          />

          {/* Control Group 1: Free text query + quick presets */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
            <label htmlFor="tfidf-query-input" style={{ display: 'block', flex: '1 1 210px', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                Search words (type any query)
              </span>
              <input
                id="tfidf-query-input"
                type="text"
                value={queryText}
                maxLength={60}
                placeholder="Type any search words…"
                onChange={(e) => {
                  stopPlay();
                  setQueryText(e.target.value);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                }}
              />
            </label>
            <div role="group" aria-label="Preset search queries" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_QUERIES.map((q) => {
                const active = queryText.trim().toLowerCase() === q.query;
                return (
                  <button
                    key={q.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      stopPlay();
                      setQueryText(q.query);
                    }}
                    style={{
                      padding: '6px 11px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${active ? t.accentPrimary : t.border}`,
                      background: active ? t.surfaceAlt : 'transparent',
                      color: active ? t.accentPrimary : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
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

          {/* Control Group 2: Scoring formula + Editable document text */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<TfidfVariant>
                label="Scoring formula (how matches are ranked)"
                value={variant}
                onChange={selectVariant}
                options={VARIANT_OPTIONS}
              />
            </div>
            <label htmlFor="tfidf-doc-edit" style={{ display: 'block', flex: '1 1 240px', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                Edit {activeDoc?.docId}&apos;s text (test adding or repeating words)
              </span>
              <input
                id="tfidf-doc-edit"
                type="text"
                value={activeDoc?.text ?? ''}
                maxLength={90}
                onChange={(e) => activeDoc && updateDocText(activeDoc.docId, e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 10px',
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${t.border}`,
                  background: t.background,
                  color: t.textPrimary,
                  fontFamily: FONT_FAMILY,
                  fontSize: 15,
                }}
              />
            </label>
            {!isDefaultCorpus && (
              <VizButton variant="secondary" onClick={resetCorpus}>
                Reset docs
              </VizButton>
            )}
          </div>

          {/* Control Group 3: Step pills + live winner readout */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Calculation step">
              {TFIDF_STAGES.map((st) => {
                const active = stage === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      stopPlay();
                      setStage(st.id);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${active ? t.accentPrimary : t.border}`,
                      background: active ? t.accentPrimary : 'transparent',
                      color: active ? t.background : t.textSecondary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {st.shortLabel}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Query words: <strong style={{ color: t.textPrimary }}>{queryTerms.length}</strong> · Top:{' '}
              <strong style={{ color: t.accentPrimary }}>
                {results[0]?.docId} ({formatScore(results[0]?.activeScore ?? 0, variant)})
              </strong>
              {isTopTied && variant === 'classic' && (
                <span style={{ marginLeft: 8, color: t.accentSecondary, fontWeight: 700 }}>
                  · {results[0].docId} and {results[1].docId} tie exactly
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend (same distinct colour per search term everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}
        aria-label="Word contribution colours"
      >
        {queryTerms.map((term, idx) => (
          <span key={term}>
            <span
              style={{
                display: 'inline-block',
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: termColors[idx % termColors.length],
                verticalAlign: 'middle',
                marginRight: 6,
              }}
            />
            word &ldquo;{term}&rdquo;
          </span>
        ))}
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 11,
              border: `2px solid ${t.accentPrimary}`,
              verticalAlign: 'middle',
              marginRight: 6,
            }}
          />
          inspected doc ({activeDoc?.docId})
        </span>
      </div>

      {/* Main SVG visual */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox={`0 0 760 ${desktopSvgH}`}
            role="img"
            aria-label={`TF-IDF ranking for "${queryText}": top document ${results[0]?.docId} scores ${formatScore(results[0]?.activeScore ?? 0, variant)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderBarsSvg(0, 368)}
            <line x1={378} y1={10} x2={378} y2={desktopSvgH - 12} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderTableSvg(388, 368)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 250"
              role="img"
              aria-label={`TF-IDF ranked documents for "${queryText}"`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderBarsSvg(0, 380)}
            </svg>
            <svg
              width="100%"
              viewBox={`0 0 380 ${Math.max(230, 126 + tableRowsCount * 32)}`}
              role="img"
              aria-label={`TF-IDF per-word numbers inside ${activeDoc?.docId}`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderTableSvg(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={activeFormulaMeta.title} latex={activeFormulaMeta.latex} color={activeFormulaMeta.color} tilt={-1}>
            <p style={{ textAlign: 'center' }}>{workedText}</p>
          </StickyNote>
          <StickyNote title={`Step ${stage + 1} of 4`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {FORMULA_NOTES.map((f, i) => (
              <StickyNote
                key={f.id}
                title={f.title}
                latex={f.latex}
                color={f.color}
                tilt={i % 2 ? 1 : -1}
                active={variant === f.id}
                onSelect={() => selectVariant(f.id)}
              >
                <p style={{ textAlign: 'center' }}>{f.explain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · ${activeDoc?.docId ?? 'D1'}`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">{workedText}</p>
            </StickyNote>
            <StickyNote title={`Step ${stage + 1} of 4 · What just happened`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span style={{ color: t.textPrimary }}>Search only &ldquo;learning&rdquo; — which document ranks #1?</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 0;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border
                      }`,
                      background:
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {prediction !== null && (
              <span role="status" style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                D2 says &ldquo;learning&rdquo; 2 out of 7 words (TF = 0.2857), beating D1 and D3 (1/4 = 0.2500).{' '}
                <button
                  type="button"
                  onClick={() => {
                    stopPlay();
                    setVariant('classic');
                    setQueryText('learning');
                    setInspectedDocId('D2');
                    setStage(3);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Search &ldquo;learning&rdquo; now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <VizButton
              onClick={() => {
                setPlaying((p) => !p);
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                stopPlay();
                setStage((s) => ((s + 1) % TFIDF_STAGES.length) as TfidfStage);
              }}
            >
              Step →
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                stopPlay();
                setStage(0);
              }}
            >
              Reset
            </VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              N = {docs.length} documents · click any formula note or bar to inspect.
            </span>
          </div>
        </>
      )}
    </>
  );
}

export function TfidfSearchExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Interactive TF-IDF Search Engine"
      footer="Exact TF = count/|d| and IDF = ln(N/df) over the four editable documents. Click any document bar or formula sticky note to inspect its per-word calculation."
    >
      <TfidfSearchPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}

export default TfidfSearchExplorer;
