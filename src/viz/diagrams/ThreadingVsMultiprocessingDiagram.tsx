import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { getConceptColor } from './diagramSystem';
import { SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Workload = 'io' | 'cpu';
type Model = 'threading' | 'multiprocessing';

const N_WORKERS = 4;
const WORK_MS = 100; // total work per unit, if done alone

function effectiveTime(workload: Workload, model: Model): { time: number; note: string } {
  if (workload === 'io' && model === 'threading') {
    return { time: WORK_MS * 1.05, note: 'Threads release the GIL while waiting on I/O -- N threads waiting concurrently finish in roughly the time of one, plus negligible overhead.' };
  }
  if (workload === 'io' && model === 'multiprocessing') {
    return { time: WORK_MS * 1.3, note: "Works, but each process pays real startup overhead for a job threading already handles for free -- multiprocessing's isolation buys nothing here since there's no CPU contention to escape." };
  }
  if (workload === 'cpu' && model === 'threading') {
    return { time: WORK_MS * N_WORKERS * 0.95, note: 'The GIL allows only one thread to execute Python bytecode at a time -- N threads doing CPU-bound work run essentially sequentially, with a small extra cost from context-switching between them.' };
  }
  return { time: WORK_MS * 1.4, note: `Each process gets its own GIL and runs on a real CPU core -- true parallelism. Total time is close to the single-worker cost, not N times it, though serialization overhead (pickling data across the process boundary) keeps it from being a perfect 1/N.` };
}

const WIDTH = 380;
const HEIGHT = 130;
const MAX_TIME = WORK_MS * N_WORKERS * 1.1;

export default function ThreadingVsMultiprocessingDiagram() {
  const t = useVizTokens();
  const [workload, setWorkload] = useState<Workload>('cpu');
  const [model, setModel] = useState<Model>('threading');

  const result = effectiveTime(workload, model);
  const color = getConceptColor(t, 'attention');
  const barW = Math.max(4, (result.time / MAX_TIME) * (WIDTH - 20));

  return (
    <VisualizationContainer footer={`${N_WORKERS} workers, each with ${WORK_MS}ms of standalone work. Effective total: ~${result.time.toFixed(0)}ms. ${result.note}`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <PillSelect<Workload>
          label="Workload type"
          value={workload}
          onChange={setWorkload}
          options={[
            { value: 'cpu', label: 'CPU-bound' },
            { value: 'io', label: 'I/O-bound' },
          ]}
        />
        <PillSelect<Model>
          label="Execution model"
          value={model}
          onChange={setModel}
          options={[
            { value: 'threading', label: 'threading' },
            { value: 'multiprocessing', label: 'multiprocessing' },
          ]}
        />
      </div>
      <svg width={WIDTH} height={HEIGHT} style={{ display: 'block' }}>
        <rect x={10} y={20} width={barW} height={30} fill={`${color}30`} stroke="none" />
        <SketchRect x={10} y={20} width={barW} height={30} color={color} strokeWidth={2} id="tvm-bar" />
        <text x={10} y={70} fontSize={13} fontFamily="monospace" fontWeight={700} fill={color}>
          {result.time.toFixed(0)}ms
        </text>
        <line x1={10} y1={90} x2={WIDTH - 10} y2={90} stroke={t.border} strokeWidth={1} />
        <text x={10} y={104} fontSize={9} fontFamily={HAND_FONT} fill={t.textMuted}>0ms</text>
        <text x={WIDTH - 10} y={104} textAnchor="end" fontSize={9} fontFamily={HAND_FONT} fill={t.textMuted}>{MAX_TIME.toFixed(0)}ms (fully sequential)</text>
      </svg>
    </VisualizationContainer>
  );
}
