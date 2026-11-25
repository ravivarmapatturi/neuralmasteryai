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
  ISOLATION_META,
  simulateWriteSkew,
  type IsolationMode,
} from '../lib/writeSkew';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Both rows commit cleanly and 0 doctors stay on call',
  'The database rejects Bob because Alice already read the table',
  'Alice leaves first and Bob automatically sees 1 doctor left',
] as const;

const MODE_LATEX: Record<IsolationMode, string> = {
  snapshot: String.raw`\begin{gathered} R(T_1) \cap W(T_2) \neq \emptyset \\ W(T_1) \cap W(T_2) = \emptyset \end{gathered}`,
  serial: String.raw`\begin{gathered} \forall\, i,\; C_{\text{after } i} \ge M \\ \text{(re-read after } T_{i-1}\text{)} \end{gathered}`,
  'row-lock': String.raw`\begin{gathered} \mathrm{LOCK}(R) \implies T_2 \text{ waits} \\ \text{for } T_1 \text{ to commit} \end{gathered}`,
};

function WriteSkewPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipTimelineId = useId();
  const clipRosterId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<IsolationMode>('snapshot');
  const [totalClinicians, setTotalClinicians] = useState<number>(2);
  const [minOnCall, setMinOnCall] = useState<number>(1);
  const [leaversCount, setLeaversCount] = useState<number>(2);
  const [firstActor, setFirstActor] = useState<'alice' | 'bob'>('alice');
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () =>
      simulateWriteSkew({
        mode,
        totalClinicians,
        minOnCall,
        leaversCount,
        firstActor,
      }),
    [mode, totalClinicians, minOnCall, leaversCount, firstActor],
  );

  const playback = useStepPlayback(sim.trace.length, 2100, 3, outerVisible);
  const stepRec = sim.trace[playback.step] ?? sim.trace[sim.trace.length - 1];

  const readColor = t.accentSecondary;
  const okColor = t.accentPrimary;
  const conflictColor = t.accentDanger;
  const waitColor = t.accentPurple;

  const updateTotal = (nextTotal: number) => {
    const clamped = Math.max(2, Math.min(5, Math.round(nextTotal)));
    setTotalClinicians(clamped);
    setMinOnCall((m) => Math.min(m, clamped - 1));
    setLeaversCount((k) => Math.max(2, Math.min(k, clamped)));
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

  const statusText = (() => {
    if (sim.writeSkewOccurred) {
      return `Write skew: both row updates commit, roster invariant fails (${sim.finalOnCallCount} of ${sim.config.totalClinicians} on call, need ≥ ${sim.config.minOnCall}).`;
    }
    if (sim.invariantHolds) {
      if (sim.finalOnCallCount === 1) {
        return `Invariant preserved: one clinician remains on call (${sim.finalOnCallCount} of ${sim.config.totalClinicians} on call, need ≥ ${sim.config.minOnCall}).`;
      }
      return `Invariant preserved: ${sim.finalOnCallCount} clinicians remain on call (need ≥ ${sim.config.minOnCall}).`;
    }
    return `Roster invariant fails: ${sim.finalOnCallCount} on call (need ≥ ${sim.config.minOnCall}).`;
  })();

  const renderTimelinePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 76;
    const plotY = 38;
    const plotW = panelW - 92;
    const plotH = 230;
    const visibleActors = sim.clinicians.filter((c) => c.attemptedLeave);
    const orderedActors =
      firstActor === 'bob' && visibleActors.length >= 2
        ? [visibleActors[1], visibleActors[0], ...visibleActors.slice(2)]
        : visibleActors;
    const rowH = Math.min(50, Math.floor((plotH - 26) / Math.max(2, orderedActors.length)));

    const xStage = (s: number) => plotX + 24 + (s / 3) * (plotW - 50);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={22} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Transaction timeline (time →)
        </text>
        <defs>
          <clipPath id={`${clipTimelineId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        {/* Stage headers */}
        {[
          { s: 0, label: 'Read' },
          { s: 1, label: 'Check' },
          { s: 2, label: 'Write' },
          { s: 3, label: 'Result' },
        ].map((col) => {
          const cx = xStage(col.s);
          const activeCol = col.s === playback.step;
          return (
            <g key={`col-${col.s}`}>
              <line
                x1={cx}
                y1={plotY}
                x2={cx}
                y2={plotY + plotH}
                stroke={activeCol ? readColor : t.border}
                strokeWidth={activeCol ? 1.6 : 1}
                strokeDasharray={activeCol ? undefined : '3 3'}
                opacity={activeCol ? 0.75 : 0.4}
              />
              <text
                x={cx}
                y={plotY + plotH + 20}
                textAnchor="middle"
                fontSize={14}
                fontWeight={activeCol ? 700 : 400}
                fill={activeCol ? readColor : t.textMuted}
              >
                {col.label}
              </text>
            </g>
          );
        })}

        {/* Actor labels along left */}
        {orderedActors.map((actor, idx) => {
          const cy = plotY + 38 + idx * rowH;
          return (
            <text
              key={`lbl-${actor.id}`}
              x={plotX - 8}
              y={cy + 5}
              textAnchor="end"
              fontSize={14}
              fontWeight={700}
              fill={idx === 0 ? readColor : t.textPrimary}
            >
              {actor.name}
            </text>
          );
        })}

        <g clipPath={`url(#${clipTimelineId}-${offsetX})`}>
          {/* Active step highlight band */}
          <rect
            x={Math.max(plotX, xStage(playback.step) - 24)}
            y={plotY + 2}
            width={48}
            height={plotH - 4}
            rx={4}
            fill={readColor}
            fillOpacity={0.08}
          />

          {orderedActors.map((actor, idx) => {
            const cy = plotY + 38 + idx * rowH;
            const isFirst = idx === 0;
            const readX = mode === 'snapshot' || isFirst ? xStage(0) : xStage(1) + 8;
            const writeX = mode === 'snapshot' ? xStage(2) : isFirst ? xStage(1) : xStage(2) + 8;
            const endX = xStage(3);
            const reached =
              playback.step >= 3 ||
              (isFirst && playback.step >= 1) ||
              (!isFirst && playback.step >= 2);
            const leftDuty = actor.decision === 'left';
            const outcomeColor = leftDuty
              ? mode === 'snapshot' && !sim.invariantHolds
                ? conflictColor
                : okColor
              : okColor;

            return (
              <g key={`lane-${actor.id}`} opacity={playback.step === 0 && !isFirst ? 0.85 : 1}>
                {/* Transaction span line */}
                <line
                  x1={xStage(0)}
                  y1={cy}
                  x2={endX}
                  y2={cy}
                  stroke={t.border}
                  strokeWidth={1.6}
                />

                {/* Wait / abort indicator for later transactions in protected modes */}
                {!isFirst && mode !== 'snapshot' && (
                  <line
                    x1={xStage(0)}
                    y1={cy}
                    x2={readX}
                    y2={cy}
                    stroke={waitColor}
                    strokeWidth={3}
                    strokeDasharray="4 3"
                  />
                )}

                {/* Read marker */}
                <circle cx={readX} cy={cy} r={5} fill={readColor} stroke={t.background} strokeWidth={1.4} />
                <text
                  x={readX}
                  y={cy - 16}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={readColor}
                  stroke={t.background}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {!isFirst && mode === 'serial' ? `retry:${actor.sawOnCallCount}` : `saw ${actor.sawOnCallCount}`}
                </text>

                {/* Write / stay decision marker */}
                {reached && (
                  <g>
                    <circle
                      cx={writeX}
                      cy={cy}
                      r={5.5}
                      fill={leftDuty ? (sim.writeSkewOccurred ? conflictColor : waitColor) : okColor}
                      stroke={t.background}
                      strokeWidth={1.4}
                    />
                    <text
                      x={writeX}
                      y={cy - 16}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={leftDuty ? (sim.writeSkewOccurred ? conflictColor : waitColor) : okColor}
                      stroke={t.background}
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {leftDuty ? `${actor.id}→off` : 'stays'}
                    </text>
                  </g>
                )}

                {/* Commit outcome dot */}
                <circle
                  cx={endX}
                  cy={cy}
                  r={5.5}
                  fill={reached ? outcomeColor : t.textMuted}
                  stroke={t.background}
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
        </g>
      </g>
    );
  };

  const renderRosterPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 18;
    const plotY = 38;
    const plotW = panelW - 34;
    const plotH = 230;
    const rowStep = Math.min(35, Math.floor((plotH - 56) / sim.clinicians.length));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={22} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Roster after step {playback.step + 1} (need ≥ {sim.config.minOnCall})
        </text>
        <defs>
          <clipPath id={`${clipRosterId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRosterId}-${offsetX})`}>
          {sim.clinicians.map((doc, idx) => {
            const ry = plotY + 14 + idx * rowStep;
            const visibleActors = sim.clinicians.filter((c) => c.attemptedLeave);
            const actorOrder =
              firstActor === 'bob' && visibleActors.length >= 2
                ? [visibleActors[1].id, visibleActors[0].id, ...visibleActors.slice(2).map((c) => c.id)]
                : visibleActors.map((c) => c.id);
            const posInOrder = actorOrder.indexOf(doc.id);
            const hasActed =
              playback.step >= 3 ||
              (posInOrder === 0 && playback.step >= 1) ||
              (posInOrder === 1 && playback.step >= 2);
            const currentlyOnCall = hasActed ? doc.finalOnCall : true;

            return (
              <g key={`doc-${doc.id}`}>
                <circle
                  cx={plotX + 18}
                  cy={ry + 12}
                  r={6}
                  fill={currentlyOnCall ? okColor : conflictColor}
                />
                <text x={plotX + 32} y={ry + 17} fontSize={14} fontWeight={700} fill={t.textPrimary}>
                  {doc.name}
                </text>
                <text
                  x={plotX + plotW - 14}
                  y={ry + 17}
                  textAnchor="end"
                  fontSize={14}
                  fontWeight={700}
                  fill={currentlyOnCall ? okColor : conflictColor}
                >
                  {currentlyOnCall ? 'ON CALL' : 'off duty'}
                </text>
              </g>
            );
          })}

          {/* Summary bar at bottom of roster box */}
          <line x1={plotX + 12} y1={plotY + plotH - 48} x2={plotX + plotW - 12} y2={plotY + plotH - 48} stroke={t.border} strokeWidth={1.1} />
          <text
            x={plotX + plotW / 2}
            y={plotY + plotH - 22}
            textAnchor="middle"
            fontSize={15}
            fontWeight={700}
            fill={
              playback.step < 3
                ? stepRec.invariantHolds
                  ? okColor
                  : conflictColor
                : sim.invariantHolds
                  ? okColor
                  : conflictColor
            }
          >
            On call now: {stepRec.onCallCount} / {sim.config.totalClinicians} (need ≥ {sim.config.minOnCall})
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Write overlap: ∅ (separate rows)
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
                title="Why two valid updates can break a shared rule"
                description="Each doctor only edits their own row after checking that enough colleagues remain on duty. Under snapshot isolation, concurrent checks see the same stale total and let everyone leave."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<IsolationMode>
                label="Transaction schedule (how concurrent checks interact)"
                value={mode}
                onChange={(val) => setMode(val)}
                options={[
                  { value: 'snapshot', label: 'Both read initial snapshot' },
                  { value: 'serial', label: 'Serial decision order' },
                  { value: 'row-lock', label: 'Lock all read rows' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<'alice' | 'bob'>
                label="Who finishes first"
                value={firstActor}
                onChange={(val) => setFirstActor(val)}
                options={[
                  { value: 'alice', label: 'Alice first' },
                  { value: 'bob', label: 'Bob first' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Doctors starting (N)</span>
              <input
                aria-label="Doctors starting on call N"
                type="number"
                min={2}
                max={5}
                step={1}
                value={totalClinicians}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) updateTotal(v);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Minimum required (M)</span>
              <input
                aria-label="Minimum doctors required M"
                type="number"
                min={1}
                max={Math.max(1, totalClinicians - 1)}
                step={1}
                value={minOnCall}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    setMinOnCall(Math.max(1, Math.min(totalClinicians - 1, Math.round(v))));
                  }
                }}
                style={inputStyle}
              />
            </label>
            <Slider
              label="Doctors trying to clock out"
              value={leaversCount}
              onChange={(v) => setLeaversCount(v)}
              min={2}
              max={totalClinicians}
              step={1}
              format={(v) => `${v} of ${totalClinicians}`}
            />
          </div>

          <p role="status" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: sim.invariantHolds ? okColor : conflictColor }}>
            {statusText}
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Schedule colours">
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: readColor, verticalAlign: 'middle', marginRight: 6 }} />
          Read roster snapshot
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: okColor, verticalAlign: 'middle', marginRight: 6 }} />
          On call / invariant holds
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: conflictColor, verticalAlign: 'middle', marginRight: 6 }} />
          Off duty / invariant broken
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: waitColor, verticalAlign: 'middle', marginRight: 6 }} />
          Lock wait / SSI retry
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 304"
            role="img"
            aria-label={
              sim.invariantHolds
                ? `Serial or locked order leaves ${sim.finalOnCallCount} of ${sim.config.totalClinicians} on call`
                : `Write skew leaves ${sim.finalOnCallCount} of ${sim.config.totalClinicians} on call`
            }
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderTimelinePanel(0, 444)}
            {renderRosterPanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 304" role="img" aria-label="Concurrent transaction timeline" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderTimelinePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 304" role="img" aria-label="Final on-call roster state" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRosterPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={ISOLATION_META[mode].shortLabel} latex={MODE_LATEX[mode]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Final: {sim.finalOnCallCount} on call (need ≥ {sim.config.minOnCall}) · {sim.invariantHolds ? 'Safe' : 'Write skew'}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${sim.trace.length}`} color="blue" tilt={1} live>
            <p>{stepRec.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="Snapshot isolation (write skew)"
              latex={MODE_LATEX.snapshot}
              color="yellow"
              tilt={-1}
              active={mode === 'snapshot'}
              onSelect={() => setMode('snapshot')}
            >
              <p style={{ textAlign: 'center' }}>Read sets collide with the other&apos;s write, yet write sets are disjoint—so both commit.</p>
            </StickyNote>
            <StickyNote
              title="Serializable (SSI + retry)"
              latex={MODE_LATEX.serial}
              color="pink"
              tilt={1}
              active={mode === 'serial'}
              onSelect={() => setMode('serial')}
            >
              <p style={{ textAlign: 'center' }}>Spots the read-write cycle, aborts the stale attempt, and reruns on committed data.</p>
            </StickyNote>
            <StickyNote
              title="Predicate / table lock"
              latex={MODE_LATEX['row-lock']}
              color="orange"
              tilt={-1}
              active={mode === 'row-lock'}
              onSelect={() => setMode('row-lock')}
            >
              <p style={{ textAlign: 'center' }}>Locks every row inspected in the count check so colleagues wait before reading.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · N=${sim.config.totalClinicians}, M≥${sim.config.minOnCall}, K=${sim.config.leaversCount}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                {sim.clinicians
                  .filter((c) => c.attemptedLeave)
                  .map((c) => `${c.name} saw ${c.sawOnCallCount} → ${c.decision}`)
                  .join(' · ')}
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Final on call = <strong>{sim.finalOnCallCount}</strong> vs need ≥ {sim.config.minOnCall} · Write overlap = <strong>∅</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${sim.trace.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{stepRec.explain}</p>
            </StickyNote>
          </StickyRow>

          {/* Inline predict-then-run challenge (uses aria-live so role="status" remains unique) */}
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              fontSize: 15,
            }}
          >
            <span style={{ fontWeight: 700, color: t.accentWarn }}>Predict first:</span>
            <span style={{ color: t.textPrimary }}>
              Alice and Bob start on call (need ≥ 1). Under Snapshot Isolation, both update only their own row after reading the same snapshot. What happens?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const revealed = prediction !== null;
                const picked = prediction === idx;
                const correct = idx === 0;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1.5px solid ${
                        revealed && correct
                          ? okColor
                          : revealed && picked
                            ? conflictColor
                            : t.border
                      }`,
                      background:
                        revealed && correct
                          ? okColor
                          : revealed && picked
                            ? conflictColor
                            : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 14,
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
              <span aria-live="polite" style={{ color: prediction === 0 ? okColor : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                writing different rows avoids write-write conflicts, so both departures commit and 0 doctors stay.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('snapshot');
                    setTotalClinicians(2);
                    setMinOnCall(1);
                    setLeaversCount(2);
                    playback.playFromStart();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: readColor,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Run Snapshot skew now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function WriteSkewExplorer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Write skew & isolation playground"
      footer="Calculated transaction schedule model on an N-clinician roster requiring M ≥ 1 on duty. Concurrent snapshot reads allow disjoint row updates to violate shared invariants unless serialized or locked."
    >
      <WriteSkewPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
