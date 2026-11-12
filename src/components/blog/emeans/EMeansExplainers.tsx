import { useMemo, useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { Slider, VisualizationContainer, VisualizationHeader, VizButton } from '../../../viz/primitives';
import { batchWeights, cosineStep, emaStep, reviveSplit, type Vec } from './emeansMath';

const svgStyle = { width: '100%', height: 'auto', display: 'block' } as const;

/** How much each past batch still counts in a centroid: equal-weight running mean vs e-means' fading average. */
export function ForgettingWeights() {
  const t = useVizTokens();
  const [alpha, setAlpha] = useState(0.3);
  const batches = 10;
  const runningMean = Array.from({ length: batches }, () => 1 / batches);
  const ema = batchWeights(batches, alpha);
  const oldest = (w: number[]) => Math.round((w[0] + w[1] + w[2]) * 100);
  const W = 520;
  const barW = 38;
  const gap = 12;
  const left = 15;
  const row = (weights: number[], y: number, colour: string) => (
    <g>
      {weights.map((w, i) => {
        const h = Math.max(1, w * 240);
        return (
          <g key={i}>
            <rect x={left + i * (barW + gap)} y={y - h} width={barW} height={h} rx={4} fill={colour} opacity={i < 3 ? 0.55 : 0.95} />
            <text x={left + i * (barW + gap) + barW / 2} y={y - h - 5} textAnchor="middle" fill={t.textSecondary} fontSize={15}>
              {Math.round(w * 100)}%
            </text>
          </g>
        );
      })}
      <line x1={left - 6} x2={W - 8} y1={y} y2={y} stroke={t.border} />
    </g>
  );
  return (
    <VisualizationContainer
      title="How much does each past batch still count?"
      footer="Batch 1 is the oldest. The pale bars are the first three batches, assigned while the centroids were still in poor places."
    >
      <VisualizationHeader title="How much does each past batch still count?" />
      <svg viewBox={`0 0 ${W} 300`} style={svgStyle} role="img" aria-label="Weight of each past batch in a running mean versus an exponential moving average">
        <text x={left} y={20} fill={t.textPrimary} fontSize={17} fontWeight={700}>Running mean: first 3 batches keep {oldest(runningMean)}%</text>
        {row(runningMean, 120, t.accentSecondary)}
        <text x={left} y={160} fill={t.textPrimary} fontSize={17} fontWeight={700}>e-means (α = {alpha.toFixed(2)}): first 3 batches keep {oldest(ema)}%</text>
        {row(ema, 268, t.accentPrimary)}
        {Array.from({ length: batches }, (_, i) => (
          <text key={i} x={left + i * (barW + gap) + barW / 2} y={292} textAnchor="middle" fill={t.textMuted} fontSize={14}>
            {i === 0 ? 'old' : i === batches - 1 ? 'new' : i + 1}
          </text>
        ))}
      </svg>
      <Slider label="Step α" value={alpha} onChange={setAlpha} min={0.05} max={0.9} step={0.05} format={(v) => v.toFixed(2)} />
    </VisualizationContainer>
  );
}

/** One e-means update for one cluster: the centroid moves part of the way towards this batch's points. */
export function OneBatchStep() {
  const t = useVizTokens();
  const [alpha, setAlpha] = useState(0.2);
  const [pointsInBatch, setPointsInBatch] = useState(2);
  const all: Vec[] = [[1, 1], [2, 0], [1.5, 1.4], [2.2, 0.8]];
  const pts = all.slice(0, pointsInBatch);
  const before = { S: [0, 0] as Vec, N: 2 };
  const after = emaStep(before.S, before.N, pts, alpha);
  const batchMean: Vec | null = pts.length
    ? [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
    : null;
  const sx = (x: number) => 50 + x * 160;
  const sy = (y: number) => 250 - y * 140;
  const share = pts.length ? Math.round(((alpha * pts.length) / after.N) * 100) : 0;
  return (
    <VisualizationContainer
      title="One batch, one cluster"
      footer={
        pts.length
          ? `The centroid moved ${share}% of the way to the batch's average. Old centroid (0, 0) → new (${after.c[0].toFixed(2)}, ${after.c[1].toFixed(2)}).`
          : 'No points from this cluster in the batch: the sum and the count both fade by the same factor, so the centroid stays exactly where it was.'
      }
    >
      <VisualizationHeader title="One batch, one cluster" />
      <svg viewBox="0 0 440 290" style={svgStyle} role="img" aria-label="Old centroid, batch points and the new centroid after one e-means update">
        <line x1={sx(-0.2)} x2={sx(2.4)} y1={sy(0)} y2={sy(0)} stroke={t.border} />
        <line x1={sx(0)} x2={sx(0)} y1={sy(-0.2)} y2={sy(1.6)} stroke={t.border} />
        {batchMean && <line x1={sx(0)} y1={sy(0)} x2={sx(batchMean[0])} y2={sy(batchMean[1])} stroke={t.textMuted} strokeDasharray="5 5" />}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={7} fill={t.accentSecondary} />
        ))}
        {batchMean && (
          <g>
            <circle cx={sx(batchMean[0])} cy={sy(batchMean[1])} r={6} fill="none" stroke={t.accentSecondary} strokeWidth={2} />
            <text x={sx(batchMean[0]) + 10} y={sy(batchMean[1]) + 18} fill={t.textSecondary} fontSize={13}>batch average</text>
          </g>
        )}
        <circle cx={sx(0)} cy={sy(0)} r={8} fill={t.textMuted} />
        <text x={sx(0) + 8} y={sy(0) + 22} fill={t.textSecondary} fontSize={13}>old centroid</text>
        <circle cx={sx(after.c[0])} cy={sy(after.c[1])} r={9} fill={t.accentPrimary} stroke={t.textPrimary} strokeWidth={1.5} />
        <text x={sx(after.c[0]) - 4} y={sy(after.c[1]) - 14} fill={t.textPrimary} fontSize={13} fontWeight={700}>new centroid</text>
      </svg>
      <Slider label="Step α" value={alpha} onChange={setAlpha} min={0.05} max={1} step={0.05} format={(v) => v.toFixed(2)} />
      <Slider label="Points from this cluster in the batch" value={pointsInBatch} onChange={setPointsInBatch} min={0} max={4} step={1} />
    </VisualizationContainer>
  );
}

/** The step α over a run: large at the start, a tenth of that at the end, following a cosine. */
export function CosineStepSchedule() {
  const t = useVizTokens();
  const [step, setStep] = useState(0);
  const M = 100;
  const alpha0 = 0.36;
  const W = 460;
  const H = 220;
  const x = (s: number) => 50 + (s / M) * (W - 70);
  const y = (a: number) => H - 40 - (a / alpha0) * (H - 70);
  const path = useMemo(
    () => Array.from({ length: M + 1 }, (_, s) => `${s ? 'L' : 'M'}${x(s).toFixed(1)} ${y(cosineStep(s, M, alpha0)).toFixed(1)}`).join(''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const a = cosineStep(step, M, alpha0);
  return (
    <VisualizationContainer title="Big moves first, small moves at the end" footer={`Update ${step} of ${M}: α = ${a.toFixed(3)}. It starts at α₀ = ${alpha0} and ends at 0.1 × α₀ = ${(alpha0 * 0.1).toFixed(3)}.`}>
      <VisualizationHeader title="Big moves first, small moves at the end" />
      <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle} role="img" aria-label="Cosine schedule of the e-means step size">
        <line x1={50} x2={W - 20} y1={H - 40} y2={H - 40} stroke={t.border} />
        <line x1={50} x2={50} y1={20} y2={H - 40} stroke={t.border} />
        <text x={W / 2} y={H - 10} textAnchor="middle" fill={t.textSecondary} fontSize={12}>update number</text>
        <text x={14} y={30} fill={t.textSecondary} fontSize={12}>α</text>
        <path d={path} fill="none" stroke={t.accentPrimary} strokeWidth={3} />
        <circle cx={x(step)} cy={y(a)} r={7} fill={t.accentWarn} stroke={t.textPrimary} />
      </svg>
      <Slider label="Update number" value={step} onChange={setStep} min={0} max={M} step={1} />
    </VisualizationContainer>
  );
}

/** A cluster that lost all its points gets a new centroid by splitting a busy cluster in two. */
export function DeadClusterRevival() {
  const t = useVizTokens();
  const [stage, setStage] = useState(0);
  const donorPoints: Vec[] = useMemo(
    () => Array.from({ length: 24 }, (_, i) => [1 + (i % 6) * 0.45, 1.2 + Math.floor(i / 6) * 0.25 + ((i * 7) % 5) * 0.03] as Vec),
    [],
  );
  const split = useMemo(() => reviveSplit(donorPoints, 0.08, 4), [donorPoints]);
  const dead: Vec = [3.0, 2.8];
  const sx = (v: number) => 30 + v * 95;
  const sy = (v: number) => 290 - (v - 0.6) * 110;
  const centroids: { c: Vec; label: string; colour: string }[] =
    stage === 0
      ? [{ c: split.donor, label: 'busy cluster', colour: t.accentSecondary }, { c: dead, label: 'dead: 0 points', colour: t.accentDanger }]
      : stage === 1
        ? [{ c: split.children[0], label: 'child A', colour: t.accentSecondary }, { c: split.children[1], label: 'child B (was dead)', colour: t.accentWarn }]
        : [{ c: split.settled[0], label: 'cluster A', colour: t.accentSecondary }, { c: split.settled[1], label: 'cluster B', colour: t.accentWarn }];
  const owner = (p: Vec) => {
    if (stage === 0) return 0;
    const cs = stage === 1 ? split.children : split.settled;
    const d = cs.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2);
    return d[0] <= d[1] ? 0 : 1;
  };
  const captions = [
    'Every five batches, e-means looks for clusters whose count has fallen below a tenth of the average count. This one gets no points at all.',
    'It picks a donor (busier clusters are more likely to be picked), copies its centroid twice and nudges the copies a tiny amount in opposite directions. The donor’s count is split between them. The nudge is exaggerated here so you can see it.',
    'The next batches pull the two copies apart, each keeping roughly half of the old cluster. The empty slot is useful again.',
  ];
  return (
    <VisualizationContainer title="Reviving a dead cluster" footer={captions[stage]}>
      <VisualizationHeader title="Reviving a dead cluster" />
      <svg viewBox="0 0 420 320" style={svgStyle} role="img" aria-label="Dead cluster revival by splitting a donor cluster">
        {donorPoints.map((p, i) => (
          <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={5} fill={owner(p) === 0 ? t.accentSecondary : t.accentWarn} opacity={0.75} />
        ))}
        {centroids.map(({ c, label, colour }, i) => (
          <g key={label}>
            <circle cx={sx(c[0])} cy={sy(c[1])} r={10} fill={colour} stroke={t.textPrimary} strokeWidth={2} />
            <text x={sx(c[0])} y={i === 0 && stage > 0 ? sy(c[1]) + 32 : sy(c[1]) - 18} textAnchor="middle" fill={t.textPrimary} fontSize={16} fontWeight={700}>{label}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <VizButton onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0}>← Back</VizButton>
        <VizButton onClick={() => setStage((s) => Math.min(2, s + 1))} disabled={stage === 2}>Next →</VizButton>
      </div>
    </VisualizationContainer>
  );
}
