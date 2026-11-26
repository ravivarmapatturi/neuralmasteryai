import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import { PillSelect, StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton, useVizVisible } from '../primitives';
import {
  buildRewardCheckpoints,
  buildRewardTrace,
  explainRewardStep,
  firstProxyLead,
  strategyTotal,
} from '../lib/specificationGaming';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

type StrategyId = 'finish' | 'loop';

const PREDICT_OPTIONS = [
  'Finish once: 10 points',
  'Loop six times: 10.8 points',
  'They tie at 10 points',
] as const;

function SpecificationGamingPlayground({ compact, outerVisible }: { compact: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const clipId = useId();
  const [horizon, setHorizon] = useState(40);
  const [finishEvery, setFinishEvery] = useState(20);
  const [finishReward, setFinishReward] = useState(10);
  const [loopEvery, setLoopEvery] = useState(3);
  const [loopReward, setLoopReward] = useState(1.8);
  const [strategy, setStrategy] = useState<StrategyId>('loop');
  const [prediction, setPrediction] = useState<number | null>(null);
  const intended = useMemo(() => ({ name: 'Finish the race', interval: finishEvery, reward: finishReward }), [finishEvery, finishReward]);
  const proxy = useMemo(() => ({ name: 'Loop over the bonus', interval: loopEvery, reward: loopReward }), [loopEvery, loopReward]);
  const trace = useMemo(() => buildRewardTrace(horizon, intended, proxy), [horizon, intended, proxy]);
  const checkpoints = useMemo(() => buildRewardCheckpoints(horizon, 21), [horizon]);
  const playback = useStepPlayback(checkpoints.length, 650, Math.min(5, checkpoints.length - 1), outerVisible);
  const currentStep = checkpoints[playback.step] ?? 0;
  const current = trace[currentStep] ?? trace[0];
  const caption = explainRewardStep(current, horizon, intended, proxy);
  const leadStep = firstProxyLead(trace);

  const finishColor = t.accentSecondary;
  const loopColor = t.accentDanger;
  const cursorColor = t.accentPurple;
  const eventColor = t.accentWarn;
  const plot = { x: 58, y: 40, w: 660, h: 200 };
  const maxTotal = Math.max(1, ...trace.flatMap((point) => [point.intendedTotal, point.proxyTotal]));
  const x = (step: number) => plot.x + (step / horizon) * plot.w;
  const y = (value: number) => plot.y + plot.h - (value / (maxTotal * 1.12)) * plot.h;

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
                title="When the score rewards the wrong behavior"
                description="Specification gaming happens when an agent can earn more measured reward by repeating a shortcut than by completing the task we meant."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div style={{ alignSelf: 'end' }}>
              <PillSelect<StrategyId> label="Strategy to inspect" value={strategy} onChange={(value) => setStrategy(typeof value === 'function' ? value(strategy) : value)} options={[{ value: 'finish', label: 'Finish' }, { value: 'loop', label: 'Bonus loop' }]} />
            </div>
            <NumericField label="Training horizon H" hint="steps the score counts" value={horizon} min={5} max={100} onChange={(value) => update(setHorizon, value)} />
            <NumericField label="Finish every L_f steps" hint="time to complete the task" value={finishEvery} min={2} max={50} onChange={(value) => update(setFinishEvery, value)} />
            <NumericField label="Finish reward r_f" hint="points for completion" value={finishReward} min={0.5} max={30} step={0.5} integer={false} onChange={(value) => update(setFinishReward, value)} />
            <NumericField label="Bonus every L_b steps" hint="shortcut repeats faster" value={loopEvery} min={1} max={20} onChange={(value) => update(setLoopEvery, value)} />
            <NumericField label="Bonus reward r_b" hint="points per shortcut loop" value={loopReward} min={0.1} max={10} step={0.1} integer={false} onChange={(value) => update(setLoopReward, value)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, margin: '6px 0 2px' }} aria-label="Reward strategy legend">
        {[
          ['Intended: finish the race', finishColor],
          ['Proxy shortcut: repeat bonus', loopColor],
          ['Current training step', cursorColor],
          ['Reward event', eventColor],
        ].map(([label, color]) => <span key={label} style={{ color }}><span style={{ display: 'inline-block', width: 18, height: 4, background: color, marginRight: 6, verticalAlign: 'middle' }} />{label}</span>)}
      </div>

      <svg width="100%" viewBox="0 0 760 290" role="img" aria-label={caption} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs><clipPath id={clipId}><rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} /></clipPath></defs>
        <text x={plot.x} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>Cumulative measured reward as training keeps running</text>
        <line x1={plot.x} y1={plot.y} x2={plot.x} y2={plot.y + plot.h} stroke={t.border} strokeWidth={1.5} />
        <line x1={plot.x} y1={plot.y + plot.h} x2={plot.x + plot.w} y2={plot.y + plot.h} stroke={t.border} strokeWidth={1.5} />
        {[0, Math.round(horizon / 2), horizon].map((tick) => <text key={tick} x={x(tick)} y={plot.y + plot.h + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>{tick} steps</text>)}
        {[0, maxTotal / 2, maxTotal].map((tick) => <text key={tick} x={plot.x - 8} y={y(tick) + 5} textAnchor="end" fontSize={14} fill={t.textSecondary}>{tick.toFixed(0)}</text>)}
        <g clipPath={`url(#${clipId})`}>
          <polyline points={trace.map((point) => `${x(point.step)},${y(point.intendedTotal)}`).join(' ')} fill="none" stroke={finishColor} strokeWidth={3} opacity={strategy === 'finish' ? 1 : 0.65} />
          <polyline points={trace.map((point) => `${x(point.step)},${y(point.proxyTotal)}`).join(' ')} fill="none" stroke={loopColor} strokeWidth={3} opacity={strategy === 'loop' ? 1 : 0.65} />
          {trace.filter((point) => point.step > 0 && point.step % finishEvery === 0).map((point) => <circle key={`f-${point.step}`} cx={x(point.step)} cy={y(point.intendedTotal)} r={3.5} fill={eventColor} />)}
          {trace.filter((point) => point.step > 0 && point.step % loopEvery === 0).map((point) => <circle key={`l-${point.step}`} cx={x(point.step)} cy={y(point.proxyTotal)} r={3.2} fill={eventColor} />)}
          <line x1={x(currentStep)} y1={plot.y} x2={x(currentStep)} y2={plot.y + plot.h} stroke={cursorColor} strokeWidth={2} strokeDasharray="5 4" />
          <circle cx={x(currentStep)} cy={y(current.intendedTotal)} r={5} fill={finishColor} stroke={t.background} strokeWidth={1.5} />
          <circle cx={x(currentStep)} cy={y(current.proxyTotal)} r={5} fill={loopColor} stroke={t.background} strokeWidth={1.5} />
        </g>
        <text x={Math.min(plot.x + plot.w - 8, x(currentStep) + 10)} y={Math.max(plot.y + 18, y(current.intendedTotal) - 10)} fontSize={14} fontWeight={700} fill={finishColor}>{current.intendedTotal.toFixed(1)}</text>
        <text x={Math.min(plot.x + plot.w - 8, x(currentStep) + 10)} y={Math.min(plot.y + plot.h - 8, y(current.proxyTotal) + 18)} fontSize={14} fontWeight={700} fill={loopColor}>{current.proxyTotal.toFixed(1)}</text>
        <text x={plot.x + plot.w / 2} y={284} textAnchor="middle" fontSize={14} fill={t.textSecondary}>The shorter interval creates more reward events, so the proxy shortcut can overtake the real goal.</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={strategy === 'finish' ? 'Finish score' : 'Bonus-loop score'} latex={strategy === 'finish' ? String.raw`R_f(h)=\left\lfloor\frac{h}{L_f}\right\rfloor r_f` : String.raw`R_b(h)=\left\lfloor\frac{h}{L_b}\right\rfloor r_b`} color="yellow" tilt={-1}>
            <p style={{ textAlign: 'center' }}>{strategy === 'finish' ? current.intendedTotal.toFixed(1) : current.proxyTotal.toFixed(1)} points at h = {currentStep}</p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${currentStep}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Finish the intended task" latex={String.raw`R_f(h)=\left\lfloor\frac{h}{L_f}\right\rfloor r_f`} color="yellow" tilt={-1} active={strategy === 'finish'} onSelect={() => setStrategy('finish')}>
              <p>A completion pays r_f every L_f steps.</p>
            </StickyNote>
            <StickyNote title="Repeat the proxy bonus" latex={String.raw`R_b(h)=\left\lfloor\frac{h}{L_b}\right\rfloor r_b`} color="pink" tilt={1} active={strategy === 'loop'} onSelect={() => setStrategy('loop')}>
              <p>A shortcut pays r_b every L_b steps, even though the task never finishes.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · h = ${currentStep}`} color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>Finish: floor({currentStep}/{finishEvery}) × {finishReward.toFixed(1)} = <strong>{strategyTotal(currentStep, intended).toFixed(1)}</strong></p>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>Loop: floor({currentStep}/{loopEvery}) × {loopReward.toFixed(1)} = <strong>{strategyTotal(currentStep, proxy).toFixed(1)}</strong>{leadStep === null ? '' : `; first leads at step ${leadStep}`}</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${currentStep} of ${horizon}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
          </StickyRow>
          <PredictChallenge
            prompt="At h = 20, which strategy earns more under finish +10 every 20 steps versus bonus +1.8 every 3 steps?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Six bonus loops fit in 20 steps, so 6 × 1.8 = 10.8 beats one 10-point finish."
            actionLabel="Run the 20-step comparison now"
            onAction={() => {
              setHorizon(20);
              setFinishEvery(20);
              setFinishReward(10);
              setLoopEvery(3);
              setLoopReward(1.8);
              setStrategy('loop');
              playback.playFromStart();
            }}
          />
        </>
      )}
    </>
  );
}

export default function SpecificationGamingDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Specification gaming playground"
      footer={compact ? undefined : 'The reward totals are exact for the editable teaching rules. They explain the mechanism behind a repeated shaping-reward shortcut; they are not measured CoastRunners game scores.'}
    >
      <SpecificationGamingPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
