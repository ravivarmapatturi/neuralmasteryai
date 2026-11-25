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
  computeSimToRealState,
  SIM_TO_REAL_DOMAIN_MAX,
  SIM_TO_REAL_DOMAIN_MIN,
  SIM_TO_REAL_PLAYBACK_STEPS,
} from '../lib/simToRealGap';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type PolicyNoteId = 'sim-only' | 'randomized' | 'error';

const BRACKET_PRESETS = [
  { value: 'standard', label: 'Standard [0.80, 1.40]', low: 0.8, high: 1.4 },
  { value: 'narrow', label: 'Narrow [0.95, 1.05]', low: 0.95, high: 1.05 },
  { value: 'wide', label: 'Wide [0.60, 1.60]', low: 0.6, high: 1.6 },
] as const;

const PREDICT_OPTIONS = [
  'Domain-randomized (always wins)',
  'Sim-only (0.0% error at exact match)',
  'Both have 0.0% error',
] as const;

const FORMULA_NOTES: {
  id: PolicyNoteId;
  title: string;
  latex: string;
  color: 'pink' | 'yellow' | 'orange';
  plain: string;
}[] = [
  {
    id: 'sim-only',
    title: 'Sim-only controller gain',
    latex: 'w_{\\mathrm{sim}} = \\frac{1}{f_{\\mathrm{sim}}}',
    color: 'pink',
    plain: 'Cancels friction exactly at f_sim, fragile everywhere else.',
  },
  {
    id: 'randomized',
    title: 'Domain-randomized gain',
    latex: 'w_{\\mathrm{DR}} = \\frac{\\mathbb{E}[f]}{\\mathbb{E}[f^2]} = \\frac{\\mu}{\\mu^2 + \\sigma^2}',
    color: 'yellow',
    plain: 'Exact minimum squared error across uniform [low, high].',
  },
  {
    id: 'error',
    title: 'Real-world tracking error',
    latex: '\\mathrm{Error} = |w \\cdot f_{\\mathrm{real}} - 1|',
    color: 'orange',
    plain: 'Zero when gain × real friction hits the target push of 1.00.',
  },
];

function SimToRealPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [simFriction, setSimFriction] = useState(1.0);
  const [randLow, setRandLow] = useState(0.8);
  const [randHigh, setRandHigh] = useState(1.4);
  const [manualReal, setManualReal] = useState(1.35);
  const [activeNote, setActiveNote] = useState<PolicyNoteId>('randomized');
  const [followingTrace, setFollowingTrace] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(SIM_TO_REAL_PLAYBACK_STEPS.length, 2500, 1, outerVisible);
  const traceStep = SIM_TO_REAL_PLAYBACK_STEPS[playback.step] ?? SIM_TO_REAL_PLAYBACK_STEPS[0];
  const realFriction = followingTrace ? traceStep.realFriction : manualReal;

  const state = useMemo(
    () =>
      computeSimToRealState({
        simFriction,
        randLow,
        randHigh,
        realFriction,
      }),
    [simFriction, randLow, randHigh, realFriction],
  );

  const simColor = t.accentDanger;
  const drColor = t.accentSecondary;
  const bandColor = t.accentPrimary;

  const takeControl = (nextReal = realFriction) => {
    setFollowingTrace(false);
    playback.stop();
    setManualReal(nextReal);
  };

  const activeBracketId =
    Math.abs(state.randLow - 0.8) < 0.01 && Math.abs(state.randHigh - 1.4) < 0.01
      ? 'standard'
      : Math.abs(state.randLow - 0.95) < 0.01 && Math.abs(state.randHigh - 1.05) < 0.01
        ? 'narrow'
        : Math.abs(state.randLow - 0.6) < 0.01 && Math.abs(state.randHigh - 1.6) < 0.01
          ? 'wide'
          : 'custom';

  const explainText = followingTrace
    ? traceStep.explain
    : !state.inRange
      ? `Reality (f = ${state.realFriction.toFixed(2)}) landed outside [${state.randLow.toFixed(2)}, ${state.randHigh.toFixed(2)}]: even domain randomization suffers ${(state.errRandomized * 100).toFixed(1)}% error when real physics escapes training.`
      : state.winner === 'randomized'
        ? `Inside the training bracket [${state.randLow.toFixed(2)}, ${state.randHigh.toFixed(2)}], the hedged controller cuts error from ${(state.errSimOnly * 100).toFixed(1)}% down to ${(state.errRandomized * 100).toFixed(1)}%.`
        : `At f = ${state.realFriction.toFixed(2)} near the simulator's single guess (${state.simFriction.toFixed(2)}), sim-only happens to match closely (${(state.errSimOnly * 100).toFixed(1)}% vs ${(state.errRandomized * 100).toFixed(1)}%).`;

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

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 46;
    const plotY = 48;
    const plotW = panelW - 62;
    const plotH = 160;
    const maxErr = 0.8;

    const px = (f: number) =>
      plotX + ((f - SIM_TO_REAL_DOMAIN_MIN) / (SIM_TO_REAL_DOMAIN_MAX - SIM_TO_REAL_DOMAIN_MIN)) * plotW;
    const py = (err: number) => plotY + plotH - (Math.min(maxErr, err) / maxErr) * (plotH - 12);

    const simPath = state.curve.map((pt) => `${px(pt.friction)},${py(pt.simOnlyError)}`).join(' ');
    const drPath = state.curve.map((pt) => `${px(pt.friction)},${py(pt.randomizedError)}`).join(' ');
    const curX = px(state.realFriction);
    const simDotY = py(state.errSimOnly);
    const drDotY = py(state.errRandomized);
    const lowX = px(state.randLow);
    const highX = px(state.randHigh);
    const onRight = state.realFriction > 1.3;

    const tooClose = Math.abs(simDotY - drDotY) < 20;
    const simAbove = simDotY <= drDotY;
    const simLabelY = tooClose
      ? simAbove
        ? Math.max(plotY + 30, simDotY - 10)
        : Math.min(plotY + plotH - 4, simDotY + 18)
      : Math.max(plotY + 30, simDotY - 6);
    const drLabelY = tooClose
      ? simAbove
        ? Math.min(plotY + plotH - 4, drDotY + 18)
        : Math.max(plotY + 30, drDotY - 10)
      : Math.max(plotY + 30, drDotY - 6);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Real-world error across possible floor friction
        </text>
        <defs>
          <clipPath id={clipCurveId}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0.6, 0.9, 1.2, 1.5, 1.8].map((tick) => (
          <g key={`xt-${tick}`}>
            <line x1={px(tick)} y1={plotY + plotH} x2={px(tick)} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(tick)} y={plotY + plotH + 19} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        {[0, 0.4, 0.8].map((eTick) => (
          <g key={`yt-${eTick}`}>
            <line x1={plotX - 4} y1={py(eTick)} x2={plotX} y2={py(eTick)} stroke={t.border} />
            <text x={plotX - 8} y={py(eTick) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {Math.round(eTick * 100)}%
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId})`}>
          <rect x={lowX} y={plotY} width={Math.max(2, highX - lowX)} height={plotH} fill={bandColor} fillOpacity={0.14} />
          <line x1={lowX} y1={plotY} x2={lowX} y2={plotY + plotH} stroke={bandColor} strokeWidth={1.2} strokeDasharray="3 3" />
          <line x1={highX} y1={plotY} x2={highX} y2={plotY + plotH} stroke={bandColor} strokeWidth={1.2} strokeDasharray="3 3" />

          <polyline points={simPath} fill="none" stroke={simColor} strokeWidth={2.4} />
          <polyline points={drPath} fill="none" stroke={drColor} strokeWidth={2.4} />

          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={t.textMuted} strokeWidth={1.4} strokeDasharray="4 3" />
          <circle cx={curX} cy={simDotY} r={5} fill={simColor} stroke={t.background} strokeWidth={1.5} />
          <circle cx={curX} cy={drDotY} r={5} fill={drColor} stroke={t.background} strokeWidth={1.5} />
        </g>

        <text x={(lowX + highX) / 2} y={plotY - 6} textAnchor="middle" fontSize={14} fontWeight={700} fill={bandColor}>
          training range
        </text>
        <text
          x={onRight ? curX - 8 : curX + 8}
          y={simLabelY}
          textAnchor={onRight ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={simColor}
        >
          sim: {(state.errSimOnly * 100).toFixed(1)}%
        </text>
        <text
          x={onRight ? curX - 8 : curX + 8}
          y={drLabelY}
          textAnchor={onRight ? 'end' : 'start'}
          fontSize={14}
          fontWeight={700}
          fill={drColor}
        >
          DR: {(state.errRandomized * 100).toFixed(1)}%
        </text>

        <text x={offsetX + panelW / 2} y={plotY + plotH + 39} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          floor friction f (real now = {state.realFriction.toFixed(2)})
        </text>
      </g>
    );
  };

  const renderForcePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 20;
    const barW = panelW - 108;
    const maxForce = 1.8;
    const mapBar = (val: number) => Math.max(4, Math.min(barW, (val / maxForce) * barW));
    const goalX = plotX + mapBar(1.0);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          Robot push force vs. goal (1.00)
        </text>
        <text x={plotX} y={46} fontSize={14} fill={t.textSecondary}>
          Delivered = gain w × real friction {state.realFriction.toFixed(2)}
        </text>

        <text x={plotX} y={76} fontSize={14} fontWeight={700} fill={simColor}>
          Sim-only (w = {state.wSimOnly.toFixed(2)})
        </text>
        <rect x={plotX} y={84} width={barW} height={24} rx={4} fill={t.surfaceAlt} />
        <rect x={plotX} y={84} width={mapBar(state.simDelivered)} height={24} rx={4} fill={simColor} fillOpacity={0.85} />
        <text x={plotX + barW + 8} y={101} fontSize={14} fontWeight={700} fill={simColor}>
          {state.simDelivered.toFixed(2)}
        </text>

        <text x={plotX} y={136} fontSize={14} fontWeight={700} fill={drColor}>
          Randomized (w = {state.wRandomized.toFixed(2)})
        </text>
        <rect x={plotX} y={144} width={barW} height={24} rx={4} fill={t.surfaceAlt} />
        <rect x={plotX} y={144} width={mapBar(state.randDelivered)} height={24} rx={4} fill={drColor} fillOpacity={0.85} />
        <text x={plotX + barW + 8} y={161} fontSize={14} fontWeight={700} fill={drColor}>
          {state.randDelivered.toFixed(2)}
        </text>

        <line x1={goalX} y1={72} x2={goalX} y2={184} stroke={bandColor} strokeWidth={2.2} strokeDasharray="4 3" />
        <text x={goalX} y={200} textAnchor="middle" fontSize={14} fontWeight={700} fill={bandColor}>
          target = 1.00
        </text>

        <text x={plotX} y={232} fontSize={14} fontWeight={700} fill={state.inRange ? bandColor : simColor}>
          {state.inRange
            ? `Inside training range [${state.randLow.toFixed(2)}, ${state.randHigh.toFixed(2)}]`
            : `Outside training range [${state.randLow.toFixed(2)}, ${state.randHigh.toFixed(2)}]!`}
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
            title="Why a robot trained in one simulator fails in the real world"
            description="A policy tuned to one simulator friction gets 0% error there, then drifts badly when real floors differ. Domain randomization trains across a range [low, high] so real-world error stays small everywhere inside that bracket."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Randomization range presets"
                value={activeBracketId}
                onChange={(id) => {
                  const found = BRACKET_PRESETS.find((b) => b.value === id);
                  if (!found) return;
                  setRandLow(found.low);
                  setRandHigh(found.high);
                }}
                options={[...BRACKET_PRESETS.map((b) => ({ value: b.value, label: b.label })), ...(activeBracketId === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])]}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, alignItems: 'end', marginTop: 4 }}>
            <Slider
              label="Real-world friction f_real"
              value={state.realFriction}
              onChange={(v) => takeControl(v)}
              min={SIM_TO_REAL_DOMAIN_MIN}
              max={SIM_TO_REAL_DOMAIN_MAX}
              step={0.02}
              format={(v) => v.toFixed(2)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Simulator baseline f_sim</span>
              <input
                aria-label="Simulator baseline f_sim"
                type="number"
                min={0.55}
                max={1.6}
                step={0.05}
                value={simFriction}
                onChange={(e) => setSimFriction(Math.max(0.55, Math.min(1.6, Number(e.target.value) || 1.0)))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Random range low</span>
              <input
                aria-label="Random range low"
                type="number"
                min={0.5}
                max={1.6}
                step={0.05}
                value={randLow}
                onChange={(e) => setRandLow(Math.max(0.5, Math.min(1.6, Number(e.target.value) || 0.8)))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Random range high</span>
              <input
                aria-label="Random range high"
                type="number"
                min={0.6}
                max={1.75}
                step={0.05}
                value={randHigh}
                onChange={(e) => setRandHigh(Math.max(0.6, Math.min(1.75, Number(e.target.value) || 1.4)))}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Chart legend">
        <span><span style={{ display: 'inline-block', width: 14, height: 4, background: simColor, verticalAlign: 'middle', marginRight: 6 }} />Sim-only policy</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 4, background: drColor, verticalAlign: 'middle', marginRight: 6 }} />Domain-randomized policy</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: bandColor, opacity: 0.45, borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />Training range [{state.randLow.toFixed(2)}, {state.randHigh.toFixed(2)}]</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 264"
            role="img"
            aria-label={`At real friction ${state.realFriction.toFixed(2)}, sim-only error is ${(state.errSimOnly * 100).toFixed(1)}% vs domain-randomized ${(state.errRandomized * 100).toFixed(1)}%`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderCurvePanel(0, 420)}
            {renderForcePanel(438, 322)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 260" role="img" aria-label="Sim vs domain randomization error curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 245" role="img" aria-label="Delivered push force comparison" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderForcePanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Optimal domain-randomized gain" latex={'w_{\\mathrm{DR}} = \\frac{\\mathbb{E}[f]}{\\mathbb{E}[f^2]}'} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Sim-only err {(state.errSimOnly * 100).toFixed(1)}% vs. DR err <strong>{(state.errRandomized * 100).toFixed(1)}%</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${SIM_TO_REAL_PLAYBACK_STEPS.length}`} color="blue" tilt={1} live>
            <p>{explainText}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {FORMULA_NOTES.map((n, idx) => (
              <StickyNote
                key={n.id}
                title={n.title}
                latex={n.latex}
                color={n.color}
                tilt={idx % 2 ? 1 : -1}
                active={activeNote === n.id}
                onSelect={() => setActiveNote(n.id)}
              >
                <p style={{ textAlign: 'center' }}>{n.plain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked gains · f_real = ${state.realFriction.toFixed(2)}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                w_sim = 1/{state.simFriction.toFixed(2)} = {state.wSimOnly.toFixed(3)} → push {state.simDelivered.toFixed(3)} (<strong>{(state.errSimOnly * 100).toFixed(1)}%</strong> err)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                w_DR = {state.wRandomized.toFixed(3)} → push {state.randDelivered.toFixed(3)} (<strong>{(state.errRandomized * 100).toFixed(1)}%</strong> err)
              </p>
            </StickyNote>
            <StickyNote title={followingTrace ? `Step ${playback.step + 1} of ${SIM_TO_REAL_PLAYBACK_STEPS.length} · ${traceStep.title}` : 'What just happened'} color="blue" tilt={-1} live>
              <p>{explainText}</p>
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
            <span>If f_sim = 1.00 and randomization is [0.80, 1.40], suppose the real floor happens to match the simulator (f_real = 1.00). Which controller has lower error?</span>
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
                domain randomization hedges over [0.80, 1.40] (giving ~11.3% error right at 1.00) so it stays safe across the whole bracket, whereas sim-only gets 0.0% at 1.00 and degrades elsewhere.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSimFriction(1.0);
                    setRandLow(0.8);
                    setRandHigh(1.4);
                    takeControl(1.0);
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
                  Test exact match f_real = 1.00 now
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function SimToRealGapDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Sim-to-real domain randomization playground"
      footer="Exact analytical controller gains: w_sim = 1/f_sim and uniform domain-randomized optimum w_DR = E[f]/E[f²]. Relative error |w·f_real − 1| measures tracking deviation."
    >
      <SimToRealPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
