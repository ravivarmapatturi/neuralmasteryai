import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  analyzeColdStart,
  COLD_START_PLAYBACK_K,
  type ColdStartEntity,
  type ColdStartStrategyFocus,
  type MetadataRichness,
} from '../lib/coldStart';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Pure collaborative filtering',
  'Content-based metadata fallback',
  'Both tie at random accuracy',
] as const;

const FORMULA_LATEX: Record<ColdStartStrategyFocus, string> = {
  collab: String.raw`Q_{\text{cf}}(k) = Q_0 + \Delta_{\text{cf}}\,\frac{k_{\text{eff}}}{k_{\text{eff}} + k_0}`,
  content: String.raw`\hat{s}_{\text{content}}(u, i) = x_u^\top x_i`,
  hybrid: String.raw`\hat{s}(k) = (1 - w)\,\hat{s}_{\text{content}} + w\,\hat{s}_{\text{cf}},\quad w = \frac{k_{\text{eff}}}{k_{\text{eff}} + k_0}`,
};

function ColdStartPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const clipRankId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [entity, setEntity] = useState<ColdStartEntity>('new-user');
  const [richness, setRichness] = useState<MetadataRichness>('basic');
  const [exploreRate, setExploreRate] = useState<number>(0.1);
  const [focus, setFocus] = useState<ColdStartStrategyFocus>('hybrid');
  const [manualK, setManualK] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(COLD_START_PLAYBACK_K.length, 2150, 3, outerVisible);
  const interactions = manualK ?? COLD_START_PLAYBACK_K[playback.step] ?? 10;

  const analysis = useMemo(
    () => analyzeColdStart({ entity, interactions, richness, exploreRate, focus }),
    [entity, interactions, richness, exploreRate, focus],
  );

  const popColor = t.accentWarn;
  const contentColor = t.accentSecondary;
  const collabColor = t.accentDanger;
  const hybridColor = t.accentPrimary;

  const selectK = (nextK: number) => {
    playback.stop();
    setManualK(Math.max(0, Math.min(40, Math.round(nextK))));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const renderCurvesPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 36;
    const plotW = panelW - 64;
    const plotH = 198;

    const px = (k: number) => plotX + (k / 40) * plotW;
    const py = (q: number) => plotY + plotH - Math.max(0, Math.min(1, q)) * (plotH - 12);

    const buildPath = (pickVal: (pt: (typeof analysis.curve)[number]) => number) =>
      analysis.curve
        .map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.k).toFixed(1)},${py(pickVal(pt)).toFixed(1)}`)
        .join(' ');

    const curX = px(analysis.interactions);
    const crossX = analysis.crossoverK !== null && analysis.crossoverK <= 40 ? px(analysis.crossoverK) : null;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Accuracy as interaction history k grows
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 0.5, 1.0].map((yt) => (
          <g key={`cy-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {Math.round(yt * 100)}%
            </text>
          </g>
        ))}

        {[0, 10, 20, 30, 40].map((xt) => (
          <g key={`cx-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {crossX !== null && (
            <line
              x1={crossX}
              y1={plotY}
              x2={crossX}
              y2={plotY + plotH}
              stroke={t.border}
              strokeWidth={1.4}
              strokeDasharray="3 3"
            />
          )}

          {/* Vertical cursor for current k */}
          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={t.textPrimary} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.55} />

          <path d={buildPath((p) => p.popularity)} fill="none" stroke={popColor} strokeWidth={2} strokeDasharray="5 4" />
          <path d={buildPath((p) => p.content)} fill="none" stroke={contentColor} strokeWidth={2.2} />
          <path d={buildPath((p) => p.collab)} fill="none" stroke={collabColor} strokeWidth={2.4} />
          <path d={buildPath((p) => p.hybrid)} fill="none" stroke={hybridColor} strokeWidth={2.8} />

          {/* Current k dots */}
          <circle cx={curX} cy={py(analysis.current.popularity)} r={4.5} fill={popColor} stroke={t.background} strokeWidth={1.4} />
          <circle cx={curX} cy={py(analysis.current.content)} r={5} fill={contentColor} stroke={t.background} strokeWidth={1.4} />
          <circle cx={curX} cy={py(analysis.current.collab)} r={5} fill={collabColor} stroke={t.background} strokeWidth={1.4} />
          <circle cx={curX} cy={py(analysis.current.hybrid)} r={5.5} fill={hybridColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Interactions observed k = {analysis.interactions} (crossover at k ≈ {analysis.crossoverK ? analysis.crossoverK.toFixed(0) : '—'})
        </text>
      </g>
    );
  };

  const renderRankPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 14;
    const plotY = 36;
    const plotW = panelW - 28;
    const plotH = 198;
    const barW = plotW - 24;
    const contentShareW = barW * analysis.contentWeight;
    const collabShareW = barW * analysis.collabWeight;

    const top3 = analysis.rankedItems.slice(0, 3);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Live picks ({entity === 'new-user' ? 'new user' : 'new item'}, k = {analysis.interactions})
        </text>
        <defs>
          <clipPath id={`${clipRankId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRankId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 20} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Blend: {Math.round(analysis.contentWeight * 100)}% fallback vs {Math.round(analysis.collabWeight * 100)}% collab
          </text>
          <rect x={plotX + 12} y={plotY + 27} width={contentShareW} height={14} rx={3} fill={contentColor} fillOpacity={0.85} />
          <rect x={plotX + 12 + contentShareW} y={plotY + 27} width={collabShareW} height={14} rx={3} fill={hybridColor} fillOpacity={0.85} />

          {top3.map((item, idx) => {
            const ry = plotY + 62 + idx * 44;
            const scoreBarW = Math.max(6, item.score * (barW - 82));
            return (
              <g key={item.id}>
                <text x={plotX + 12} y={ry + 4} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {idx + 1}. {item.label}
                </text>
                <text x={plotX + plotW - 12} y={ry + 4} textAnchor="end" fontSize={14} fill={t.textSecondary}>
                  {item.sourceNote}
                </text>
                <rect x={plotX + 12} y={ry + 11} width={barW - 82} height={12} rx={3} fill={t.surfaceAlt} />
                <rect
                  x={plotX + 12}
                  y={ry + 11}
                  width={scoreBarW}
                  height={12}
                  rx={3}
                  fill={focus === 'collab' ? collabColor : focus === 'content' ? contentColor : hybridColor}
                  fillOpacity={0.85}
                />
                <text x={plotX + plotW - 12} y={ry + 22} textAnchor="end" fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {Math.round(item.score * 100)}%
                </text>
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Hybrid shifts as clicks arrive
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="How a recommender handles brand-new users and items with zero history"
                description="Collaborative filtering relies on past clicks to match similar tastes, so it is blind at k = 0 interactions. Production systems rely on popularity and content attributes first, then hand off smoothly to collaborative filtering as real feedback arrives."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualK(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualK(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualK(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ColdStartEntity>
                label="What is brand new?"
                value={entity}
                onChange={(val) => setEntity(val)}
                options={[
                  { value: 'new-user', label: 'New user (0 clicks)' },
                  { value: 'new-item', label: 'New item (0 views)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ColdStartStrategyFocus>
                label="Strategy driving picks"
                value={focus}
                onChange={(val) => setFocus(val)}
                options={[
                  { value: 'collab', label: 'Collaborative only' },
                  { value: 'content', label: 'Content fallback' },
                  { value: 'hybrid', label: 'Hybrid handoff' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<MetadataRichness>
                label="Attribute metadata richness"
                value={richness}
                onChange={(val) => setRichness(val)}
                options={[
                  { value: 'none', label: 'None (pop only)' },
                  { value: 'basic', label: 'Basic tags' },
                  { value: 'rich', label: 'Rich profile' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Observed interactions k"
              value={analysis.interactions}
              onChange={(v) => selectK(v)}
              min={0}
              max={40}
              step={1}
              format={(v) => `${v} clicks`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact clicks k (0–40)</span>
              <input
                aria-label="Exact interaction count k"
                type="number"
                min={0}
                max={40}
                step={1}
                value={analysis.interactions}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) selectK(v);
                }}
                style={inputStyle}
              />
            </label>
            <Slider
              label="Exploration budget ε (gather signal faster)"
              value={exploreRate}
              onChange={(v) => setExploreRate(v)}
              min={0}
              max={0.25}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Strategy colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, borderTop: `2.5px dashed ${popColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Popularity baseline
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: contentColor, verticalAlign: 'middle', marginRight: 6 }} />
          Content features
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 3, background: collabColor, verticalAlign: 'middle', marginRight: 6 }} />
          Collaborative filtering
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: hybridColor, verticalAlign: 'middle', marginRight: 6 }} />
          Hybrid handoff
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`At k=${analysis.interactions} interactions, hybrid accuracy is ${(analysis.current.hybrid * 100).toFixed(0)}% versus ${(analysis.current.collab * 100).toFixed(0)}% for collaborative alone`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCurvesPanel(0, 426)}
            {renderRankPanel(438, 322)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Cold start accuracy handoff curves" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvesPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Top ranked items at current k" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRankPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Hybrid cold-start handoff" latex={FORMULA_LATEX[focus]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              k = {analysis.interactions} · collab weight w = {(analysis.collabWeight * 100).toFixed(0)}% · hybrid {(analysis.current.hybrid * 100).toFixed(0)}%
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${COLD_START_PLAYBACK_K.length}`} color="blue" tilt={1} live>
            <p>{analysis.stepExplain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Collaborative growth curve"
              latex={FORMULA_LATEX.collab}
              color="pink"
              tilt={-1}
              active={focus === 'collab'}
              onSelect={() => setFocus('collab')}
            >
              <p style={{ textAlign: 'center' }}>Starts near random at k = 0; surpasses fallback only once k crosses k₀.</p>
            </StickyNote>
            <StickyNote
              title="Content-based fallback"
              latex={FORMULA_LATEX.content}
              color="yellow"
              tilt={1}
              active={focus === 'content'}
              onSelect={() => setFocus('content')}
            >
              <p style={{ textAlign: 'center' }}>Matches user and item attributes immediately before any clicks happen.</p>
            </StickyNote>
            <StickyNote
              title="Production hybrid handoff"
              latex={FORMULA_LATEX.hybrid}
              color="orange"
              tilt={-1}
              active={focus === 'hybrid'}
              onSelect={() => setFocus('hybrid')}
            >
              <p style={{ textAlign: 'center' }}>Shifts weight w from 0% toward 100% as real behavioral clicks accumulate.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · k = ${analysis.interactions} (k_eff = ${analysis.effectiveK.toFixed(1)})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Shrinkage weight w = {analysis.effectiveK.toFixed(1)} / ({analysis.effectiveK.toFixed(1)} + {analysis.priorCountK0}) = <strong>{(analysis.collabWeight * 100).toFixed(1)}%</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Pop: <strong>{(analysis.current.popularity * 100).toFixed(0)}%</strong> · Content: <strong>{(analysis.current.content * 100).toFixed(0)}%</strong> · Collab: <strong>{(analysis.current.collab * 100).toFixed(0)}%</strong> · Hybrid: <strong>{(analysis.current.hybrid * 100).toFixed(0)}%</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${COLD_START_PLAYBACK_K.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.stepExplain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="A brand-new user signs up with basic topic tags and has k = 0 clicks so far. Which strategy gives the strongest recommendations right away?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Without behavioral history, collaborative filtering cannot connect this user to peers (12% accuracy), whereas content tags immediately reach 60%."
            actionLabel="Inspect k = 0 now"
            onAction={() => {
              setEntity('new-user');
              setRichness('basic');
              setFocus('hybrid');
              selectK(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export function ColdStartDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Cold-start strategy handoff playground"
      footer="Illustrative Bayesian shrinkage handoff w = k_eff / (k_eff + k₀) blending attribute fallback into collaborative filtering as interaction history grows."
    >
      <ColdStartPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}

export default ColdStartDiagram;
