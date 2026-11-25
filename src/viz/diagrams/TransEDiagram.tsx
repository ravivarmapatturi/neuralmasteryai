import { useId, useMemo, useState } from 'react';
import { SketchArrow } from '../../components/notebook/RoughShape';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
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
  addVec2,
  buildTransETrainingTrace,
  marginRankingLoss,
  scoreTransECandidates,
  TRANSE_SCENARIOS,
  type TransEMetric,
  type TransEScenarioId,
  type Vec2Tuple,
} from '../lib/transe';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'The two prize points stay far apart in separate regions',
  'Both are pulled toward the exact same point h + r and collapse together',
  'TransE automatically splits r into two different relation vectors',
] as const;

function TransEPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipSpaceId = useId();
  const clipRankId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [scenarioId, setScenarioId] = useState<TransEScenarioId>('curie-born');
  const [metric, setMetric] = useState<TransEMetric>('l2');
  const [gamma, setGamma] = useState<number>(0.5);
  const [relX, setRelX] = useState<number>(TRANSE_SCENARIOS[0].relationVec[0]);
  const [relY, setRelY] = useState<number>(TRANSE_SCENARIOS[0].relationVec[1]);
  const [selectedCandId, setSelectedCandId] = useState<string>('paris');
  const [prediction, setPrediction] = useState<number | null>(null);

  const scenario = useMemo(
    () => TRANSE_SCENARIOS.find((s) => s.id === scenarioId) ?? TRANSE_SCENARIOS[0],
    [scenarioId],
  );
  const relationVec = useMemo<Vec2Tuple>(() => [relX, relY], [relX, relY]);
  const predicted = useMemo(
    () => addVec2(scenario.subjectVec, relationVec),
    [scenario.subjectVec, relationVec],
  );

  const frames = useMemo(
    () => buildTransETrainingTrace(scenario, scenario.subjectVec, relationVec, metric, gamma, 6),
    [scenario, relationVec, metric, gamma],
  );

  const playback = useStepPlayback(frames.length, 2000, frames.length - 1, outerVisible);
  const frame = frames[playback.step] ?? frames[frames.length - 1];
  const ranked = useMemo(
    () => scoreTransECandidates(predicted, frame.candidates, metric),
    [predicted, frame.candidates, metric],
  );

  const trueCands = ranked.filter((c) => c.isTrue);
  const wrongCands = ranked.filter((c) => !c.isTrue);
  const primaryTrue = trueCands[0] ?? ranked[0];
  const activeWrong =
    wrongCands.find((c) => c.id === selectedCandId) ?? wrongCands[0] ?? ranked[ranked.length - 1];
  const loss = marginRankingLoss(primaryTrue.distance, activeWrong.distance, gamma);

  const subjColor = t.accentSecondary;
  const relColor = t.accentPurple;
  const trueColor = t.accentPrimary;
  const wrongColor = t.accentDanger;
  const marginColor = t.accentTeal;

  const selectScenario = (id: TransEScenarioId) => {
    const next = TRANSE_SCENARIOS.find((s) => s.id === id) ?? TRANSE_SCENARIOS[0];
    setScenarioId(id);
    setRelX(next.relationVec[0]);
    setRelY(next.relationVec[1]);
    setSelectedCandId(next.initialCandidates.find((c) => !c.isTrue)?.id ?? next.initialCandidates[0].id);
    playback.setStep(0);
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
    borderRadius: 6,
    background: t.background,
    color: t.textPrimary,
  };

  const renderSpacePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 38;
    const plotW = panelW - 64;
    const plotH = 196;
    const xMax = 2.8;
    const yMax = 2.2;

    const px = (x: number) => plotX + (x / xMax) * plotW;
    const py = (y: number) => plotY + plotH - (y / yMax) * plotH;
    const origin: [number, number] = [px(0), py(0)];
    const subjPt: [number, number] = [px(scenario.subjectVec[0]), py(scenario.subjectVec[1])];
    const predPt: [number, number] = [px(predicted[0]), py(predicted[1])];

    const marginRadiusX = ((primaryTrue.distance + gamma) / xMax) * plotW;
    const marginRadiusY = ((primaryTrue.distance + gamma) / yMax) * plotH;

    // Non-overlapping vertical label offset when candidates sit close together
    const placedLabels: { id: string; cx: number; cy: number; dy: number; flipLeft: boolean }[] = [];
    for (let idx = 0; idx < ranked.length; idx++) {
      const c = ranked[idx];
      const cx = px(c.vec[0]);
      const cy = py(c.vec[1]);
      let dy = -12;
      for (const prev of placedLabels) {
        if (Math.abs(prev.cx - cx) < 75 && Math.abs(prev.cy + prev.dy - (cy + dy)) < 18) {
          dy = prev.dy < 0 ? 19 : -28;
        }
      }
      const flipLeft = cx > plotX + plotW - 72;
      placedLabels.push({ id: c.id, cx, cy, dy, flipLeft });
    }

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2D embedding translation: h + r ≈ t (Step {frame.step})
        </text>
        <defs>
          <clipPath id={`${clipSpaceId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, 1, 2].map((xt) => (
          <g key={`xt-${xt}`}>
            <line x1={px(xt)} y1={plotY + plotH} x2={px(xt)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(xt)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}
        {[0, 1, 2].map((yt) => (
          <g key={`yt-${yt}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipSpaceId}-${offsetX})`}>
          {/* Margin boundary around predicted h+r */}
          {metric === 'l2' ? (
            <ellipse
              cx={predPt[0]}
              cy={predPt[1]}
              rx={Math.max(4, marginRadiusX)}
              ry={Math.max(4, marginRadiusY)}
              fill={marginColor}
              fillOpacity={0.07}
              stroke={marginColor}
              strokeWidth={1.3}
              strokeDasharray="4 3"
            />
          ) : (
            <polygon
              points={`${predPt[0]},${predPt[1] - marginRadiusY} ${predPt[0] + marginRadiusX},${predPt[1]} ${predPt[0]},${predPt[1] + marginRadiusY} ${predPt[0] - marginRadiusX},${predPt[1]}`}
              fill={marginColor}
              fillOpacity={0.07}
              stroke={marginColor}
              strokeWidth={1.3}
              strokeDasharray="4 3"
            />
          )}

          {/* Subject h and Relation r arrows */}
          <SketchArrow points={[origin, subjPt]} color={subjColor} strokeWidth={2.4} roughness={0.8} id={`te-h-${offsetX}`} />
          <SketchArrow points={[subjPt, predPt]} color={relColor} strokeWidth={2.4} roughness={0.8} id={`te-r-${offsetX}`} />

          {/* Distance lines from h+r to each candidate */}
          {ranked.map((c) => (
            <line
              key={`dist-${c.id}`}
              x1={predPt[0]}
              y1={predPt[1]}
              x2={px(c.vec[0])}
              y2={py(c.vec[1])}
              stroke={c.isTrue ? trueColor : c.id === activeWrong.id ? wrongColor : t.border}
              strokeWidth={c.isTrue || c.id === activeWrong.id ? 1.8 : 1.1}
              strokeDasharray="4 3"
            />
          ))}

          {/* Target h+r marker */}
          <path
            d={`M${predPt[0]} ${predPt[1] - 7} L${predPt[0] + 7} ${predPt[1]} L${predPt[0]} ${predPt[1] + 7} L${predPt[0] - 7} ${predPt[1]} Z`}
            fill={t.textPrimary}
          />

          {/* Candidate points */}
          {ranked.map((c) => {
            const cx = px(c.vec[0]);
            const cy = py(c.vec[1]);
            const isSel = c.id === activeWrong.id || c.isTrue;
            const col = c.isTrue ? trueColor : wrongColor;
            return (
              <g
                key={`pt-${c.id}`}
                onClick={() => {
                  if (!c.isTrue) setSelectedCandId(c.id);
                }}
                style={{ cursor: c.isTrue ? 'default' : 'pointer' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSel ? 6.5 : 5}
                  fill={col}
                  stroke={t.background}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </g>

        {/* Clean non-overlapping labels */}
        <text x={Math.max(plotX + 6, subjPt[0] - 6)} y={Math.max(plotY + 14, subjPt[1] - 10)} textAnchor="end" fontSize={14} fontWeight={700} fill={subjColor}>
          h: {scenario.subjectLabel}
        </text>
        <text
          x={subjPt[0] * 0.65 + predPt[0] * 0.35}
          y={Math.min(plotY + plotH - 12, subjPt[1] * 0.65 + predPt[1] * 0.35 + 20)}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={relColor}
          stroke={t.background} strokeWidth={4} paintOrder="stroke"
        >
          r: {scenario.relationLabel}
        </text>
        <text
          x={predPt[0]}
          y={Math.max(plotY + 14, predPt[1] - 14)}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={t.textPrimary}
          stroke={t.background} strokeWidth={4} paintOrder="stroke"
        >
          h + r
        </text>
        {placedLabels.map((lbl, idx) => {
          const cand = ranked[idx];
          const col = cand.isTrue ? trueColor : wrongColor;
          return (
            <text
              key={`clbl-${lbl.id}`}
              x={lbl.flipLeft ? lbl.cx - 9 : lbl.cx + 9}
              y={Math.max(plotY + 14, Math.min(plotY + plotH - 6, lbl.cy + lbl.dy))}
              textAnchor={lbl.flipLeft ? 'end' : 'start'}
              fontSize={14}
              fontWeight={cand.isTrue || cand.id === activeWrong.id ? 700 : 500}
              fill={col}
          stroke={t.background} strokeWidth={4} paintOrder="stroke"
            >
              {cand.name.replace(' (true)', '')}
            </text>
          );
        })}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Embedding dim 1 (dashed ring = d₊ + margin γ)
        </text>
      </g>
    );
  };

  const renderRankPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const barMax = Math.max(70, panelW - 150);
    const maxDist = Math.max(1.4, ...ranked.map((r) => r.distance));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Candidate distance ({metric.toUpperCase()} — lower wins)
        </text>
        <defs>
          <clipPath id={`${clipRankId}-${offsetX}`}>
            <rect x={plotX} y={32} width={panelW - 24} height={240} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipRankId}-${offsetX})`}>
          {ranked.map((c, idx) => {
            const y = 46 + idx * 44;
            const col = c.isTrue ? trueColor : wrongColor;
            const bw = Math.max(4, Math.min(barMax, (c.distance / maxDist) * barMax));
            return (
              <g
                key={`rk-${c.id}`}
                transform={`translate(0, ${y})`}
                onClick={() => {
                  if (!c.isTrue) setSelectedCandId(c.id);
                }}
                style={{ cursor: c.isTrue ? 'default' : 'pointer' }}
              >
                <text x={plotX} y={14} fontSize={14} fontWeight={700} fill={col}>
                  #{c.rank} {c.name}
                </text>
                <rect x={plotX} y={20} width={barMax} height={16} rx={4} fill={t.surfaceAlt} />
                <rect x={plotX} y={20} width={bw} height={16} rx={4} fill={col} fillOpacity={0.85} />
                <text x={plotX + barMax + 8} y={33} fontSize={14} fontWeight={700} fill={col}>
                  {c.distance.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Margin ranking loss bar */}
          <text x={plotX} y={194} fontSize={14} fontWeight={700} fill={loss > 0.001 ? wrongColor : trueColor}>
            Margin loss L = max(0, {gamma.toFixed(2)} + {primaryTrue.distance.toFixed(2)} − {activeWrong.distance.toFixed(2)})
          </text>
          <rect x={plotX} y={204} width={barMax} height={18} rx={4} fill={t.surfaceAlt} />
          <rect
            x={plotX}
            y={204}
            width={loss > 0.001 ? Math.max(4, Math.min(barMax, (loss / 1.5) * barMax)) : 0}
            height={18}
            rx={4}
            fill={wrongColor}
            fillOpacity={0.85}
          />
          <text x={plotX + barMax + 8} y={218} fontSize={15} fontWeight={700} fill={loss > 0.001 ? wrongColor : trueColor}>
            {loss.toFixed(2)}
          </text>
          <text x={plotX} y={244} fontSize={14} fill={t.textSecondary}>
            {loss > 0.001
              ? `Violation! Needs wrong candidate ≥ ${(primaryTrue.distance + gamma).toFixed(2)}`
              : `Satisfied: wrong ≥ true + γ (${activeWrong.distance.toFixed(2)} ≥ ${(primaryTrue.distance + gamma).toFixed(2)})`}
          </text>
        </g>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How knowledge graphs turn facts into vector arrows"
            description="TransE embeds every entity (head h, tail t) and relation r as vectors so that h + r lands close to the true tail t. Training uses margin ranking loss to pull true tails toward h + r while pushing wrong guesses outside margin γ."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: -8 }}>
              <PillSelect<TransEScenarioId>
                label="Knowledge triple (subject · relation → ?)"
                value={scenarioId}
                onChange={selectScenario}
                options={TRANSE_SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
              />
              <PillSelect<TransEMetric>
                label="Distance metric (L2 vs. L1)"
                value={metric}
                onChange={(m) => setMetric(m)}
                options={[
                  { value: 'l2', label: 'L2 (Euclidean)' },
                  { value: 'l1', label: 'L1 (Manhattan)' },
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>
                Step →
              </VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, alignItems: 'end', marginTop: 6 }}>
            <Slider
              label="Margin γ (required gap)"
              value={gamma}
              onChange={(v) => setGamma(v)}
              min={0.1}
              max={1.4}
              step={0.1}
              format={(v) => v.toFixed(1)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Relation step r₁ (x)</span>
              <input
                aria-label="Relation step r1"
                type="number"
                min={-1.5}
                max={2.0}
                step={0.1}
                value={relX}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setRelX(Math.max(-1.5, Math.min(2.0, Number(val.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Relation step r₂ (y)</span>
              <input
                aria-label="Relation step r2"
                type="number"
                min={-1.5}
                max={2.0}
                step={0.1}
                value={relY}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setRelY(Math.max(-1.5, Math.min(2.0, Number(val.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: subjColor, verticalAlign: 'middle', marginRight: 6 }} />
          Subject h ({scenario.subjectLabel})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: relColor, verticalAlign: 'middle', marginRight: 6 }} />
          Relation r ({scenario.relationLabel})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: trueColor, borderRadius: 6, verticalAlign: 'middle', marginRight: 6 }} />
          True object t
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: wrongColor, borderRadius: 6, verticalAlign: 'middle', marginRight: 6 }} />
          Wrong candidate t′
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`TransE step ${frame.step}: ${scenario.subjectLabel} + ${scenario.relationLabel} lands at (${predicted[0].toFixed(2)}, ${predicted[1].toFixed(2)}), closest candidate is ${ranked[0].name}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderSpacePanel(0, 424)}
            {renderRankPanel(438, 322)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 280" role="img" aria-label="TransE vector space" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSpacePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 256" role="img" aria-label="Candidate distances and margin loss" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRankPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={`TransE score (${metric.toUpperCase()})`}
            latex={metric === 'l2' ? 'd_2(h,r,t) = \\lVert \\mathbf{h} + \\mathbf{r} - \\mathbf{t} \\rVert_2' : 'd_1(h,r,t) = \\sum_i |h_i + r_i - t_i|'}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              #1 {ranked[0].name}: {ranked[0].distance.toFixed(2)} · Margin loss: <strong>{loss.toFixed(2)}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${frames.length}`} color="blue" tilt={1} live>
            <p>{frame.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="L2 Euclidean score"
              latex={'d_2(h,r,t) = \\lVert \\mathbf{h} + \\mathbf{r} - \\mathbf{t} \\rVert_2'}
              color="yellow"
              tilt={-1}
              active={metric === 'l2'}
              onSelect={() => setMetric('l2')}
            >
              <p style={{ textAlign: 'center' }}>Straight-line distance from h + r to candidate t; smaller means more plausible.</p>
            </StickyNote>
            <StickyNote
              title="L1 Manhattan score"
              latex={'d_1(h,r,t) = \\sum_i |h_i + r_i - t_i|'}
              color="pink"
              tilt={1}
              active={metric === 'l1'}
              onSelect={() => setMetric('l1')}
            >
              <p style={{ textAlign: 'center' }}>Sum of axis-by-axis gaps; equally valid distance option from the TransE paper.</p>
            </StickyNote>
            <StickyNote
              title="Margin ranking loss"
              latex={'\\mathcal{L} = \\max(0,\\; \\gamma + d_+ - d_-)'}
              color="orange"
              tilt={-1}
            >
              <p style={{ textAlign: 'center' }}>Zero once wrong candidate d₋ sits at least margin γ farther than true d₊.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Step ${frame.step} (${metric.toUpperCase()})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                h + r = ({scenario.subjectVec[0].toFixed(2)}, {scenario.subjectVec[1].toFixed(2)}) + ({relationVec[0].toFixed(2)}, {relationVec[1].toFixed(2)}) = <strong>({predicted[0].toFixed(2)}, {predicted[1].toFixed(2)})</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                d₊({primaryTrue.name.replace(' (true)', '')}) = <strong>{primaryTrue.distance.toFixed(2)}</strong> · d₋({activeWrong.name}) = <strong>{activeWrong.distance.toFixed(2)}</strong> · Loss = <strong>{loss.toFixed(2)}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${frames.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{frame.explain}</p>
            </StickyNote>
          </StickyRow>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>Curie won TWO Nobel prizes (Physics and Chemistry). In a 1-to-many relation (Curie, won_prize, ?), what happens as TransE trains h + r ≈ t on both true objects?</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 1;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: `1px solid ${revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border}`,
                      background: revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      font: 'inherit',
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
              <span role="status" style={{ fontSize: 15, color: prediction === 1 ? t.accentPrimary : t.accentWarn }}>
                {prediction === 1 ? 'Correct — ' : 'Watch — '}
                a single vector h + r points to one spot, so training forces Physics and Chemistry to collapse right on top of each other.{' '}
                <button
                  type="button"
                  onClick={() => {
                    selectScenario('one-to-many');
                    playback.setStep(frames.length - 1);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    font: 'inherit',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Test 1-to-many collapse now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function TransEDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="TransE knowledge graph embedding playground"
      footer="Exact 2D vector addition (h + r), L1/L2 distances, and margin-ranking gradient steps (Bordes et al., NeurIPS 2013)."
    >
      <TransEPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
