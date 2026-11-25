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
  BANDIT_CHECKPOINTS,
  BANDIT_PRESETS,
  simulateBanditComparison,
  type BanditStrategy,
} from '../lib/bandits';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'ε-greedy stays ahead forever because 90% greedy is hard to beat',
  'UCB1 flattens into a curve and overtakes ε-greedy’s straight-line climb',
  'Both strategies fall back down to zero regret',
] as const;

const STRATEGY_LATEX: Record<BanditStrategy, string> = {
  epsilonGreedy: String.raw`a_t = \begin{cases}\text{random arm} & \text{prob }\varepsilon \\ \arg\max_a \hat Q(a) & \text{prob }1-\varepsilon\end{cases}`,
  ucb1: String.raw`a_t = \arg\max_a \left[\hat Q(a) + \sqrt{\frac{2\ln t}{N(a)}}\right]`,
  thompson: String.raw`s_a \sim \mathrm{Beta}(\alpha_a,\beta_a),\quad a_t = \arg\max_a s_a`,
};

const STRATEGY_LABEL: Record<BanditStrategy, string> = {
  epsilonGreedy: 'ε-greedy',
  ucb1: 'UCB1',
  thompson: 'Thompson Sampling',
};

function BanditRegretRacePlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipCurveId = useId();
  const clipArmsId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [strategy, setStrategy] = useState<BanditStrategy>('ucb1');
  const [manualHorizon, setManualHorizon] = useState<number | null>(null);
  const [epsilon, setEpsilon] = useState<number>(0.1);
  const [probs, setProbs] = useState<[number, number, number]>([0.3, 0.5, 0.7]);
  const [seed, setSeed] = useState<number>(42);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(BANDIT_CHECKPOINTS.length, 2100, 4, outerVisible);
  const horizon = manualHorizon ?? BANDIT_CHECKPOINTS[playback.step] ?? 1800;

  const sim = useMemo(
    () => simulateBanditComparison({ pulls: 5000, seed, epsilon, ucbScale: 1.0, trueProbs: probs }),
    [seed, epsilon, probs],
  );
  const snap = useMemo(() => sim.snapshotsAt(horizon), [sim, horizon]);

  // Distinct non-similar colors: Blue = eps-greedy, Red = UCB1, Green = Thompson
  const colorEps = t.accentSecondary;
  const colorUcb = t.accentDanger;
  const colorThompson = t.accentPrimary;

  const strategyColor = (s: BanditStrategy) =>
    s === 'epsilonGreedy' ? colorEps : s === 'ucb1' ? colorUcb : colorThompson;

  const selectHorizon = (h: number) => {
    playback.stop();
    setManualHorizon(Math.max(25, Math.min(5000, Math.round(h))));
  };

  const updateProb = (idx: 0 | 1 | 2, val: number) => {
    if (!Number.isFinite(val)) return;
    const clamped = Math.max(0.05, Math.min(0.95, Number(val.toFixed(2))));
    setProbs((prev) => {
      const next: [number, number, number] = [prev[0], prev[1], prev[2]];
      next[idx] = clamped;
      return next;
    });
  };

  const activePresetId =
    BANDIT_PRESETS.find(
      (p) =>
        Math.abs(p.probs[0] - probs[0]) < 1e-6 &&
        Math.abs(p.probs[1] - probs[1]) < 1e-6 &&
        Math.abs(p.probs[2] - probs[2]) < 1e-6,
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
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const renderRacePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 54;
    const plotY = 36;
    const plotW = panelW - 76;
    const plotH = 194;
    const maxRegret = Math.max(
      snap.epsilonGreedy.regret,
      snap.ucb1.regret,
      snap.thompson.regret,
      5,
    );

    const px = (pull: number) => plotX + (pull / Math.max(1, horizon - 1)) * plotW;
    const py = (reg: number) => plotY + plotH - (reg / maxRegret) * (plotH - 12);

    const buildPath = (series: number[]) => {
      const stride = Math.max(1, Math.floor(horizon / 140));
      const pts: string[] = [];
      for (let i = 0; i < horizon; i += stride) {
        pts.push(`${px(i).toFixed(1)},${py(series[i]).toFixed(1)}`);
      }
      pts.push(`${px(horizon - 1).toFixed(1)},${py(series[horizon - 1]).toFixed(1)}`);
      return `M${pts.join(' L')}`;
    };

    // Place non-overlapping right-side endpoint labels in Y order
    const endpoints = [
      { id: 'epsilonGreedy' as BanditStrategy, label: `ε-greedy ${snap.epsilonGreedy.regret.toFixed(1)}`, y: py(snap.epsilonGreedy.regret), col: colorEps },
      { id: 'ucb1' as BanditStrategy, label: `UCB1 ${snap.ucb1.regret.toFixed(1)}`, y: py(snap.ucb1.regret), col: colorUcb },
      { id: 'thompson' as BanditStrategy, label: `Thompson ${snap.thompson.regret.toFixed(1)}`, y: py(snap.thompson.regret), col: colorThompson },
    ].sort((a, b) => a.y - b.y);
    for (let i = 1; i < endpoints.length; i++) {
      if (endpoints[i].y - endpoints[i - 1].y < 19) {
        endpoints[i].y = endpoints[i - 1].y + 19;
      }
    }

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Cumulative regret over {horizon} pulls (lower wins)
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} rx={4} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={t.border} strokeWidth={1.3} />

        {[0, Math.round(maxRegret / 2), Math.round(maxRegret)].map((yt, idx) => (
          <g key={`ry-${idx}`}>
            <line x1={plotX - 4} y1={py(yt)} x2={plotX} y2={py(yt)} stroke={t.border} />
            <text x={plotX - 8} y={py(yt) + 4} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {yt}
            </text>
          </g>
        ))}

        {[0, Math.round(horizon / 2), horizon].map((xt) => (
          <g key={`rx-${xt}`}>
            <line x1={px(Math.max(0, xt - 1))} y1={plotY + plotH} x2={px(Math.max(0, xt - 1))} y2={plotY + plotH + 4} stroke={t.border} />
            <text x={px(Math.max(0, xt - 1))} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textMuted}>
              {xt}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          <path d={buildPath(sim.trace.epsilonGreedy)} fill="none" stroke={colorEps} strokeWidth={strategy === 'epsilonGreedy' ? 3 : 2} />
          <path d={buildPath(sim.trace.ucb1)} fill="none" stroke={colorUcb} strokeWidth={strategy === 'ucb1' ? 3 : 2} />
          <path d={buildPath(sim.trace.thompson)} fill="none" stroke={colorThompson} strokeWidth={strategy === 'thompson' ? 3 : 2} />

          <circle cx={px(horizon - 1)} cy={py(snap.epsilonGreedy.regret)} r={5} fill={colorEps} stroke={t.background} strokeWidth={1.4} />
          <circle cx={px(horizon - 1)} cy={py(snap.ucb1.regret)} r={5} fill={colorUcb} stroke={t.background} strokeWidth={1.4} />
          <circle cx={px(horizon - 1)} cy={py(snap.thompson.regret)} r={5} fill={colorThompson} stroke={t.background} strokeWidth={1.4} />
        </g>

        {endpoints.map((ep) => (
          <text
            key={ep.id}
            x={plotX + plotW - 10}
            y={Math.max(plotY + 16, Math.min(plotY + plotH - 8, ep.y + 4))}
            textAnchor="end"
            fontSize={14}
            fontWeight={700}
            fill={ep.col}
            stroke={t.background}
            strokeWidth={4}
            paintOrder="stroke"
          >
            {ep.label}
          </text>
        ))}

        <text x={plotX + plotW / 2} y={plotY + plotH + 40} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Pulls t (1 → {horizon})
        </text>
      </g>
    );
  };

  const renderArmPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 16;
    const barMax = Math.max(80, panelW - 135);
    const activeSnap = snap[strategy];
    const col = strategyColor(strategy);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. {STRATEGY_LABEL[strategy]} pulls ({horizon})
        </text>
        <defs>
          <clipPath id={`${clipArmsId}-${offsetX}`}>
            <rect x={plotX} y={32} width={panelW - 24} height={240} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipArmsId}-${offsetX})`}>
          {activeSnap.arms.map((arm, idx) => {
            const y = 46 + idx * 62;
            const share = arm.pulls / Math.max(1, horizon);
            const bw = Math.max(4, share * barMax);
            const isBest = idx === sim.optimalArmIndex;
            const armCol = isBest ? t.accentPrimary : col;
            return (
              <g key={`arm-${idx}`} transform={`translate(0, ${y})`}>
                <text x={plotX} y={14} fontSize={14} fontWeight={700} fill={isBest ? t.accentPrimary : t.textPrimary}>
                  Arm {idx + 1} (true {arm.trueProb.toFixed(2)}{isBest ? ' ★ best' : ''})
                </text>
                <rect x={plotX} y={22} width={barMax} height={18} rx={4} fill={t.surfaceAlt} />
                <rect x={plotX} y={22} width={bw} height={18} rx={4} fill={armCol} fillOpacity={0.85} />
                <text x={plotX + barMax + 8} y={36} fontSize={14} fontWeight={700} fill={armCol}>
                  {(share * 100).toFixed(0)}% ({arm.pulls})
                </text>
                <text x={plotX} y={54} fontSize={14} fill={t.textSecondary}>
                  est {arm.meanEstimate.toFixed(2)}
                  {strategy === 'ucb1' ? ` + bonus ${arm.ucbBonus.toFixed(2)}` : strategy === 'thompson' ? ` · Beta(${arm.alpha}, ${arm.beta})` : ''}
                </text>
              </g>
            );
          })}
        </g>

        <text x={plotX} y={266} fontSize={14} fill={t.textSecondary}>
          Best-arm share: {activeSnap.bestArmSharePct.toFixed(0)}%
        </text>
      </g>
    );
  };

  const activeSnap = snap[strategy];
  const bestArmInfo = activeSnap.arms[sim.optimalArmIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="How to balance trying new options against picking today's winner"
                description="You choose between 3 slot-machine arms with hidden win rates and only see the reward of the arm you pull. Regret is the total reward missed by not always pulling the best arm — watch random exploration lose to smart confidence bounds and Bayesian sampling."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualHorizon(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualHorizon(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualHorizon(null);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<BanditStrategy>
                label="Inspect strategy (arm breakdown & formula)"
                value={strategy}
                onChange={(s) => setStrategy(s)}
                options={[
                  { value: 'epsilonGreedy', label: 'ε-greedy' },
                  { value: 'ucb1', label: 'UCB1' },
                  { value: 'thompson', label: 'Thompson Sampling' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<string>
                label="Hidden arm win rates"
                value={activePresetId}
                onChange={(id) => {
                  const found = BANDIT_PRESETS.find((p) => p.id === id);
                  if (found) setProbs([found.probs[0], found.probs[1], found.probs[2]]);
                }}
                options={[
                  ...BANDIT_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom arms' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 12, alignItems: 'end' }}>
            <Slider
              label="Pulls (horizon T)"
              value={horizon}
              onChange={(v) => selectHorizon(v)}
              min={50}
              max={5000}
              step={50}
              format={(v) => `${v}`}
            />
            <Slider
              label="Explore rate ε (ε-greedy)"
              value={epsilon}
              onChange={(v) => setEpsilon(v)}
              min={0}
              max={0.4}
              step={0.02}
              format={(v) => v.toFixed(2)}
            />
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Arm 1 rate p₁</span>
              <input aria-label="Arm 1 win rate" type="number" min={0.05} max={0.95} step={0.05} value={probs[0]} onChange={(e) => updateProb(0, Number(e.target.value))} style={inputStyle} />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Arm 2 rate p₂</span>
              <input aria-label="Arm 2 win rate" type="number" min={0.05} max={0.95} step={0.05} value={probs[1]} onChange={(e) => updateProb(1, Number(e.target.value))} style={inputStyle} />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Arm 3 rate p₃</span>
              <input aria-label="Arm 3 win rate" type="number" min={0.05} max={0.95} step={0.05} value={probs[2]} onChange={(e) => updateProb(2, Number(e.target.value))} style={inputStyle} />
            </label>
            <VizButton variant="secondary" onClick={() => setSeed((s) => s + 1)}>
              New seed (#{seed})
            </VizButton>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Strategy colours">
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: colorEps, verticalAlign: 'middle', marginRight: 6 }} />
          ε-greedy (ε={epsilon.toFixed(2)}): {snap.epsilonGreedy.regret.toFixed(1)}
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: colorUcb, verticalAlign: 'middle', marginRight: 6 }} />
          UCB1: {snap.ucb1.regret.toFixed(1)}
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 18, height: 4, background: colorThompson, verticalAlign: 'middle', marginRight: 6 }} />
          Thompson Sampling: {snap.thompson.regret.toFixed(1)}
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 282"
            role="img"
            aria-label={`After ${horizon} pulls: Thompson Sampling regret ${snap.thompson.regret.toFixed(1)}, UCB1 ${snap.ucb1.regret.toFixed(1)}, epsilon-greedy ${snap.epsilonGreedy.regret.toFixed(1)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderRacePanel(0, 446)}
            {renderArmPanel(458, 302)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Cumulative bandit regret curves" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderRacePanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 282" role="img" aria-label="Arm pull distribution" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderArmPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`${STRATEGY_LABEL[strategy]} rule`} latex={STRATEGY_LATEX[strategy]} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              {horizon} pulls: Thompson {snap.thompson.regret.toFixed(1)} · UCB1 {snap.ucb1.regret.toFixed(1)} · ε-greedy {snap.epsilonGreedy.regret.toFixed(1)}
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${BANDIT_CHECKPOINTS.length}`} color="blue" tilt={1} live>
            <p>{snap.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="ε-greedy (fixed exploration)"
              latex={STRATEGY_LATEX.epsilonGreedy}
              color="yellow"
              tilt={-1}
              active={strategy === 'epsilonGreedy'}
              onSelect={() => setStrategy('epsilonGreedy')}
            >
              <p style={{ textAlign: 'center' }}>Never stops rolling random coins at rate ε, so its regret climbs in a straight line forever.</p>
            </StickyNote>
            <StickyNote
              title="UCB1 (optimism bonus)"
              latex={STRATEGY_LATEX.ucb1}
              color="pink"
              tilt={1}
              active={strategy === 'ucb1'}
              onSelect={() => setStrategy('ucb1')}
            >
              <p style={{ textAlign: 'center' }}>Adds an uncertainty bonus that shrinks with pulls N(a), yielding logarithmic O(log t) regret.</p>
            </StickyNote>
            <StickyNote
              title="Thompson Sampling (Bayesian)"
              latex={STRATEGY_LATEX.thompson}
              color="orange"
              tilt={-1}
              active={strategy === 'thompson'}
              onSelect={() => setStrategy('thompson')}
            >
              <p style={{ textAlign: 'center' }}>Draws one plausible rate from Beta(wins+1, losses+1) per arm and pulls the highest draw.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · After ${horizon} pulls (best arm = #${sim.optimalArmIndex + 1}, p* = ${sim.optimalProb.toFixed(2)})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Cumulative regret: Thompson <strong>{snap.thompson.regret.toFixed(1)}</strong> · UCB1 <strong>{snap.ucb1.regret.toFixed(1)}</strong> · ε-greedy <strong>{snap.epsilonGreedy.regret.toFixed(1)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                {STRATEGY_LABEL[strategy]} pulled Arm #{sim.optimalArmIndex + 1} <strong>{bestArmInfo.pulls}/{horizon}</strong> times ({activeSnap.bestArmSharePct.toFixed(0)}%) · est {bestArmInfo.meanEstimate.toFixed(3)}
                {strategy === 'ucb1' ? ` + bonus ${bestArmInfo.ucbBonus.toFixed(3)} = ${bestArmInfo.ucbScore.toFixed(3)}` : ''}
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${BANDIT_CHECKPOINTS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{snap.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="On the default machines (0.3 / 0.5 / 0.7), UCB1 loses to ε-greedy at 200 pulls. What happens when both keep running out to 4,500 pulls?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="UCB1’s uncertainty bonus shrinks as arms get tested, so its curve bends flat (O(log t)) and crosses below ε-greedy’s steady linear waste."
            actionLabel="Run 4,500 pulls now"
            onAction={() => {
              setProbs([0.3, 0.5, 0.7]);
              setEpsilon(0.1);
              selectHorizon(4500);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function BanditRegretRaceDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Multi-armed bandit regret race playground"
      footer="Exact seeded 3-arm Bernoulli bandit simulation using each strategy's true update rule. Regret accumulates (p* − p_chosen) on every pull."
    >
      <BanditRegretRacePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
