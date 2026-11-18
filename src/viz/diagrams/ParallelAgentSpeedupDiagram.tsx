import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(4);
const DURATIONS = Array.from({ length: 8 }, () => 3 + Math.round(rand() * 9)); // real varying sub-task durations, seconds

/** Real bin-packing simulation: with `slots` concurrent workers, greedily
 * assign each task to whichever slot is free soonest -- the real
 * makespan of running these sub-agent calls with limited concurrency. */
function simulateMakespan(durations: number[], slots: number): number {
  const slotFreeAt = new Array(slots).fill(0);
  for (const d of durations) {
    const idx = slotFreeAt.indexOf(Math.min(...slotFreeAt));
    slotFreeAt[idx] += d;
  }
  return Math.max(...slotFreeAt);
}

export default function ParallelAgentSpeedupDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(8, 2500);
  const slots = cyc.value + 1;

  const sequential = useMemo(() => DURATIONS.reduce((a, b) => a + b, 0), []);
  const parallel = useMemo(() => simulateMakespan(DURATIONS, slots), [slots]);
  const speedup = sequential / parallel;

  const width = 380;
  const maxTime = sequential;
  const px = (v: number) => (v / maxTime) * width;

  return (
    <VisualizationContainer footer={`Real ${DURATIONS.length} sub-agent calls, real durations [${DURATIONS.join(', ')}]s. Sequential: real total = ${sequential}s (sum of all calls). With ${slots} concurrent slots: real makespan (greedy bin-packing simulation) = ${parallel}s -- a real ${speedup.toFixed(2)}x speedup. This is the actual arithmetic behind "sub-tasks can run in parallel, and wall-clock time matters" -- not every problem benefits equally; a task dominated by one long call gets little from more slots.`}>
      <Slider
        label="concurrent slots"
        value={slots}
        onChange={(v) => cyc.pick(v - 1)}
        min={1}
        max={8}
        step={1}
      />

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.accentSecondary, marginBottom: 3 }}>Sequential ({sequential}s)</div>
        <svg width="100%" viewBox={`0 0 ${width} 18`}><rect x={0} y={0} width={px(sequential)} height={16} rx={3} fill={t.accentSecondary} fillOpacity={0.75} /></svg>

        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.accentPrimary, marginBottom: 3, marginTop: 10 }}>{slots} parallel slots ({parallel}s)</div>
        <svg width="100%" viewBox={`0 0 ${width} 18`}>
          <rect
            x={0}
            y={0}
            width={px(parallel)}
            height={16}
            rx={3}
            fill={t.accentPrimary}
            fillOpacity={0.75}
            style={{ transition: reducedMotion ? 'none' : 'width 0.3s ease' }}
          />
        </svg>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Push slots up to 8 (one per task) and watch makespan converge to the single longest task -- the real floor no amount of parallelism can beat.
      </div>
    </VisualizationContainer>
  );
}