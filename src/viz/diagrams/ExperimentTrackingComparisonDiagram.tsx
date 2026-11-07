import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { simulateSweep, type Run } from '../lib/experimentTracking';

const WIDTH = 640;
const HEIGHT = 180;
const PAD = 30;

const RUN_COLORS = ['#5b8def', '#21A374', '#f0ad4e', '#9b59b6', '#d9534f'];

/** A real 5-run hyperparameter sweep (gradient descent at different
 * learning rates on the same task) rendered as a tracking dashboard would
 * show it -- sortable by final loss, click a run to highlight its curve.
 * The point this makes concrete: "I think run 3 was better" vs. actually
 * being able to see, and prove, that run 4 converged fastest and run 5
 * diverged outright -- the exact claim the page's prose makes, backed by
 * a real computed sweep instead of an illustrative table. */
export default function ExperimentTrackingComparisonDiagram() {
  const t = useVizTokens();
  const [runs] = useState<Run[]>(() => simulateSweep());
  const [selected, setSelected] = useState<string>(runs[3].id); // start on the actual best run
  const [sortByFinal, setSortByFinal] = useState(true);

  const color = getConceptColor(t, 'attention');
  const maxLoss = Math.max(...runs.flatMap((r) => r.lossCurve.filter((v) => Number.isFinite(v)).map((v) => Math.min(v, 30))));
  const nSteps = runs[0].lossCurve.length;

  const sortedRuns = sortByFinal ? [...runs].sort((a, b) => a.finalLoss - b.finalLoss) : runs;
  const bestRun = [...runs].sort((a, b) => a.finalLoss - b.finalLoss)[0];

  const toPath = (r: Run) => {
    const points = r.lossCurve.map((v, i) => {
      const x = PAD + (i / (nSteps - 1)) * (WIDTH - 2 * PAD);
      const clamped = Math.min(v, 30);
      const y = HEIGHT - PAD - (clamped / maxLoss) * (HEIGHT - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const selectedRun = runs.find((r) => r.id === selected)!;
  const footer = selectedRun.diverged
    ? `${selectedRun.id} (lr=${selectedRun.lr}): diverged -- loss grew from 25.0 to ${selectedRun.finalLoss.toFixed(0)} instead of shrinking. A learning rate this high overshoots the minimum by more than it started off from, every single step.`
    : `${selectedRun.id} (lr=${selectedRun.lr}): finished at loss=${selectedRun.finalLoss.toFixed(4)}. ${selectedRun.id === bestRun.id ? "This is the actual best run of the 5 -- not a guess, the lowest real final loss." : `${bestRun.id} (lr=${bestRun.lr}) still finished lower, at ${bestRun.finalLoss.toFixed(4)}.`}`;

  return (
    <VisualizationContainer footer={footer} title="Real hyperparameter sweep, compared like a tracking dashboard would show it">
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} stroke={t.border} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={HEIGHT - PAD} stroke={t.border} />
        <text x={PAD} y={HEIGHT - 8} fontSize={10} fill={t.textSecondary}>step 0</text>
        <text x={WIDTH - PAD} y={HEIGHT - 8} textAnchor="end" fontSize={10} fill={t.textSecondary}>step {nSteps - 1}</text>
        <text x={4} y={PAD + 4} fontSize={10} fill={t.textSecondary}>loss</text>

        {runs.map((r, i) => (
          <path
            key={r.id}
            d={toPath(r)}
            fill="none"
            stroke={RUN_COLORS[i % RUN_COLORS.length]}
            strokeWidth={r.id === selected ? 3 : 1.5}
            opacity={r.id === selected ? 1 : 0.35}
          />
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: t.textSecondary }}>Runs, click to highlight:</span>
        <button
          onClick={() => setSortByFinal((s) => !s)}
          style={{
            cursor: 'pointer', fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontFamily: 'inherit',
          }}
        >
          {sortByFinal ? 'Sorted by final loss ✓' : 'Sort by final loss'}
        </button>
      </div>

      <div style={{ marginTop: 6, fontSize: DIAGRAM_TYPE.secondaryLabel.size }}>
        {sortedRuns.map((r) => {
          const i = runs.indexOf(r);
          const isSelected = r.id === selected;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                padding: '5px 8px',
                marginBottom: 2,
                borderRadius: 6,
                fontFamily: 'inherit',
                background: isSelected ? `${color}18` : 'transparent',
                border: `1px solid ${isSelected ? color : 'transparent'}`,
                color: t.textPrimary,
              }}
            >
              <span>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: RUN_COLORS[i % RUN_COLORS.length], marginRight: 6 }} />
                {r.id} -- lr={r.lr}, batch={r.batchSize}
              </span>
              <span style={{ color: r.diverged ? t.accentDanger : t.textSecondary, fontWeight: r.id === bestRun.id ? 700 : 400 }}>
                {r.diverged ? 'diverged' : `loss=${r.finalLoss.toFixed(4)}`}
              </span>
            </button>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
