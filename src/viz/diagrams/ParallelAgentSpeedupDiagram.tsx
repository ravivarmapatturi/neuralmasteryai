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
  AGENT_WORKLOAD_PRESETS,
  buildSpeedupCurve,
  parseTaskDurations,
  scheduleParallelTasks,
} from '../lib/parallelAgentSpeedup';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type SpeedupFormulaTab = 'makespan' | 'amdahl' | 'cost';

const PREDICT_OPTIONS = [
  'Almost twice as fast because workers doubled',
  'Zero speedup — stuck at 22s because of the 20s straggler + 2s merge',
  'Drops down to 2s total',
] as const;

function ParallelAgentSpeedupPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGanttId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [durationsText, setDurationsText] = useState<string>(AGENT_WORKLOAD_PRESETS[0].durationsText);
  const [serialOverheadSec, setSerialOverheadSec] = useState<number>(2);
  const [manualSlots, setManualSlots] = useState<number>(4);
  const [followingTrace, setFollowingTrace] = useState<boolean>(true);
  const [formulaTab, setFormulaTab] = useState<SpeedupFormulaTab>('makespan');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(8, 1750, 3, outerVisible);
  const slots = followingTrace ? playback.step + 1 : manualSlots;

  const durations = useMemo(() => parseTaskDurations(durationsText), [durationsText]);
  const schedule = useMemo(
    () => scheduleParallelTasks(durations, slots, serialOverheadSec),
    [durations, slots, serialOverheadSec],
  );
  const curve = useMemo(
    () => buildSpeedupCurve(durations, serialOverheadSec, 8),
    [durations, serialOverheadSec],
  );

  const serialColor = t.accentPurple;
  const seqColor = t.accentSecondary;
  const parallelColor = t.accentPrimary;
  const stragglerColor = t.accentDanger;

  const takeSlotControl = (nextSlots: number) => {
    setFollowingTrace(false);
    playback.stop();
    setManualSlots(Math.max(1, Math.min(8, Math.round(nextSlots))));
  };

  const activePreset =
    AGENT_WORKLOAD_PRESETS.find(
      (p) => p.durationsText === durationsText && p.serialOverheadSec === serialOverheadSec,
    )?.id ?? 'custom';

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

  const renderGanttPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 64;
    const plotW = panelW - 82;
    const maxSec = Math.max(1, schedule.sequentialTotalSec);
    const sx = (sec: number) => plotX + (sec / maxSec) * plotW;
    const sw = (sec: number) => Math.max(2, (sec / maxSec) * plotW);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Gantt schedule ({slots} worker slot{slots === 1 ? '' : 's'} → {schedule.parallelTotalSec.toFixed(1)}s)
        </text>
        <defs>
          <clipPath id={`${clipGanttId}-${offsetX}`}>
            <rect x={plotX} y={32} width={plotW} height={224} />
          </clipPath>
        </defs>

        {/* Row 1: Sequential (1 agent) */}
        <text x={plotX - 6} y={54} textAnchor="end" fontSize={14} fontWeight={700} fill={seqColor}>
          1 agent
        </text>
        <g clipPath={`url(#${clipGanttId}-${offsetX})`}>
          {serialOverheadSec > 0 && (
            <rect x={plotX} y={38} width={sw(serialOverheadSec)} height={22} rx={3} fill={serialColor} fillOpacity={0.82} />
          )}
          {(() => {
            let cursor = serialOverheadSec;
            return durations.map((d, i) => {
              const bx = sx(cursor);
              const bw = Math.max(2, sw(d) - 1.5);
              cursor += d;
              return (
                <rect
                  key={`seq-${i}`}
                  x={bx}
                  y={38}
                  width={bw}
                  height={22}
                  rx={3}
                  fill={d === schedule.longestTaskSec ? stragglerColor : seqColor}
                  fillOpacity={0.78}
                />
              );
            });
          })()}
        </g>

        {/* Parallel lanes */}
        <line x1={plotX} y1={72} x2={plotX + plotW} y2={72} stroke={t.border} strokeDasharray="3 3" />
        <g clipPath={`url(#${clipGanttId}-${offsetX})`}>
          {/* Hard straggler floor marker */}
          <line
            x1={sx(schedule.theoreticalFloorSec)}
            y1={76}
            x2={sx(schedule.theoreticalFloorSec)}
            y2={246}
            stroke={stragglerColor}
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />

          {/* Shared coordinator serial time */}
          {serialOverheadSec > 0 && (
            <rect
              x={plotX}
              y={80}
              width={sw(serialOverheadSec)}
              height={Math.max(24, slots * 20 - 4)}
              rx={3}
              fill={serialColor}
              fillOpacity={0.25}
              stroke={serialColor}
              strokeWidth={1.4}
            />
          )}

          {schedule.blocks.map((blk) => {
            const bx = sx(serialOverheadSec + blk.startSec);
            const bw = Math.max(3, sw(blk.durationSec) - 1.5);
            const by = 80 + blk.slot * 20;
            const fill = blk.isLongest ? stragglerColor : parallelColor;
            return (
              <g key={`blk-${blk.taskIndex}`}>
                <rect x={bx} y={by} width={bw} height={16} rx={3} fill={fill} fillOpacity={0.86} />
                {bw >= 34 && (
                  <text x={bx + bw / 2} y={by + 12} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.background}>
                    {blk.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {Array.from({ length: slots }, (_, s) => (
          <text key={`sl-${s}`} x={plotX - 6} y={80 + s * 20 + 13} textAnchor="end" fontSize={14} fill={t.textSecondary}>
            Slot {s + 1}
          </text>
        ))}

        <text x={plotX} y={266} textAnchor="start" fontSize={14} fontWeight={700} fill={stragglerColor}>
          Floor {schedule.theoreticalFloorSec.toFixed(1)}s
        </text>
        <text x={plotX + plotW} y={266} textAnchor="end" fontSize={14} fill={t.textMuted}>
          Sequential {schedule.sequentialTotalSec.toFixed(1)}s
        </text>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 48;
    const plotY = 44;
    const plotW = panelW - 68;
    const plotH = 186;
    const maxY = Math.max(4, Math.min(8, Math.ceil(schedule.maxPossibleSpeedup + 1.2)));

    const px = (k: number) => plotX + ((k - 1) / 7) * plotW;
    const py = (sp: number) => plotY + plotH - (Math.min(maxY, sp) / maxY) * (plotH - 10);

    const realPts = curve.map((pt) => `${px(pt.slots)},${py(pt.speedup)}`).join(' ');
    const idealPts = curve.map((pt) => `${px(pt.slots)},${py(pt.idealLinear)}`).join(' ');
    const curX = px(slots);
    const curY = py(schedule.speedup);
    const ceilY = py(schedule.maxPossibleSpeedup);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Speedup vs. concurrent slots (Amdahl ceiling)
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[1, 2, 4, 6, 8].map((k) => (
          <g key={`kt-${k}`}>
            <line x1={px(k)} y1={plotY + plotH} x2={px(k)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(k)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {k}
            </text>
          </g>
        ))}

        {[1, Math.round(maxY / 2), maxY].map((yTick, i) => (
          <g key={`yt-${i}`}>
            <line x1={plotX - 4} y1={py(yTick)} x2={plotX} y2={py(yTick)} stroke={t.border} />
            <text x={plotX - 8} y={py(yTick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yTick}×
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          <polyline points={idealPts} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 3" />
          <line x1={plotX} y1={ceilY} x2={plotX + plotW} y2={ceilY} stroke={stragglerColor} strokeWidth={1.6} strokeDasharray="5 4" />
          <polyline points={realPts} fill="none" stroke={parallelColor} strokeWidth={2.6} />
          {curve.map((pt) => (
            <circle
              key={`pt-${pt.slots}`}
              cx={px(pt.slots)}
              cy={py(pt.speedup)}
              r={pt.slots === slots ? 6 : 3.5}
              fill={pt.slots === slots ? parallelColor : seqColor}
              stroke={t.background}
              strokeWidth={1.4}
              onClick={() => takeSlotControl(pt.slots)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </g>

        <text x={plotX + plotW - 4} y={Math.max(plotY + 14, ceilY - 6)} textAnchor="end" fontSize={14} fontWeight={700} fill={stragglerColor}>
          max {schedule.maxPossibleSpeedup.toFixed(2)}×
        </text>
        <text
          x={slots >= 6 ? curX - 8 : curX + 8}
          y={Math.max(plotY + 18, Math.min(plotY + plotH - 8, curY - 8))}
          textAnchor={slots >= 6 ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={parallelColor}
        >
          {slots} slots: {schedule.speedup.toFixed(2)}×
        </text>
        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Concurrent sub-agent slots k (click dot to jump)
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
            title="Why adding more parallel agents hits a wall"
            description="Running k sub-agents at once shrinks wall-clock time, not total API compute. Once every worker slot is busy enough that you wait on the single slowest sub-task plus any non-parallel coordinator step, extra workers add zero speedup."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Sub-task workload preset"
                value={activePreset}
                onChange={(id) => {
                  const found = AGENT_WORKLOAD_PRESETS.find((p) => p.id === id);
                  if (!found) return;
                  setDurationsText(found.durationsText);
                  setSerialOverheadSec(found.serialOverheadSec);
                }}
                options={[
                  ...AGENT_WORKLOAD_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePreset === 'custom' ? [{ value: 'custom', label: 'Custom tasks' }] : []),
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton
                onClick={() => {
                  if (!playback.playing) setFollowingTrace(true);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setFollowingTrace(true);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setFollowingTrace(true);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14, alignItems: 'end', marginTop: 6 }}>
            <Slider
              label="Concurrent worker slots k"
              value={slots}
              onChange={(v) => takeSlotControl(v)}
              min={1}
              max={8}
              step={1}
              format={(v) => `${v} slot${v === 1 ? '' : 's'}`}
            />
            <Slider
              label="Coordinator plan + merge T_serial (s)"
              value={serialOverheadSec}
              onChange={(v) => setSerialOverheadSec(v)}
              min={0}
              max={12}
              step={0.5}
              format={(v) => `${v.toFixed(1)}s`}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Sub-task durations in sec (edit list)</span>
              <input
                aria-label="Sub-task durations"
                type="text"
                value={durationsText}
                maxLength={60}
                onChange={(e) => setDurationsText(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: serialColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Serial coordinator step
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: parallelColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Parallel sub-tasks
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: stragglerColor, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          Slowest straggler ({schedule.longestTaskSec.toFixed(1)}s)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 4, background: seqColor, verticalAlign: 'middle', marginRight: 6 }} />
          Sequential baseline
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`${slots} worker slots finish in ${schedule.parallelTotalSec.toFixed(1)}s vs ${schedule.sequentialTotalSec.toFixed(1)}s sequential (${schedule.speedup.toFixed(2)}x speedup)`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGanttPanel(0, 434)}
            {renderCurvePanel(448, 312)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Parallel agent Gantt schedule" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGanttPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 278" role="img" aria-label="Amdahl speedup curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Wall-clock speedup ceiling"
            latex={'S(k) = \\frac{T_1}{T_{\\text{serial}} + M(k)} \\le \\frac{T_1}{T_{\\text{serial}} + \\max_i d_i}'}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {slots} slot{slots === 1 ? '' : 's'}: {schedule.sequentialTotalSec.toFixed(1)}s → <strong>{schedule.parallelTotalSec.toFixed(1)}s ({schedule.speedup.toFixed(2)}×)</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${slots} of 8`} color="blue" tilt={1} live>
            <p>{schedule.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Parallel wall time (Makespan)"
              latex={'T_k = T_{\\text{serial}} + \\max_{\\text{slot } j} \\text{load}_j(k)'}
              color="yellow"
              tilt={-1}
              active={formulaTab === 'makespan'}
              onSelect={() => setFormulaTab('makespan')}
            >
              <p style={{ textAlign: 'center' }}>You finish only when the serial coordinator AND the busiest slot both finish.</p>
            </StickyNote>
            <StickyNote
              title="Straggler ceiling (Amdahl)"
              latex={'S(k) = \\frac{T_1}{T_k} \\le \\frac{T_1}{T_{\\text{serial}} + \\max_i d_i}'}
              color="pink"
              tilt={1}
              active={formulaTab === 'amdahl'}
              onSelect={() => setFormulaTab('amdahl')}
            >
              <p style={{ textAlign: 'center' }}>Even 100 workers cannot finish faster than the single longest task plus serial steps.</p>
            </StickyNote>
            <StickyNote
              title="Total API / compute work"
              latex={'W_{\\text{total}} = T_{\\text{serial}} + \\sum_{i=1}^{n} d_i'}
              color="orange"
              tilt={-1}
              active={formulaTab === 'cost'}
              onSelect={() => setFormulaTab('cost')}
            >
              <p style={{ textAlign: 'center' }}>Parallel slots lower wait time, never total token or compute work.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${slots} concurrent slot${slots === 1 ? '' : 's'}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Sequential T₁ = {serialOverheadSec.toFixed(1)} + {schedule.sequentialWorkSec.toFixed(1)} = <strong>{schedule.sequentialTotalSec.toFixed(1)}s</strong> · Parallel T_{slots} = {serialOverheadSec.toFixed(1)} + {schedule.parallelWorkMakespanSec.toFixed(1)} = <strong>{schedule.parallelTotalSec.toFixed(1)}s</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Speedup = <strong>{schedule.speedup.toFixed(2)}×</strong> (ceiling {schedule.maxPossibleSpeedup.toFixed(2)}× at {schedule.theoreticalFloorSec.toFixed(1)}s) · Total compute still {schedule.sequentialTotalSec.toFixed(1)}s
              </p>
            </StickyNote>
            <StickyNote title={`Step ${slots} of 8 · What just happened`} color="blue" tilt={-1} live>
              <p>{schedule.explain}</p>
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
            <span>One sub-agent takes 20s while seven others take 2s each (plus 2s coordinator merge). If you jump from 4 workers to 8 workers, what happens?</span>
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
                with 4 slots, the seven 2s tasks already finish beside the 20s task, so doubling to 8 slots stays flat at 22.0s (1.64× speedup).{' '}
                <button
                  type="button"
                  onClick={() => {
                    setDurationsText(AGENT_WORKLOAD_PRESETS[1].durationsText);
                    setSerialOverheadSec(2);
                    takeSlotControl(8);
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
                  Run 20s straggler with 8 slots now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function ParallelAgentSpeedupDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Parallel sub-agent speedup playground"
      footer="Greedy list-scheduling simulation across k concurrent worker slots with serial coordinator time T_serial. Parallelism reduces wall-clock latency down to T_serial + max(task), not total compute work."
    >
      <ParallelAgentSpeedupPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
