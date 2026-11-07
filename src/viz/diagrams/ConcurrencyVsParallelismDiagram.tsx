import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Mode = 'concurrent' | 'parallel';
const WIDTH = 420;
const ROW_H = 26;
const TASK_MS = 40;
const N = 3;

export default function ConcurrencyVsParallelismDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('concurrent');
  const colors = [getConceptColor(t, 'query'), getConceptColor(t, 'key'), getConceptColor(t, 'attention')];

  // Concurrent: one core, tasks interleaved in small slices.
  // Parallel: N cores, each task runs start-to-finish simultaneously.
  const SLICE = 8;
  const segments: { core: number; start: number; end: number; task: number }[] = [];
  if (mode === 'concurrent') {
    const remaining = [TASK_MS, TASK_MS, TASK_MS];
    let cursor = 0;
    while (remaining.some((r) => r > 0)) {
      for (let i = 0; i < N; i++) {
        if (remaining[i] <= 0) continue;
        const dur = Math.min(SLICE, remaining[i]);
        segments.push({ core: 0, start: cursor, end: cursor + dur, task: i });
        cursor += dur;
        remaining[i] -= dur;
      }
    }
  } else {
    for (let i = 0; i < N; i++) segments.push({ core: i, start: 0, end: TASK_MS, task: i });
  }
  const totalTime = mode === 'concurrent' ? N * TASK_MS : TASK_MS;
  const scale = (WIDTH - 60) / totalTime;
  const nCores = mode === 'concurrent' ? 1 : N;

  return (
    <VisualizationContainer
      footer={
        mode === 'concurrent'
          ? `1 CPU core, 3 tasks: the core rapidly switches between them (interleaved slices), giving each task overlapping progress -- but only one instruction executes at any literal instant. Total time: ${totalTime}ms, roughly N times a single task alone.`
          : `3 CPU cores, 3 tasks: each task runs on its own core, literally simultaneously. Total time: ${totalTime}ms -- the same as running just one task, because they're not competing for the same execution unit.`
      }
    >
      <div style={{ marginBottom: 12 }}>
        <VizButton variant={mode === 'concurrent' ? 'primary' : 'secondary'} onClick={() => setMode('concurrent')}>
          Concurrent (1 core)
        </VizButton>{' '}
        <VizButton variant={mode === 'parallel' ? 'primary' : 'secondary'} onClick={() => setMode('parallel')}>
          Parallel (3 cores)
        </VizButton>
      </div>
      <svg width={WIDTH} height={nCores * ROW_H + 16} viewBox={`0 0 ${WIDTH} ${nCores * ROW_H + 16}`} className="nm-fit-svg">
        {Array.from({ length: nCores }, (_, c) => (
          <text key={c} x={0} y={c * ROW_H + ROW_H / 2 + 4} fontSize={10} fill={t.textMuted}>
            core {c}
          </text>
        ))}
        {segments.map((s, i) => (
          <rect
            key={i}
            x={40 + s.start * scale}
            y={s.core * ROW_H}
            width={(s.end - s.start) * scale - 1}
            height={ROW_H - 4}
            fill={colors[s.task]}
            opacity={0.85}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, marginTop: 6 }}>
        {colors.map((c, i) => (
          <span key={i} style={{ color: c }}>■ task {i}</span>
        ))}
      </div>
    </VisualizationContainer>
  );
}
