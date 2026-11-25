import { useMemo, useState } from 'react';
import { scaleLinear } from 'd3';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { PillSelect, Slider, VisualizationContainer, useVizVisible } from '../primitives';
import {
  TOTAL_OPT_STEPS,
  explainRewardStep,
  formatRewardFormula,
  proxyAtLength,
  qualityAtLength,
  simulateRewardHacking,
} from '../lib/rewardHacking';
import {
  FormulaStrip,
  PlaygroundHeaderBar,
  PredictChallenge,
  StepCaptionStrip,
} from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type ScenarioId = 'hacker' | 'tethered' | 'unbiased';

const SCENARIO_OPTIONS: { value: ScenarioId; label: string }[] = [
  { value: 'hacker', label: 'Length hacker' },
  { value: 'tethered', label: 'KL-tethered' },
  { value: 'unbiased', label: 'Unbiased judge' },
];

const PREDICT_OPTIONS = [
  'Stays high (~8.7/10) — KL stops padding',
  'Collapses near 0/10 anyway',
  'Proxy reward doubles to 28',
] as const;

function RewardHackingPlayground({ outerVisible }: { outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(700);

  const [lengthBias, setLengthBias] = useState(1.6);
  const [klFloor, setKlFloor] = useState(0.25);
  const [idealLength, setIdealLength] = useState(150);
  const [prediction, setPrediction] = useState<number | null>(null);

  const sim = useMemo(
    () => simulateRewardHacking({ lengthBias, klFloor, idealLength }),
    [lengthBias, klFloor, idealLength],
  );

  const playback = useStepPlayback(sim.trace.length, 750, TOTAL_OPT_STEPS, outerVisible);
  const current = sim.trace[Math.min(playback.step, sim.trace.length - 1)];
  const prev = playback.step > 0 ? sim.trace[playback.step - 1] : undefined;

  const activeScenario: ScenarioId =
    lengthBias < 0.05 ? 'unbiased' : klFloor >= 1.5 ? 'tethered' : 'hacker';

  const applyScenario = (nextId: ScenarioId | ((p: ScenarioId) => ScenarioId)) => {
    const id = typeof nextId === 'function' ? nextId(activeScenario) : nextId;
    if (id === 'unbiased') {
      setLengthBias(0);
      setKlFloor(0.25);
    } else if (id === 'tethered') {
      setLengthBias(1.6);
      setKlFloor(2.0);
    } else {
      setLengthBias(1.6);
      setKlFloor(0.25);
    }
    playback.playFromStart();
  };

  const caption = explainRewardStep(current, { lengthBias, klFloor, idealLength }, prev);
  const formula = formatRewardFormula(current, { lengthBias, klFloor, idealLength });
  const qualityColor =
    current.expectedTrueQuality >= 7
      ? t.accentPrimary
      : current.expectedTrueQuality >= 4
        ? t.accentWarn
        : t.accentDanger;

  const renderCurvePanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 42;
    const padR = offsetX + panelW - 10;
    const padT = 30;
    const padB = panelH - 42;
    const maxY = Math.max(15, ...sim.proxyCurve);
    const sx = scaleLinear().domain([40, 900]).range([padL, padR]);
    const sy = scaleLinear().domain([0, maxY]).range([padB, padT]);

    const truePts = sim.curveLengths.map((L, i) => `${sx(L)},${sy(sim.trueCurve[i])}`).join(' ');
    const proxyPts = sim.curveLengths.map((L, i) => `${sx(L)},${sy(sim.proxyCurve[i])}`).join(' ');
    const curL = current.expectedLength;
    const curQCurve = qualityAtLength(curL, idealLength);
    const curRCurve = proxyAtLength(curL, lengthBias, idealLength);

    return (
      <g>
        <text x={padL} y={16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Score vs length
        </text>
        <text x={padR} y={16} textAnchor="end" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.accentSecondary}>
          -- True Q   <tspan fill={t.accentDanger}>— Proxy R</tspan>
        </text>

        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        {[0, 5, 10, 15].filter((v) => v <= maxY).map((tick) => (
          <text key={`yt-${tick}`} x={padL - 6} y={sy(tick) + 4} textAnchor="end" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        {[100, 300, 500, 700, 900].map((tick) => (
          <text key={`xt-${tick}`} x={sx(tick)} y={padB + 17} textAnchor="middle" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Response length (words) →
        </text>

        <polyline points={truePts} fill="none" stroke={t.accentSecondary} strokeWidth={2.2} strokeDasharray="5 3" />
        <polyline points={proxyPts} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />

        <line x1={sx(curL)} y1={padT} x2={sx(curL)} y2={padB} stroke={t.accentWarn} strokeWidth={1.6} strokeDasharray="3 3" />
        <circle cx={sx(curL)} cy={sy(curRCurve)} r={5.5} fill={t.accentDanger} stroke={t.background} strokeWidth={1.5} />
        <circle cx={sx(curL)} cy={sy(curQCurve)} r={5.5} fill={t.accentSecondary} stroke={t.background} strokeWidth={1.5} />
        <text
          x={sx(curL) > (padL + padR) / 2 ? sx(curL) - 8 : sx(curL) + 8}
          y={sy(curRCurve) < padT + 36 ? padB - 10 : padT + 14}
          textAnchor={sx(curL) > (padL + padR) / 2 ? 'end' : 'start'}
          fontSize={13.5}
          fontWeight={700}
          fontFamily="monospace"
          fill={t.accentWarn}
        >
          E[L]={Math.round(curL)}w
        </text>
      </g>
    );
  };

  const renderTrajectoryPanel = (offsetX: number, panelW: number, panelH: number) => {
    const padL = offsetX + 42;
    const padR = offsetX + panelW - 10;
    const padT = 30;
    const padB = panelH - 42;
    const maxY = Math.max(15, ...sim.trace.map((r) => r.expectedProxyReward));
    const sx = scaleLinear().domain([0, TOTAL_OPT_STEPS]).range([padL, padR]);
    const sy = scaleLinear().domain([0, maxY]).range([padB, padT]);

    const visibleTrace = sim.trace.slice(0, playback.step + 1);
    const truePath = visibleTrace.map((r) => `${sx(r.step)},${sy(r.expectedTrueQuality)}`).join(' ');
    const proxyPath = visibleTrace.map((r) => `${sx(r.step)},${sy(r.expectedProxyReward)}`).join(' ');
    const cx = sx(current.step);
    const cyQ = sy(current.expectedTrueQuality);
    const cyR = sy(current.expectedProxyReward);

    return (
      <g>
        <text x={padL} y={16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Training (0 → 10)
        </text>
        <text x={padR} y={16} textAnchor="end" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.accentPrimary}>
          -- True Q   <tspan fill={t.accentDanger}>— Proxy R</tspan>
        </text>

        <line x1={padL} y1={padT} x2={padL} y2={padB} stroke={t.border} strokeWidth={1.3} />
        <line x1={padL} y1={padB} x2={padR} y2={padB} stroke={t.border} strokeWidth={1.3} />

        {[0, 5, 10, 15].filter((v) => v <= maxY).map((tick) => (
          <text key={`ty-${tick}`} x={padL - 6} y={sy(tick) + 4} textAnchor="end" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        {[0, 2, 4, 6, 8, 10].map((tick) => (
          <text key={`tx-${tick}`} x={sx(tick)} y={padB + 17} textAnchor="middle" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            {tick}
          </text>
        ))}
        <text x={(padL + padR) / 2} y={panelH - 6} textAnchor="middle" fontSize={13.5} fontWeight={600} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
          Optimization step (KL ↑) →
        </text>

        {visibleTrace.length > 1 && (
          <>
            <polyline points={truePath} fill="none" stroke={t.accentPrimary} strokeWidth={2.4} strokeDasharray="5 3" />
            <polyline points={proxyPath} fill="none" stroke={t.accentDanger} strokeWidth={2.6} />
          </>
        )}
        {current.hackingGap > 1.5 && (
          <line x1={cx} y1={cyR} x2={cx} y2={cyQ} stroke={t.accentWarn} strokeWidth={2} strokeDasharray="3 3" />
        )}
        <circle cx={cx} cy={cyR} r={5.5} fill={t.accentDanger} stroke={t.background} strokeWidth={1.5} />
        <circle cx={cx} cy={cyQ} r={5.5} fill={t.accentPrimary} stroke={t.background} strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <>
      <PlaygroundHeaderBar
        eyebrow="Live playground"
        title="Goodhart's Law in RLHF"
        description="Watch an RL policy push harder against a length-biased reward model: proxy reward climbs while true quality rises then crashes."
        playing={playback.playing}
        onToggle={playback.toggle}
        onNext={playback.next}
        onReset={playback.reset}
      />

      {/* Row 1: Scenarios + free numeric Ideal length */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<ScenarioId> value={activeScenario} onChange={applyScenario} options={SCENARIO_OPTIONS} />
        </div>
        <label htmlFor="rh-ideal-len" style={{ fontSize: 14, color: t.textSecondary }}>
          Ideal length L*:
          <input
            id="rh-ideal-len"
            type="number"
            min={60}
            max={300}
            step={10}
            value={idealLength}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              setIdealLength(Math.max(60, Math.min(300, Math.round(v))));
              playback.playFromStart();
            }}
            style={{
              width: 68,
              marginLeft: 6,
              padding: '4px 6px',
              borderRadius: RADIUS.sm,
              border: `1px solid ${t.border}`,
              background: t.background,
              color: t.textPrimary,
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          />
        </label>
        <div style={{ marginLeft: 'auto', fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Step <strong style={{ color: t.textPrimary }}>{current.step}/10</strong> · Proxy{' '}
          <strong style={{ color: t.accentDanger }}>{current.expectedProxyReward.toFixed(2)}</strong> · True Q{' '}
          <strong style={{ color: qualityColor }}>{current.expectedTrueQuality.toFixed(2)}/10</strong> · KL{' '}
          <strong style={{ color: t.textPrimary }}>{current.klDivergence.toFixed(2)}</strong>
        </div>
      </div>

      {/* Row 2: Two sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 4 }}>
        <Slider
          label="Reward model length bias (pts / 100 words)"
          value={lengthBias}
          onChange={(v) => {
            setLengthBias(v);
            playback.playFromStart();
          }}
          min={0}
          max={2.2}
          step={0.1}
          format={(v) => `+${v.toFixed(1)}`}
        />
        <Slider
          label="KL tether β (higher = stays closer to base)"
          value={klFloor}
          onChange={(v) => {
            setKlFloor(v);
            playback.playFromStart();
          }}
          min={0.15}
          max={4.0}
          step={0.05}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <StepCaptionStrip caption={caption} accentColor={qualityColor} />

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 232"
            role="img"
            aria-label={`At step ${current.step}, expected length is ${Math.round(current.expectedLength)} words, proxy reward ${current.expectedProxyReward.toFixed(2)}, true quality ${current.expectedTrueQuality.toFixed(2)}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderCurvePanel(0, 344, 232)}
            {renderTrajectoryPanel(356, 344, 232)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 340 220"
              role="img"
              aria-label="True quality versus length-biased proxy reward curves"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderCurvePanel(0, 340, 220)}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 340 215"
              role="img"
              aria-label="Proxy reward versus true quality over RLHF optimization steps"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderTrajectoryPanel(0, 340, 215)}
            </svg>
          </div>
        )}
      </div>

      <FormulaStrip general={formula.general} worked={formula.worked} />

      <PredictChallenge
        prompt="Keep length bias at +1.6/100w, but raise KL tether β from 0.25 to 2.0 — what happens to True Quality?"
        options={PREDICT_OPTIONS}
        correctIndex={0}
        selected={prediction}
        onSelect={setPrediction}
        explanation="Higher β penalizes drifting into padded 900-word answers, keeping True Quality around 8.7/10."
        actionLabel="Test β = 2.0 now"
        onAction={() => {
          setLengthBias(1.6);
          setKlFloor(2.0);
          playback.playFromStart();
        }}
      />
    </>
  );
}

export default function RewardHackingSimulationDiagram() {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Reward Hacking & Goodhart's Law Playground"
      footer="Uses exact closed-form KL-regularized RLHF policies π*(y) ∝ π_ref(y)·exp(R(y)/β) over candidate lengths 40–900 words. Lowering β lets the policy exploit the proxy's length bias."
    >
      <RewardHackingPlayground outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
