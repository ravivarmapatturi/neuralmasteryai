import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import { StickyNote, StickyRow, VisualizationContainer, VisualizationHeader, VizButton, useVizVisible } from '../primitives';
import { analyzeDeploymentStages, explainDeploymentStage } from '../lib/stagedDeployment';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Under 5%',
  'About 50%',
  'Over 95%',
] as const;

function StagedDeploymentPlayground({ compact, outerVisible }: { compact: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const audienceClip = useId();
  const chanceClip = useId();
  const [oneIn, setOneIn] = useState(2000);
  const [internal, setInternal] = useState(50);
  const [pilot, setPilot] = useState(1950);
  const [limited, setLimited] = useState(48000);
  const [general, setGeneral] = useState(1_950_000);
  const [prediction, setPrediction] = useState<number | null>(null);
  const issueRate = 1 / oneIn;
  const stages = useMemo(() => analyzeDeploymentStages(issueRate, [
    { name: 'Internal test', interactions: internal },
    { name: 'Trusted pilot', interactions: pilot },
    { name: 'Limited release', interactions: limited },
    { name: 'General release', interactions: general },
  ]), [general, internal, issueRate, limited, pilot]);
  const playback = useStepPlayback(stages.length, 1600, 1, outerVisible);
  const active = stages[playback.step];
  const caption = explainDeploymentStage(active, playback.step, stages.length);

  const audienceColor = t.accentSecondary;
  const chanceColor = t.accentPrimary;
  const issueColor = t.accentDanger;
  const currentColor = t.accentPurple;
  const maxAudience = Math.max(10, stages.at(-1)?.cumulativeInteractions ?? 10);
  const logAudience = (n: number) => Math.log10(Math.max(1, n)) / Math.log10(maxAudience);

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
                title="Find a rare issue before everyone sees it"
                description="Staged deployment limits how many interactions are exposed while evidence accumulates about failures that ordinary tests can miss."
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
            <NumericField label="Issue frequency (1 in …)" hint="independent chance per interaction" value={oneIn} min={10} max={1_000_000} onChange={(value) => update(setOneIn, value)} />
            <NumericField label="Internal interactions" hint="employees and test accounts" value={internal} min={1} max={100_000} onChange={(value) => update(setInternal, value)} />
            <NumericField label="Pilot interactions" hint="trusted external group" value={pilot} min={1} max={500_000} onChange={(value) => update(setPilot, value)} />
            <NumericField label="Limited interactions" hint="small public rollout" value={limited} min={1} max={2_000_000} onChange={(value) => update(setLimited, value)} />
            <NumericField label="General interactions" hint="remaining wide rollout" value={general} min={1} max={10_000_000} onChange={(value) => update(setGeneral, value)} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', fontSize: 15, margin: '7px 0 2px' }} aria-label="Staged deployment legend">
        {[
          ['Cumulative interactions (log width)', audienceColor],
          ['Chance issue has appeared', chanceColor],
          ['Expected issue count', issueColor],
          ['Current gate', currentColor],
        ].map(([label, color]) => (
          <span key={label} style={{ color }}><span style={{ display: 'inline-block', width: 18, height: 4, background: color, marginRight: 6, verticalAlign: 'middle' }} />{label}</span>
        ))}
      </div>

      <svg width="100%" viewBox="0 0 760 300" role="img" aria-label={`${active.name} has ${(active.cumulativeProbability * 100).toFixed(1)} percent cumulative detection probability`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id={audienceClip}><rect x={164} y={50} width={190} height={210} /></clipPath>
          <clipPath id={chanceClip}><rect x={448} y={50} width={246} height={210} /></clipPath>
        </defs>
        <text x={164} y={25} fontSize={16} fontWeight={700} fill={audienceColor}>How far the rollout has reached</text>
        <text x={448} y={25} fontSize={16} fontWeight={700} fill={chanceColor}>Chance of at least one issue</text>
        <text x={448} y={44} fontSize={14} fill={t.textSecondary}>0%</text>
        <text x={694} y={44} textAnchor="end" fontSize={14} fill={t.textSecondary}>100%</text>
        {stages.map((stage, index) => {
          const y = 58 + index * 54;
          const reached = index <= playback.step;
          const current = index === playback.step;
          return (
            <g key={stage.name} opacity={reached ? 1 : 0.28}>
              {current && <rect x={6} y={y - 19} width={736} height={42} rx={7} fill={currentColor} fillOpacity={0.09} />}
              <text x={12} y={y} fontSize={15} fontWeight={current ? 700 : 400} fill={current ? currentColor : t.textPrimary}>{index + 1}. {stage.name}</text>
              <text x={12} y={y + 18} fontSize={14} fill={t.textSecondary}>+{stage.interactions.toLocaleString('en-US')} now</text>
              <g clipPath={`url(#${audienceClip})`}>
                <rect x={164} y={y - 12} width={190} height={18} rx={4} fill={t.surfaceAlt} />
                <rect x={164} y={y - 12} width={190 * logAudience(stage.cumulativeInteractions)} height={18} rx={4} fill={audienceColor} />
              </g>
              <text x={364} y={y + 2} fontSize={14} fill={audienceColor}>{stage.cumulativeInteractions.toLocaleString('en-US')}</text>
              <g clipPath={`url(#${chanceClip})`}>
                <rect x={448} y={y - 12} width={246} height={18} rx={4} fill={t.surfaceAlt} />
                <rect x={448} y={y - 12} width={246 * stage.cumulativeProbability} height={18} rx={4} fill={chanceColor} />
              </g>
              <text x={734} y={y + 2} textAnchor="end" fontSize={14} fontWeight={700} fill={stage.cumulativeProbability >= 0.5 ? chanceColor : t.textSecondary}>{(stage.cumulativeProbability * 100).toFixed(1)}%</text>
              <text x={448} y={y + 20} fontSize={14} fill={issueColor}>expected issues so far: {stage.expectedIssuesCumulative.toFixed(2)}</text>
            </g>
          );
        })}
        <line x1={12} y1={272} x2={742} y2={272} stroke={t.border} strokeDasharray="5 4" />
        <text x={12} y={290} fontSize={14} fill={t.textSecondary}>A gate can stop the next stage; it cannot erase interactions already exposed.</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="Detection chance" latex={String.raw`P(\text{see at least one}) = 1 - (1-p)^n`} color="yellow" tilt={-1}>
            <p style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{(active.cumulativeProbability * 100).toFixed(1)}% after n = {active.cumulativeInteractions.toLocaleString('en-US')}</p>
          </StickyNote>
          <StickyNote title={`What just happened · gate ${playback.step + 1}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Chance of seeing the issue" latex={String.raw`P(\text{at least one}) = 1 - (1-p)^n`} color="yellow" tilt={-1}>
              <p>p is the issue chance per interaction; n is every interaction reached so far.</p>
            </StickyNote>
            <StickyNote title="Expected issue count" latex={String.raw`E[\text{issues}] = n\,p`} color="pink" tilt={1}>
              <p>This is an average across repeated rollouts, not a promise about one rollout.</p>
            </StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · ${active.name}`} color="green" tilt={-1}>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>1 − (1 − 1/{oneIn.toLocaleString('en-US')})^{active.cumulativeInteractions.toLocaleString('en-US')} = <strong>{(active.cumulativeProbability * 100).toFixed(2)}%</strong></p>
              <p style={{ fontVariantNumeric: 'tabular-nums' }}>n × p = <strong>{active.expectedIssuesCumulative.toFixed(2)}</strong> expected issues</p>
            </StickyNote>
            <StickyNote title={`What just happened · gate ${playback.step + 1} of ${stages.length}`} color="blue" tilt={1} live><p>{caption}</p></StickyNote>
          </StickyRow>
          <PredictChallenge
            prompt="An issue happens once in 2,000 interactions. What is the chance that 50 internal interactions see it?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="1 − (1 − 1/2,000)⁵⁰ is about 2.47%, so a clean internal test does not prove the tail is gone."
            actionLabel="Run the 1-in-2,000 rollout now"
            onAction={() => {
              setOneIn(2000);
              setInternal(50);
              setPilot(1950);
              setLimited(48000);
              setGeneral(1_950_000);
              playback.playFromStart();
            }}
          />
        </>
      )}
    </>
  );
}

export default function StagedDeploymentDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Staged deployment playground"
      footer={compact ? undefined : 'This is exact Bernoulli detection math under the stated independence assumption. Real failures can cluster, so the calculated probability is a model, while the cumulative interaction count is exact.'}
    >
      <StagedDeploymentPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
