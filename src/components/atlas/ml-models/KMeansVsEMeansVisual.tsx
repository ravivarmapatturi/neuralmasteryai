import { useMemo, useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import {
  TOY_CLUSTER_POINTS,
  INITIAL_CENTROIDS,
  computeLoss,
  cosineAlpha,
  eMeansStep,
  lloydStep,
  type Point2D,
} from './kmeansEMeansMath';

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export default function KMeansVsEMeansVisual() {
  const t = useVizTokens();
  const [step, setStep] = useState(0);

  const totalSteps = 6;
  const batchSize = 8;
  const points = TOY_CLUSTER_POINTS;

  // Precompute trajectories so scrubbing is instant and 100% deterministic
  const { lloydHistory, eMeansHistory } = useMemo(() => {
    // 1. Lloyd trajectory (each step is 1 full-batch epoch)
    const lHistory: Array<{
      centroids: Point2D[];
      assignments: number[];
      loss: number;
    }> = [];

    let curL = INITIAL_CENTROIDS;
    lHistory.push({
      centroids: curL,
      assignments: points.map((p) => {
        let best = 0;
        let dMin = Infinity;
        curL.forEach((c, idx) => {
          const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
          if (d < dMin) {
            dMin = d;
            best = idx;
          }
        });
        return best;
      }),
      loss: computeLoss(points, curL),
    });

    for (let s = 1; s <= totalSteps; s++) {
      const res = lloydStep(points, curL);
      curL = res.centroids;
      lHistory.push(res);
    }

    // 2. e-means trajectory (each step is 1 mini-batch EMA update)
    const eHistory: Array<{
      centroids: Point2D[];
      batchIndices: number[];
      batchAssignments: number[];
      alpha: number;
      loss: number;
    }> = [];

    let curE = INITIAL_CENTROIDS;
    let rSums = curE.map((c) => ({ x: c.x * 2, y: c.y * 2 }));
    let rCounts = [2, 2, 2];

    eHistory.push({
      centroids: curE,
      batchIndices: [],
      batchAssignments: [],
      alpha: 0.5,
      loss: computeLoss(points, curE),
    });

    for (let s = 1; s <= totalSteps; s++) {
      const alpha = cosineAlpha(s - 1, totalSteps, 0.45);
      const bIndices: number[] = [];
      const start = ((s - 1) * batchSize) % points.length;
      for (let i = 0; i < batchSize; i++) {
        bIndices.push((start + i) % points.length);
      }
      const batch = bIndices.map((i) => points[i]);

      const res = eMeansStep(batch, points, curE, rSums, rCounts, alpha);
      curE = res.centroids;
      rSums = res.runningSums;
      rCounts = res.runningCounts;

      eHistory.push({
        centroids: curE,
        batchIndices: bIndices,
        batchAssignments: res.batchAssignments,
        alpha,
        loss: res.loss,
      });
    }

    return { lloydHistory: lHistory, eMeansHistory: eHistory };
  }, [points]);

  const lState = lloydHistory[step];
  const eState = eMeansHistory[step];

  const maxLoss = Math.max(lloydHistory[0].loss, eMeansHistory[0].loss);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '0.75rem',
        borderRadius: '10px',
        background: t.surface,
        border: `1px solid ${t.border}`,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div>
          <strong style={{ fontSize: '0.95rem', color: t.textPrimary }}>
            Side-by-Side: Lloyd (Full-Batch) vs. e-means (Mini-Batch EMA)
          </strong>
          <div style={{ fontSize: '0.78rem', color: t.textSecondary }}>
            Step {step} of {totalSteps} {step === 0 ? '(Initial state)' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
              background: t.surfaceAlt,
              color: t.textPrimary,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.5 : 1,
              fontFamily: "'Kalam', cursive",
            }}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            disabled={step === totalSteps}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
              background: t.surfaceAlt,
              color: t.textPrimary,
              cursor: step === totalSteps ? 'not-allowed' : 'pointer',
              opacity: step === totalSteps ? 0.5 : 1,
              fontFamily: "'Kalam', cursive",
            }}
          >
            Next Step →
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
              background: t.surfaceAlt,
              color: t.textSecondary,
              cursor: 'pointer',
              fontFamily: "'Kalam', cursive",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* Left: Lloyd */}
        <div
          style={{
            border: `1px solid ${t.border}`,
            borderRadius: '8px',
            padding: '0.6rem',
            background: t.surfaceAlt,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: t.textPrimary }}>
              Lloyd k-means (1957)
            </span>
            <span style={{ fontSize: '0.78rem', color: t.accentPrimary, fontWeight: 700 }}>
              Loss: {lState.loss.toFixed(1)}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: '0 0 0.4rem 0' }}>
            Full-batch pass: all {points.length} points re-assigned each iteration.
          </p>

          <svg
            viewBox="0 0 100 100"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '220px',
              background: t.background,
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
            }}
            role="img"
            aria-label="Lloyd k-means cluster scatter plot"
          >
            {/* Draw data points */}
            {points.map((p, idx) => {
              const cIdx = lState.assignments[idx];
              const color = CLUSTER_COLORS[cIdx];
              return (
                <circle
                  key={`l-p-${idx}`}
                  cx={p.x}
                  cy={100 - p.y}
                  r="2.2"
                  fill={color}
                  opacity="0.85"
                />
              );
            })}

            {/* Draw centroids */}
            {lState.centroids.map((c, idx) => (
              <g key={`l-c-${idx}`}>
                <circle
                  cx={c.x}
                  cy={100 - c.y}
                  r="5"
                  fill={CLUSTER_COLORS[idx]}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <line
                  x1={c.x - 3}
                  y1={100 - c.y}
                  x2={c.x + 3}
                  y2={100 - c.y}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                <line
                  x1={c.x}
                  y1={100 - c.y - 3}
                  x2={c.x}
                  y2={100 - c.y + 3}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Right: e-means */}
        <div
          style={{
            border: `1px solid ${t.border}`,
            borderRadius: '8px',
            padding: '0.6rem',
            background: t.surfaceAlt,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: t.textPrimary }}>
              e-means (2026)
            </span>
            <span style={{ fontSize: '0.78rem', color: t.accentPrimary, fontWeight: 700 }}>
              Loss: {eState.loss.toFixed(1)}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: t.textSecondary, margin: '0 0 0.4rem 0' }}>
            Mini-batch EMA: batch size B={batchSize}, α={eState.alpha.toFixed(3)} (cosine decay).
          </p>

          <svg
            viewBox="0 0 100 100"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '220px',
              background: t.background,
              borderRadius: '6px',
              border: `1px solid ${t.border}`,
            }}
            role="img"
            aria-label="e-means cluster scatter plot with active mini-batch halo"
          >
            {/* Draw data points */}
            {points.map((p, idx) => {
              const inBatch = eState.batchIndices.includes(idx);
              const bPos = eState.batchIndices.indexOf(idx);
              const cIdx = inBatch ? eState.batchAssignments[bPos] : 0;
              const color = inBatch ? CLUSTER_COLORS[cIdx] : t.textMuted;
              return (
                <g key={`e-p-${idx}`}>
                  {inBatch && (
                    <circle
                      cx={p.x}
                      cy={100 - p.y}
                      r="4"
                      fill="none"
                      stroke={t.accentWarn}
                      strokeWidth="1"
                      strokeDasharray="2 1"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={100 - p.y}
                    r={inBatch ? '2.5' : '1.8'}
                    fill={color}
                    opacity={inBatch ? '1' : '0.45'}
                  />
                </g>
              );
            })}

            {/* Draw centroids */}
            {eState.centroids.map((c, idx) => (
              <g key={`e-c-${idx}`}>
                <circle
                  cx={c.x}
                  cy={100 - c.y}
                  r="5"
                  fill={CLUSTER_COLORS[idx]}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle
                  cx={c.x}
                  cy={100 - c.y}
                  r="7.5"
                  fill="none"
                  stroke={CLUSTER_COLORS[idx]}
                  strokeWidth="0.8"
                  opacity="0.6"
                />
                <line
                  x1={c.x - 3}
                  y1={100 - c.y}
                  x2={c.x + 3}
                  y2={100 - c.y}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                <line
                  x1={c.x}
                  y1={100 - c.y - 3}
                  x2={c.x}
                  y2={100 - c.y + 3}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Loss progression curve */}
      <div
        style={{
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          background: t.surfaceAlt,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ fontWeight: 700, color: t.textPrimary }}>
            Distortion / Loss Trajectory across Steps
          </span>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem' }}>
            <span style={{ color: t.accentPrimary }}>■ Lloyd Full-Batch</span>
            <span style={{ color: t.accentWarn }}>■ e-means EMA</span>
          </div>
        </div>

        <svg
          viewBox="0 0 250 82"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '110px',
            background: t.background,
            borderRadius: '6px',
            border: `1px solid ${t.border}`,
          }}
          role="img"
          aria-label="Distortion loss curves over steps"
        >
          {/* Axis lines */}
          <line x1="36" y1="8" x2="36" y2="56" stroke={t.border} strokeWidth="1" />
          <line x1="36" y1="56" x2="242" y2="56" stroke={t.border} strokeWidth="1" />

          {/* Y-axis labels */}
          <text x="32" y="14" textAnchor="end" fill={t.textMuted} fontSize="8" fontFamily="'Kalam', cursive">Max</text>
          <text x="32" y="56" textAnchor="end" fill={t.textMuted} fontSize="8" fontFamily="'Kalam', cursive">0</text>
          <text x="12" y="34" fill={t.textSecondary} fontSize="8" fontFamily="'Kalam', cursive" transform="rotate(-90 12 34)" textAnchor="middle">MSE</text>

          {/* X-axis ticks and labels */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const x = 36 + (i / totalSteps) * 196;
            return (
              <g key={`x-tick-${i}`}>
                <line x1={x} y1="56" x2={x} y2="59" stroke={t.border} strokeWidth="1" />
                <text x={x} y="68" textAnchor="middle" fill={t.textMuted} fontSize="8" fontFamily="'Kalam', cursive">
                  {i}
                </text>
              </g>
            );
          })}
          <text x="134" y="78" textAnchor="middle" fill={t.textSecondary} fontSize="8" fontFamily="'Kalam', cursive">
            Steps / Epochs
          </text>

          {/* Full background curve for all steps (computed up front) */}
          <polyline
            fill="none"
            stroke={t.accentPrimary}
            strokeWidth="1.5"
            strokeOpacity="0.3"
            points={lloydHistory
              .map((h, i) => {
                const x = 36 + (i / totalSteps) * 196;
                const y = 56 - (h.loss / maxLoss) * 44;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          <polyline
            fill="none"
            stroke={t.accentWarn}
            strokeWidth="1.5"
            strokeOpacity="0.3"
            strokeDasharray="3 2"
            points={eMeansHistory
              .map((h, i) => {
                const x = 36 + (i / totalSteps) * 196;
                const y = 56 - (h.loss / maxLoss) * 44;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Active Lloyd loss trajectory up to current step */}
          {step > 0 && (
            <polyline
              fill="none"
              stroke={t.accentPrimary}
              strokeWidth="2.5"
              points={lloydHistory
                .slice(0, step + 1)
                .map((h, i) => {
                  const x = 36 + (i / totalSteps) * 196;
                  const y = 56 - (h.loss / maxLoss) * 44;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* Active e-means loss trajectory up to current step */}
          {step > 0 && (
            <polyline
              fill="none"
              stroke={t.accentWarn}
              strokeWidth="2.5"
              points={eMeansHistory
                .slice(0, step + 1)
                .map((h, i) => {
                  const x = 36 + (i / totalSteps) * 196;
                  const y = 56 - (h.loss / maxLoss) * 44;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* Current step marker dots */}
          <circle
            cx={36 + (step / totalSteps) * 196}
            cy={56 - (lState.loss / maxLoss) * 44}
            r="4"
            fill={t.accentPrimary}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <circle
            cx={36 + (step / totalSteps) * 196}
            cy={56 - (eState.loss / maxLoss) * 44}
            r="4"
            fill={t.accentWarn}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div style={{ fontSize: '0.74rem', color: t.textSecondary, lineHeight: 1.45 }}>
        <strong>Observation:</strong> Lloyd requires evaluating all points across every cluster per step. e-means achieves equivalent low distortion in a fraction of passes by streaming mini-batches and updating running sums via exponential moving averages (10–45× wall-clock speedup vs Flash-KMeans on GPU, and 8–15× vs Faiss on CPU, as reported by the authors).
      </div>
    </div>
  );
}
