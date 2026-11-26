import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  buildDiscountSteps,
  calculateDiscountedReturn,
  discountHalfLife,
  explainDiscountStep,
} from '../lib/returnDiscounting';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Take 2 points now',
  'Wait 4 steps for 8 points',
  'They are worth the same',
] as const;

function ReturnDiscountingPlayground({ compact, outerVisible }: { compact: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const clipId = useId();
  const [gamma, setGamma] = useState(0.85);
  const [rewardNow, setRewardNow] = useState(2);
  const [rewardLater, setRewardLater] = useState(8);
  const [delay, setDelay] = useState(8);
  const [prediction, setPrediction] = useState<number | null>(null);

  const rewards = useMemo(() => [
    { step: 0, reward: rewardNow },
    { step: delay, reward: rewardLater },
  ], [delay, rewardLater, rewardNow]);
  const result = useMemo(() => calculateDiscountedReturn(rewards, gamma), [rewards, gamma]);
  const steps = useMemo(() => buildDiscountSteps(delay), [delay]);
  const playback = useStepPlayback(steps.length, 850, Math.min(2, steps.length - 1), outerVisible);
  const currentStep = steps[playback.step] ?? 0;
  const halfLife = discountHalfLife(gamma);
  const caption = explainDiscountStep(currentStep, delay, gamma, rewards);

  const rawColor = t.accentSecondary;
  const weightColor = t.accentPurple;
  const contributionColor = t.accentPrimary;
  const cursorColor = t.accentDanger;
  const W = 760;
  const H = 284;
  const plot = { x: 64, y: 36, w: 650, h: 190 };
  const maxReward = Math.max(1, Math.abs(rewardNow), Math.abs(rewardLater));
  const x = (step: number) => plot.x + (step / Math.max(1, delay)) * plot.w;
  const rewardY = (value: number) => plot.y + plot.h - (Math.max(0, value) / maxReward) * plot.h;
  const weightY = (value: number) => plot.y + plot.h - value * plot.h;
  const weights = steps.map((step) => ({ step, value: gamma ** step }));

  const update = (setter: (value: number) => void, value: number) => {
    playback.stop();
    setter(value);
    setPrediction(null);
  };

  return (
    <>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="How much is a later reward worth now?"
                description="Discounting solves the problem of comparing a small reward now with a larger reward that arrives after more decisions."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, alignItems: 'end' }}>
            <NumericField label="Discount factor γ" hint="future weight kept each step" value={gamma} min={0} max={1} step={0.01} integer={false} onChange={(value) => update(setGamma, value)} />
            <NumericField label="Reward now r₀" hint="points at step 0" value={rewardNow} min={0} max={20} step={0.5} integer={false} onChange={(value) => update(setRewardNow, value)} />
            <NumericField label="Later reward rₖ" hint="points after waiting" value={rewardLater} min={0} max={20} step={0.5} integer={false} onChange={(value) => update(setRewardLater, value)} />
            <NumericField label="Wait k (steps)" hint="how late rₖ arrives" value={delay} min={1} max={12} onChange={(value) => update(setDelay, value)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, margin: '6px 0 2px' }} aria-label="Return chart legend">
        {[
          ['Raw reward rₖ', rawColor],
          ['Discount weight γᵏ', weightColor],
          ['Worth now γᵏrₖ', contributionColor],
          ['Current step', cursorColor],
        ].map(([label, color]) => (
          <span key={label} style={{ color }}><span style={{ display: 'inline-block', width: 18, height: 4, background: color, marginRight: 6, verticalAlign: 'middle' }} />{label}</span>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Discounted return is ${result.total.toFixed(3)} at gamma ${gamma.toFixed(2)}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id={clipId}><rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} /></clipPath></defs>
        <text x={plot.x} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>Raw rewards stay fixed; only their value at step 0 fades with time</text>
        <line x1={plot.x} y1={plot.y + plot.h} x2={plot.x + plot.w} y2={plot.y + plot.h} stroke={t.border} strokeWidth={1.5} />
        <line x1={plot.x} y1={plot.y} x2={plot.x} y2={plot.y + plot.h} stroke={t.border} strokeWidth={1.5} />
        {[0, Math.round(delay / 2), delay].filter((value, index, all) => all.indexOf(value) === index).map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} y1={plot.y + plot.h} x2={x(tick)} y2={plot.y + plot.h + 5} stroke={t.border} />
            <text x={x(tick)} y={plot.y + plot.h + 23} textAnchor="middle" fontSize={14} fill={t.textSecondary}>step {tick}</text>
          </g>
        ))}
        <text x={plot.x - 8} y={plot.y + 6} textAnchor="end" fontSize={14} fill={rawColor}>{maxReward.toFixed(0)} points</text>
        <text x={W - 4} y={plot.y + 6} textAnchor="end" fontSize={14} fill={weightColor}>weight 1.0</text>
        <text x={W - 4} y={plot.y + plot.h} textAnchor="end" fontSize={14} fill={weightColor}>0.0</text>

        <g clipPath={`url(#${clipId})`}>
          <polyline points={weights.map((point) => `${x(point.step)},${weightY(point.value)}`).join(' ')} fill="none" stroke={weightColor} strokeWidth={2.5} />
          {weights.map((point) => <circle key={point.step} cx={x(point.step)} cy={weightY(point.value)} r={3.2} fill={weightColor} opacity={point.step <= currentStep ? 1 : 0.28} />)}
          {result.terms.map((term) => {
            const cx = x(term.step);
            const rawTop = rewardY(term.reward);
            const contributionTop = rewardY(term.contribution);
            return (
              <g key={term.step} opacity={term.step <= currentStep ? 1 : 0.28}>
                <rect x={cx - 24} y={rawTop} width={18} height={plot.y + plot.h - rawTop} rx={3} fill={rawColor} fillOpacity={0.35} stroke={rawColor} strokeWidth={1.5} />
                <rect x={cx + 4} y={contributionTop} width={18} height={plot.y + plot.h - contributionTop} rx={3} fill={contributionColor} />
              </g>
            );
          })}
          <line x1={x(currentStep)} y1={plot.y} x2={x(currentStep)} y2={plot.y + plot.h} stroke={cursorColor} strokeWidth={2} strokeDasharray="5 4" />
        </g>
        {result.terms.map((term) => (
          <text key={`label-${term.step}`} x={term.step === 0 ? x(term.step) + 3 : x(term.step) - 3} y={Math.max(plot.y + 18, rewardY(term.reward) - 8)} textAnchor={term.step === 0 ? 'start' : 'end'} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            r{term.step}={term.reward.toFixed(1)} → {term.contribution.toFixed(2)} now
          </text>
        ))}
        <text x={plot.x + plot.w / 2} y={H - 8} textAnchor="middle" fontSize={14} fill={t.textSecondary}>k = number of steps from now</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="Discounted return" latex={String.raw`G_0 = \sum_{k=0}^{K}\gamma^k r_k`} color="yellow" tilt={-1}>
            <p style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>G₀ = <strong>{result.total.toFixed(3)}</strong></p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${currentStep}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Discounted return" latex={String.raw`G_0 = \sum_{k=0}^{K}\gamma^k r_k`} color="yellow" tilt={-1}>
              <p>rₖ is the reward k steps away; γ is the fraction of future value kept per step.</p>
            </StickyNote>
            <StickyNote title="Future-value half-life" latex={String.raw`k_{1/2} = \frac{\ln(0.5)}{\ln(\gamma)}`} color="pink" tilt={1}>
              <p>The weight halves after <strong>{Number.isFinite(halfLife) ? `${halfLife.toFixed(2)} steps` : 'infinitely many steps'}</strong>.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>{rewardNow.toFixed(1)} + {gamma.toFixed(2)}^{delay} × {rewardLater.toFixed(1)} = {rewardNow.toFixed(1)} + {result.terms[1].contribution.toFixed(3)} = <strong>{result.total.toFixed(3)}</strong></p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${currentStep} of ${delay}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
          </StickyRow>
          <PredictChallenge
            prompt="With γ = 0.50, which is worth more at step 0: 2 points now or 8 points after 4 steps?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="The later reward is worth 0.5⁴ × 8 = 0.5 now, so 2 points now wins."
            actionLabel="Run γ = 0.50, k = 4 now"
            onAction={() => {
              setGamma(0.5);
              setRewardNow(2);
              setRewardLater(8);
              setDelay(4);
              playback.playFromStart();
            }}
          />
        </>
      )}
    </>
  );
}

export default function ReturnDiscountingDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Return discounting playground"
      footer={compact ? undefined : 'Every bar and note is calculated from the two rewards, their delay, and γ. This is a finite teaching example of the standard reinforcement-learning return equation.'}
    >
      <ReturnDiscountingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
