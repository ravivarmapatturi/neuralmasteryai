import { useId, useMemo, useState } from 'react';
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
  ACTION_ARROWS,
  ACTION_NAMES,
  CLIFF_GOAL_POS,
  CLIFF_GRID_COLS,
  CLIFF_GRID_ROWS,
  CLIFF_START_POS,
  computeTdStep,
  isCliffCell,
  simulateCliffTraining,
  stateIndex,
  stepCliffEnv,
  type CliffAction,
  type CliffAlgo,
} from '../lib/cliffWalking';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Stays high up on the safe top row',
  'Drops down to hug the cliff edge like Q-learning',
  'Never reaches the goal G',
] as const;

function offsetPolyline(
  path: readonly [number, number][],
  dx: number,
  dy: number,
  cellW: number,
  cellH: number,
  x0: number,
  y0: number,
): string {
  return path
    .map(([r, c]) => `${x0 + c * cellW + cellW / 2 + dx},${y0 + r * cellH + cellH / 2 + dy}`)
    .join(' ');
}

function bestActionForCell(row: readonly number[]): CliffAction {
  let best: CliffAction = 0;
  for (let a = 1; a < 4; a++) {
    if (row[a] > row[best]) best = a as CliffAction;
  }
  return best;
}

function QLearningVsSarsaCliffPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [algo, setAlgo] = useState<CliffAlgo>('sarsa');
  const [epsilon, setEpsilon] = useState<number>(0.1);
  const [alpha, setAlpha] = useState<number>(0.5);
  const [episodes, setEpisodes] = useState<number>(300);
  const [inspectedCell, setInspectedCell] = useState<readonly [number, number]>([2, 2]);
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateCliffTraining({ episodes, alpha, epsilon, seed: 11 }),
    [episodes, alpha, epsilon],
  );

  const playback = useStepPlayback(
    sim.checkpoints.length,
    2200,
    Math.max(0, sim.checkpoints.length - 1),
    outerVisible,
  );
  const checkpoint = sim.checkpoints[playback.step] ?? sim.checkpoints[sim.checkpoints.length - 1];

  const qColor = t.accentDanger;
  const sColor = t.accentPrimary;
  const inspectColor = t.accentSecondary;

  const activeTable = algo === 'qlearning' ? checkpoint.qTable : checkpoint.sTable;
  const [ir, ic] = inspectedCell;
  const sIdx = stateIndex(ir, ic);
  const cellQ = activeTable[sIdx] ?? [0, 0, 0, 0];
  const greedyAct = bestActionForCell(cellQ);
  const stepProbe = stepCliffEnv(ir, ic, greedyAct);
  const nextRow = activeTable[stateIndex(stepProbe.r, stepProbe.c)] ?? [0, 0, 0, 0];
  // Illustrate the TD target when the next exploratory move steps Down toward the cliff if adjacent
  const demoActualNext: CliffAction = ir === 2 && ic >= 1 && ic <= 10 ? 2 : bestActionForCell(nextRow);
  const tdWorked = computeTdStep(
    algo,
    cellQ[greedyAct],
    stepProbe.reward,
    1.0,
    nextRow,
    demoActualNext,
    sim.alpha,
  );

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

  const renderGridSvg = (panelW: number) => {
    const x0 = panelW > 500 ? 52 : 11;
    const y0 = 32;
    const cellW = Math.floor((panelW - x0 * 2) / CLIFF_GRID_COLS);
    const cellH = panelW > 500 ? 38 : 34;
    const gridW = cellW * CLIFF_GRID_COLS;
    const gridH = cellH * CLIFF_GRID_ROWS;

    const qPts = offsetPolyline(checkpoint.qPath, -3, -3, cellW, cellH, x0, y0);
    const sPts = offsetPolyline(checkpoint.sPath, 3, 3, cellW, cellH, x0, y0);

    return (
      <g>
        <text x={panelW / 2} y={19} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          4×12 Cliff Walking grid (Episode {checkpoint.episode} of {sim.episodes})
        </text>
        {Array.from({ length: CLIFF_GRID_ROWS }, (_, r) =>
          Array.from({ length: CLIFF_GRID_COLS }, (_, c) => {
            const cliff = isCliffCell(r, c);
            const isStart = r === CLIFF_START_POS[0] && c === CLIFF_START_POS[1];
            const isGoal = r === CLIFF_GOAL_POS[0] && c === CLIFF_GOAL_POS[1];
            const isInspected = r === ir && c === ic && !cliff;
            const cx = x0 + c * cellW;
            const cy = y0 + r * cellH;
            const row = activeTable[stateIndex(r, c)] ?? [0, 0, 0, 0];
            const act = bestActionForCell(row);
            const hasLearned = row.some((v) => Math.abs(v) > 1e-4);

            return (
              <g
                key={`${r}-${c}`}
                onClick={() => {
                  if (!cliff) setInspectedCell([r, c]);
                }}
                style={{ cursor: cliff ? 'default' : 'pointer' }}
              >
                <rect
                  x={cx}
                  y={cy}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={4}
                  fill={cliff ? qColor : isStart || isGoal ? t.surfaceAlt : t.background}
                  fillOpacity={cliff ? 0.22 : 1}
                  stroke={isInspected ? inspectColor : t.border}
                  strokeWidth={isInspected ? 2.4 : 1}
                />
                {isStart && (
                  <text x={cx + cellW / 2 - 1} y={cy + cellH / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
                    S
                  </text>
                )}
                {isGoal && (
                  <text x={cx + cellW / 2 - 1} y={cy + cellH / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={sColor}>
                    G
                  </text>
                )}
                {!cliff && !isStart && !isGoal && hasLearned && (
                  <text
                    x={cx + cellW / 2 - 1}
                    y={cy + cellH / 2 + 4}
                    textAnchor="middle"
                    fontSize={14}
                    fill={isInspected ? inspectColor : t.textMuted}
                    opacity={0.7}
                  >
                    {ACTION_ARROWS[act]}
                  </text>
                )}
              </g>
            );
          }),
        )}

        <text
          x={x0 + 6 * cellW}
          y={y0 + 3 * cellH + cellH / 2 + 4}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={qColor}
        >
          Cliff (−100, back to S)
        </text>

        <polyline
          points={qPts}
          fill="none"
          stroke={qColor}
          strokeWidth={algo === 'qlearning' ? 3.5 : 2.2}
          strokeOpacity={algo === 'qlearning' ? 1 : 0.65}
          strokeLinejoin="round"
        />
        <polyline
          points={sPts}
          fill="none"
          stroke={sColor}
          strokeWidth={algo === 'sarsa' ? 3.5 : 2.2}
          strokeOpacity={algo === 'sarsa' ? 1 : 0.65}
          strokeLinejoin="round"
        />

        {checkpoint.qPath.map(([r, c], i) => (
          <circle
            key={`qp-${i}`}
            cx={x0 + c * cellW + cellW / 2 - 3}
            cy={y0 + r * cellH + cellH / 2 - 3}
            r={algo === 'qlearning' ? 4 : 3}
            fill={qColor}
            opacity={algo === 'qlearning' ? 1 : 0.7}
          />
        ))}
        {checkpoint.sPath.map(([r, c], i) => (
          <circle
            key={`sp-${i}`}
            cx={x0 + c * cellW + cellW / 2 + 3}
            cy={y0 + r * cellH + cellH / 2 + 3}
            r={algo === 'sarsa' ? 4 : 3}
            fill={sColor}
            opacity={algo === 'sarsa' ? 1 : 0.7}
          />
        ))}

        <text x={x0 + gridW / 2} y={y0 + gridH + 18} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click any square to inspect Q(s, a) — inspecting ({ir}, {ic})
        </text>
      </g>
    );
  };

  const renderCurveSvg = (panelW: number, panelH: number, yOffset = 0) => {
    const plotX = 56;
    const plotY = yOffset + 34;
    const plotW = panelW - 76;
    const plotH = panelH - 72;
    const minY = -120;
    const maxY = 0;

    const px = (ep: number) => plotX + ((ep - 1) / Math.max(1, sim.episodes - 1)) * plotW;
    const py = (ret: number) => plotY + ((maxY - Math.max(minY, Math.min(maxY, ret))) / (maxY - minY)) * plotH;

    const visiblePts = sim.curve.filter((pt) => pt.episode <= checkpoint.episode);
    const qCurvePts = visiblePts.map((pt) => `${px(pt.episode)},${py(pt.qSmooth)}`).join(' ');
    const sCurvePts = visiblePts.map((pt) => `${px(pt.episode)},${py(pt.sSmooth)}`).join(' ');
    const curX = px(checkpoint.episode);

    return (
      <g>
        <text x={panelW / 2} y={yOffset + 18} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Training episode reward (20-episode average — higher is safer)
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${panelW}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[-100, -50, -13].map((val) => {
          const ty = py(val);
          return (
            <g key={`yt-${val}`}>
              <line x1={plotX - 4} y1={ty} x2={plotX} y2={ty} stroke={t.border} />
              <line x1={plotX} y1={ty} x2={plotX + plotW} y2={ty} stroke={t.border} strokeDasharray="3 3" opacity={0.4} />
              <text x={plotX - 8} y={ty + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
                {val}
              </text>
            </g>
          );
        })}

        {[1, Math.round(sim.episodes / 2), sim.episodes].map((epTick) => (
          <g key={`xt-${epTick}`}>
            <line x1={px(epTick)} y1={plotY + plotH} x2={px(epTick)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(epTick)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              ep {epTick}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${panelW})`}>
          {visiblePts.length > 1 && (
            <>
              <polyline points={qCurvePts} fill="none" stroke={qColor} strokeWidth={2.2} />
              <polyline points={sCurvePts} fill="none" stroke={sColor} strokeWidth={2.4} />
            </>
          )}
          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={inspectColor} strokeWidth={1.4} strokeDasharray="4 3" />
          <circle cx={curX} cy={py(checkpoint.qTrainAvg)} r={4.5} fill={qColor} stroke={t.background} strokeWidth={1.5} />
          <circle cx={curX} cy={py(checkpoint.sTrainAvg)} r={4.5} fill={sColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text x={plotX + 8} y={plotY + 14} textAnchor="start" fontSize={14} fill={t.textMuted}>
          −13 best greedy return
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
            title="Safe path vs. shortest path: why SARSA avoids the cliff"
            description="An agent learns by trial and error to walk from Start (S) to Goal (G) while avoiding a −100 cliff. When exploration ε > 0 causes random slips during training, Q-learning ignores those slips (grading squares by their best possible move), whereas SARSA prices in the actual exploratory moves it takes."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<CliffAlgo>
                label="Update rule (how it learns from the next square)"
                value={algo}
                onChange={(v) => setAlgo(v)}
                options={[
                  { value: 'sarsa', label: 'SARSA (on-policy, actual move)' },
                  { value: 'qlearning', label: 'Q-learning (off-policy, max move)' },
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, alignItems: 'end', marginTop: 6 }}>
            <Slider
              label="Exploration chance ε (random move rate)"
              value={epsilon}
              onChange={(v) => setEpsilon(v)}
              min={0}
              max={0.3}
              step={0.02}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Exact exploration ε (0.00–0.35)</span>
              <input
                aria-label="Exact exploration epsilon"
                type="number"
                min={0}
                max={0.35}
                step={0.02}
                value={epsilon}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setEpsilon(Math.max(0, Math.min(0.35, Number(val.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Learning step α (0.05–1.0)</span>
              <input
                aria-label="Learning step alpha"
                type="number"
                min={0.05}
                max={1.0}
                step={0.05}
                value={alpha}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setAlpha(Math.max(0.05, Math.min(1.0, Number(val.toFixed(2)))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Training episodes (20–500)</span>
              <input
                aria-label="Training episodes"
                type="number"
                min={20}
                max={500}
                step={20}
                value={episodes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) return;
                  setEpisodes(Math.max(20, Math.min(500, Math.round(val))));
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: sColor, verticalAlign: 'middle', marginRight: 6 }} />
          SARSA path ({checkpoint.sReachedGoal ? `${checkpoint.sPath.length - 1} steps` : 'learning'})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: qColor, verticalAlign: 'middle', marginRight: 6 }} />
          Q-learning path ({checkpoint.qReachedGoal ? `${checkpoint.qPath.length - 1} steps` : 'learning'})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: inspectColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Inspected square ({ir}, {ic})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 398"
            role="img"
            aria-label={`At episode ${checkpoint.episode}: Q-learning greedy path takes ${checkpoint.qPath.length - 1} steps, SARSA takes ${checkpoint.sPath.length - 1} steps`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGridSvg(760)}
            {renderCurveSvg(760, 178, 220)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 198" role="img" aria-label="Cliff walking grid" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGridSvg(370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 192" role="img" aria-label="Episode training reward curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurveSvg(370, 192, 0)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={algo === 'qlearning' ? 'Q-learning (off-policy)' : 'SARSA (on-policy)'}
            latex={
              algo === 'qlearning'
                ? "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[r + \\gamma \\max_{a'} Q(s',a') - Q(s,a)]"
                : "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[r + \\gamma\\, Q(s',a') - Q(s,a)]"
            }
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Q-learn: {checkpoint.qPath.length - 1} steps ({checkpoint.qFallsTotal} falls) · SARSA: {checkpoint.sPath.length - 1} steps ({checkpoint.sFallsTotal} falls)
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.checkpoints.length}`} color="blue" tilt={1} live>
            <p>{checkpoint.caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Q-learning · uses best next move"
              latex={"Q(s,a) \\leftarrow Q(s,a) + \\alpha\\big[r + \\gamma \\max_{a'} Q(s',a') - Q(s,a)\\big]"}
              color="pink"
              tilt={-1}
              active={algo === 'qlearning'}
              onSelect={() => setAlgo('qlearning')}
            >
              <p style={{ textAlign: 'center' }}>
                Grades a square assuming zero future slips (max over next actions), so hugging the cliff looks optimal.
              </p>
            </StickyNote>
            <StickyNote
              title="SARSA · uses actual next move"
              latex={"Q(s,a) \\leftarrow Q(s,a) + \\alpha\\big[r + \\gamma\\, Q(s',a') - Q(s,a)\\big]"}
              color="yellow"
              tilt={1}
              active={algo === 'sarsa'}
              onSelect={() => setAlgo('sarsa')}
            >
              <p style={{ textAlign: 'center' }}>
                Updates using the move a′ actually chosen under ε-greedy exploration, pushing the path away from danger.
              </p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Square (${ir}, ${ic}) at ep ${checkpoint.episode}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Greedy path: Q-learning <strong>{checkpoint.qPath.length - 1} steps</strong> ({checkpoint.qGreedyReward}) vs. SARSA <strong>{checkpoint.sPath.length - 1} steps</strong> ({checkpoint.sGreedyReward})
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Training avg reward: SARSA <strong>{checkpoint.sTrainAvg.toFixed(1)}</strong> ({checkpoint.sFallsTotal} falls) vs. Q-learning <strong>{checkpoint.qTrainAvg.toFixed(1)}</strong> ({checkpoint.qFallsTotal} falls)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                At ({ir}, {ic}): Up {cellQ[0].toFixed(1)} · Right {cellQ[1].toFixed(1)} · Down {cellQ[2].toFixed(1)} · Left {cellQ[3].toFixed(1)} → next {ACTION_NAMES[greedyAct]} target {tdWorked.tdTarget.toFixed(1)}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.checkpoints.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{checkpoint.caption}</p>
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
            <span>If you turn random exploration ε all the way down to 0.00 during training, what happens to SARSA’s path?</span>
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
                with ε = 0.00, SARSA’s actual next move a′ equals the greedy max move, so both update rules learn the exact same 13-step cliff-edge path.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAlgo('sarsa');
                    setEpsilon(0);
                    setEpisodes(300);
                    playback.setStep(sim.checkpoints.length - 1);
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
                  Run ε = 0.00 now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function QLearningVsSarsaCliffDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Q-learning vs. SARSA Cliff Walking playground"
      footer="Real tabular ε-greedy training on the classic 4×12 Cliff Walking grid (Sutton & Barto Example 6.6). Every normal step gives −1; stepping into the cliff gives −100 and resets to Start S."
    >
      <QLearningVsSarsaCliffPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
