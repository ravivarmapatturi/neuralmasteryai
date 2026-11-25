import { useId, useMemo, useState } from 'react';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
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
  buildToySearchSteps,
  computeIndexScanComparison,
  TOY_BTREE_BRANCHES,
  TOY_BTREE_ROOT_KEYS,
} from '../lib/indexScan';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const SELECTIVITY_PRESETS = [
  { value: 0, label: '1 row (unique ID)' },
  { value: 5, label: '5% match' },
  { value: 40, label: '40% match' },
] as const;

const PREDICT_OPTIONS = [
  'B-tree index (always faster)',
  'Sequential full scan',
  'Exact tie',
] as const;

function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return '1M';
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function IndexScanPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [tableRows, setTableRows] = useState(100_000);
  const [selectivityPct, setSelectivityPct] = useState(0);
  const [targetId, setTargetId] = useState(14);
  const [prediction, setPrediction] = useState<number | null>(null);

  const toySteps = useMemo(() => buildToySearchSteps(targetId), [targetId]);
  const playback = useStepPlayback(toySteps.length, 1900, 3, outerVisible);
  const activeTrace = toySteps[playback.step] ?? toySteps[0];

  const stats = useMemo(
    () => computeIndexScanComparison(tableRows, selectivityPct),
    [tableRows, selectivityPct],
  );

  const scanColor = t.accentDanger;
  const btreeColor = t.accentSecondary;
  const hitColor = t.accentPrimary;

  const logRows = Math.log10(stats.tableRows);

  const updateTableRows = (nextRows: number) => {
    const safe = Math.max(10, Math.min(1_000_000, Math.round(Number.isFinite(nextRows) ? nextRows : 10)));
    setTableRows(safe);
  };

  const curvePoints = useMemo(() => Array.from({ length: 50 }, (_, i) => 1 + (i / 49) * 5), []);

  const renderRacePanel = (offsetX: number) => {
    const x0 = offsetX + 12;
    const cellW = 20;
    const cellGap = 1.5;
    const activeBranchIdx = activeTrace.activeBranchIdx;

    return (
      <g>
        <text x={offsetX + 185} y={18} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Search race on 16 sorted rows (find id = {targetId})
        </text>

        <text x={x0} y={44} fontSize={14} fontWeight={700} fill={scanColor}>
          Full scan checks row by row ({activeTrace.scanVisitedCount} checked)
        </text>
        {Array.from({ length: 16 }, (_, idx) => {
          const id = idx + 1;
          const cx = x0 + idx * (cellW + cellGap);
          const visited = id <= activeTrace.scanVisitedCount;
          const hit = visited && id === targetId && activeTrace.stage === 'found';
          return (
            <g
              key={`row-${id}`}
              onClick={() => {
                setTargetId(id);
                playback.setStep(3);
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={cx}
                y={52}
                width={cellW}
                height={24}
                rx={3}
                fill={hit ? hitColor : visited ? scanColor : t.surfaceAlt}
                fillOpacity={hit || visited ? 0.85 : 1}
              />
              <text
                x={cx + cellW / 2}
                y={69}
                textAnchor="middle"
                fontSize={14}
                fontWeight={id === targetId ? 700 : 400}
                fill={hit || visited ? t.background : t.textPrimary}
              >
                {id}
              </text>
            </g>
          );
        })}

        <text x={x0} y={102} fontSize={14} fontWeight={700} fill={btreeColor}>
          B-tree jumps down 3 levels ({activeTrace.btreeHops} hop{activeTrace.btreeHops === 1 ? '' : 's'})
        </text>

        <SketchRect
          x={offsetX + 100}
          y={112}
          width={170}
          height={30}
          color={activeTrace.btreeHops >= 1 ? btreeColor : t.border}
          fillColor={activeTrace.btreeHops >= 1 ? `${btreeColor}18` : undefined}
          strokeWidth={activeTrace.btreeHops >= 1 ? 2.2 : 1.4}
          id={`bt-root-${offsetX}`}
        />
        <text x={offsetX + 185} y={132} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
          Root keys: [{TOY_BTREE_ROOT_KEYS.join(' | ')}]
        </text>

        {TOY_BTREE_BRANCHES.map((br, bIdx) => {
          const bx = offsetX + 10 + bIdx * 90;
          const by = 168;
          const bw = 80;
          const active = activeBranchIdx === bIdx && activeTrace.btreeHops >= 1;
          const dimmed = activeBranchIdx !== null && activeBranchIdx !== bIdx && activeTrace.btreeHops >= 1;
          return (
            <g key={`br-${br.id}`} opacity={dimmed ? 0.35 : 1}>
              <SketchArrow
                points={[
                  [offsetX + 125 + bIdx * 40, 142],
                  [bx + bw / 2, by - 2],
                ]}
                color={active ? btreeColor : t.textMuted}
                strokeWidth={active ? 2.2 : 1.2}
                roughness={0.8}
                id={`bt-edge-${offsetX}-${bIdx}`}
              />
              <SketchRect
                x={bx}
                y={by}
                width={bw}
                height={30}
                color={active ? btreeColor : t.border}
                fillColor={active ? `${btreeColor}18` : undefined}
                strokeWidth={active ? 2.2 : 1.3}
                id={`bt-br-${offsetX}-${bIdx}`}
              />
              <text x={bx + bw / 2} y={by + 20} textAnchor="middle" fontSize={14} fontWeight={active ? 700 : 500} fill={t.textPrimary}>
                {br.label}
              </text>
            </g>
          );
        })}

        {TOY_BTREE_BRANCHES.map((br, bIdx) => {
          const bx = offsetX + 10 + bIdx * 90;
          const active = activeBranchIdx === bIdx && activeTrace.btreeHops >= 2;
          const found = activeTrace.foundLeafId !== null && activeBranchIdx === bIdx;
          const dimmed = activeBranchIdx !== null && activeBranchIdx !== bIdx && activeTrace.btreeHops >= 1;
          return (
            <g key={`lf-${br.id}`} opacity={dimmed ? 0.3 : 1}>
              {active && (
                <SketchArrow
                  points={[
                    [bx + 40, 198],
                    [bx + 40, 218],
                  ]}
                  color={found ? hitColor : btreeColor}
                  strokeWidth={2}
                  roughness={0.7}
                  id={`bt-lf-arrow-${offsetX}-${bIdx}`}
                />
              )}
              <rect
                x={bx}
                y={222}
                width={80}
                height={30}
                rx={5}
                fill={found ? `${hitColor}22` : t.surfaceAlt}
                stroke={found ? hitColor : active ? btreeColor : t.border}
                strokeWidth={found ? 2 : 1.2}
              />
              <text
                x={bx + 40}
                y={242}
                textAnchor="middle"
                fontSize={14}
                fontWeight={found ? 700 : 400}
                fill={found ? hitColor : t.textPrimary}
              >
                {found ? `hit id=${activeTrace.foundLeafId}` : br.leaves.join(',')}
              </text>
            </g>
          );
        })}
        <text x={offsetX + 185} y={272} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click any row number above to move target ID
        </text>
      </g>
    );
  };

  const renderScalePanel = (offsetX: number) => {
    const plotX = offsetX + 52;
    const plotY = 44;
    const plotW = 296;
    const plotH = 166;
    const maxLogOps = 6;

    const px = (lg: number) => plotX + ((lg - 1) / 5) * plotW;
    const py = (ops: number) => plotY + plotH - (Math.log10(Math.max(1, ops)) / maxLogOps) * (plotH - 12);

    const scanPath = curvePoints.map((lg) => `${px(lg)},${py(10 ** lg)}`).join(' ');
    const btreePath = curvePoints.map((lg) => `${px(lg)},${py(Math.max(1, Math.ceil(Math.log2(10 ** lg))))}`).join(' ');
    const curX = px(logRows);
    const scanY = py(stats.scanChecks);
    const btreeY = py(stats.btreeChecks);
    const closeVert = Math.abs(scanY - btreeY) < 22;
    const scanLabelY = closeVert ? scanY - 14 : Math.max(plotY + 14, scanY - 6);
    const btreeLabelY = closeVert ? Math.min(plotY + plotH - 4, btreeY + 14) : Math.min(plotY + plotH - 6, btreeY - 8);

    return (
      <g>
        <text x={offsetX + 185} y={18} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Comparisons from 10 to 1,000,000 rows
        </text>
        <defs>
          <clipPath id={clipCurveId}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[1, 2, 3, 4, 5, 6].map((lg) => (
          <g key={`xt-${lg}`}>
            <line x1={px(lg)} y1={plotY + plotH} x2={px(lg)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(lg)} y={plotY + plotH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {formatCompactCount(10 ** lg)}
            </text>
          </g>
        ))}

        {[1, 100, 10_000, 1_000_000].map((ops) => (
          <g key={`yt-${ops}`}>
            <line x1={plotX - 4} y1={py(ops)} x2={plotX} y2={py(ops)} stroke={t.border} />
            <text x={plotX - 8} y={py(ops) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {formatCompactCount(ops)}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId})`}>
          <polyline points={scanPath} fill="none" stroke={scanColor} strokeWidth={2.4} />
          <polyline points={btreePath} fill="none" stroke={btreeColor} strokeWidth={2.4} />
          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={t.textMuted} strokeWidth={1.2} strokeDasharray="4 3" />
          <circle cx={curX} cy={scanY} r={5} fill={scanColor} stroke={t.background} strokeWidth={1.5} />
          <circle cx={curX} cy={btreeY} r={5} fill={btreeColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text
          x={logRows > 4.2 ? curX - 8 : curX + 8}
          y={scanLabelY}
          textAnchor={logRows > 4.2 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={scanColor}
        >
          scan: {stats.scanChecks.toLocaleString('en-US')}
        </text>
        <text
          x={logRows > 4.2 ? curX - 8 : curX + 8}
          y={btreeLabelY}
          textAnchor={logRows > 4.2 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={btreeColor}
        >
          B-tree: {stats.btreeChecks}
        </text>

        <text x={offsetX + 185} y={248} textAnchor="middle" fontSize={14} fontWeight={700} fill={stats.plannerChoice === 'index' ? hitColor : scanColor}>
          Planner pick: {stats.plannerChoice === 'index' ? 'Use B-tree Index' : 'Use Sequential Full Scan'}
        </text>
        <text x={offsetX + 185} y={268} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          I/O cost: seq {Math.round(stats.seqIoCost).toLocaleString('en-US')} vs. index {Math.round(stats.indexIoCost).toLocaleString('en-US')}
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
            title="Why a B-tree index beats scanning every row (and when it doesn't)"
            description="An index keeps a sorted lookup tree so finding one row among a million takes ~20 checks instead of 1,000,000 — unless the table is tiny or your query matches so many rows that jumping between disk pages costs more than reading straight through."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Query selectivity (how many rows match)"
                value={SELECTIVITY_PRESETS.some((p) => p.value === selectivityPct) ? selectivityPct : -1}
                onChange={(v) => {
                  const val = typeof v === 'function' ? v(selectivityPct) : v;
                  if (val >= 0) setSelectivityPct(val);
                }}
                options={[...SELECTIVITY_PRESETS]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, alignItems: 'end' }}>
            <div>
              <Slider
                label={`Table scale (10^${logRows.toFixed(1)})`}
                value={logRows}
                onChange={(v) => updateTableRows(10 ** v)}
                min={1}
                max={6}
                step={0.1}
                format={(v) => `${Math.round(10 ** v).toLocaleString('en-US')} rows`}
              />
            </div>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact rows n (10–1,000,000)</span>
              <input
                aria-label="Exact rows n"
                type="number"
                min={10}
                max={1_000_000}
                step={100}
                value={stats.tableRows}
                onChange={(e) => updateTableRows(Number(e.target.value))}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 8px', font: 'inherit', fontVariantNumeric: 'tabular-nums', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
              />
            </label>
            <Slider
              label="Rows matching filter (%)"
              value={selectivityPct}
              onChange={(v) => setSelectivityPct(v)}
              min={0}
              max={50}
              step={1}
              format={(v) => (v === 0 ? '1 row' : `${v}%`)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Target ID in 16-row demo (1–16)</span>
              <input
                aria-label="Target ID in 16-row demo"
                type="number"
                min={1}
                max={16}
                step={1}
                value={targetId}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(16, Math.round(Number(e.target.value) || 1)));
                  setTargetId(val);
                  playback.setStep(3);
                }}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 8px', font: 'inherit', fontVariantNumeric: 'tabular-nums', border: `1.5px solid ${t.border}`, borderRadius: 6, background: t.background, color: t.textPrimary }}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span><span style={{ display: 'inline-block', width: 14, height: 4, background: scanColor, verticalAlign: 'middle', marginRight: 6 }} />Full sequential scan O(n)</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 4, background: btreeColor, verticalAlign: 'middle', marginRight: 6 }} />B-tree index O(log₂ n)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: hitColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />Target found / winning plan</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`At ${stats.tableRows.toLocaleString('en-US')} rows: full scan checks ${stats.scanChecks.toLocaleString('en-US')} rows vs B-tree ${stats.btreeChecks} hops; planner selects ${stats.plannerChoice}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderRacePanel(0)}
            {renderScalePanel(390)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 280" role="img" aria-label="16-row search race" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRacePanel(0)}
            </svg>
            <svg width="100%" viewBox="0 0 370 278" role="img" aria-label="O(n) vs O(log n) scaling chart" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderScalePanel(0)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Index lookup vs. full scan" latex={'\\text{B-tree checks}=\\lceil\\log_2 n\\rceil \\ll \\text{scan}=n'} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              n = {stats.tableRows.toLocaleString('en-US')}: {stats.btreeChecks} hops vs {stats.scanChecks.toLocaleString('en-US')} ({Math.round(stats.speedup).toLocaleString('en-US')}× fewer)
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${toySteps.length}`} color="blue" tilt={1} live>
            <p>{activeTrace.caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Full table scan · O(n)"
              latex={'\\text{checks} = n,\\qquad \\text{I/O} = P = \\lceil n/100\\rceil'}
              color="pink"
              tilt={-1}
              active={stats.plannerChoice === 'seq-scan'}
              onSelect={() => setSelectivityPct(40)}
            >
              <p style={{ textAlign: 'center' }}>Streams every page in order (cheap per page, ignores sort).</p>
            </StickyNote>
            <StickyNote
              title="B-tree index lookup · O(log₂ n)"
              latex={'\\text{hops} = \\lceil\\log_2 n\\rceil,\\qquad \\text{I/O} = d + 4P_{\\text{hit}}'}
              color="yellow"
              tilt={1}
              active={stats.plannerChoice === 'index'}
              onSelect={() => setSelectivityPct(0)}
            >
              <p style={{ textAlign: 'center' }}>Skips down d tree levels, then fetches random heap pages (4× seek cost).</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · n = ${stats.tableRows.toLocaleString('en-US')}`} color="green" tilt={-1}>
              <p className="nm-sticky__mono">
                Row checks: <strong>{stats.scanChecks.toLocaleString('en-US')}</strong> scan vs <strong>{stats.btreeChecks}</strong> B-tree ({stats.speedup >= 1000 ? `${(stats.speedup / 1000).toFixed(1)}k×` : `${stats.speedup.toFixed(1)}×`} speedup)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Pages P = {stats.pages.toLocaleString('en-US')} · Matching = {stats.matchingRows.toLocaleString('en-US')} · Index hits ~{Math.round(stats.distinctHeapPages).toLocaleString('en-US')} heap pages
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${toySteps.length} · Planner verdict`} color="blue" tilt={1} live>
              <p>{activeTrace.caption}</p>
              <p style={{ marginTop: 4, color: t.textSecondary }}>{stats.plannerReason}</p>
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
            <span>On a 1,000,000-row table, if a WHERE filter matches 40% of rows (400,000 rows), which plan does the query planner choose?</span>
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
                touching 400,000 scattered rows hits almost all 10,000 pages randomly (~40,003 I/O cost), 4× costlier than reading 10,000 pages straight through.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTableRows(1_000_000);
                    setSelectivityPct(40);
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
                  Test 1,000,000 rows @ 40% now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function IndexScanComparisonDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="B-tree index vs. full table scan playground"
      footer="Row comparisons use exact n vs. ceil(log₂ n). Query-planner I/O cost uses PostgreSQL defaults (seq_page_cost = 1, random_page_cost = 4) and Yao's distinct-pages estimate for 100 rows per page."
    >
      <IndexScanPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
