import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Mode = 'static' | 'dynamic' | 'continuous';
// Each request: [startStep, endStep] within an 8-step decode window.
const REQUESTS = [
  { start: 0, end: 3 }, // finishes early
  { start: 0, end: 7 }, // runs the whole window
  { start: 2, end: 5 }, // arrives late (dynamic/continuous only)
  { start: 4, end: 7 }, // arrives even later (continuous only)
];

/** Static batching wastes GPU slots on finished requests until the WHOLE
 * batch completes; continuous batching swaps requests in/out at every
 * step. Select a mode, see the actual GPU-slot occupancy grid. */
export default function ContinuousBatchingDiagram() {
  const t = useVizTokens();
  const modes: Mode[] = ['static', 'dynamic', 'continuous'];
  const cycle = useAutoCycle(modes.length, 2800, 2);
  const mode: Mode = modes[cycle.value];
  const setMode = (value: Mode) => cycle.pick(modes.indexOf(value));
  const colors = [getConceptColor(t, 'query'), getConceptColor(t, 'attention'), t.accentWarn, t.accentDanger];
  const STEPS = 8;

  const active = (reqIdx: number, step: number) => {
    const r = REQUESTS[reqIdx];
    if (mode === 'static') {
      // only the 2 "original" requests exist in static batching's fixed
      // batch, and both occupy every slot until the LAST one finishes
      return reqIdx <= 1;
    }
    if (mode === 'dynamic') {
      return reqIdx <= 2 && step >= 0; // batch fixed once formed, req 4 can't join until next batch boundary
    }
    return step >= r.start && step <= r.end; // continuous: exact occupancy
  };

  const desc: Record<Mode, string> = {
    static: 'Static: a fixed batch runs to completion together -- request 1 finishes at step 3 but its GPU slot sits IDLE for steps 4-7 waiting for request 2.',
    dynamic: 'Dynamic: requests batched at fixed intervals -- better than static, but request 4 (arriving mid-window) still has to wait for the next batch boundary to join.',
    continuous: 'Continuous (vLLM\'s core innovation): a request joins or leaves the running batch at EVERY decode step -- no idle slots, no waiting for a batch boundary.',
  };

  return (
    <VisualizationContainer footer={desc[mode]}>
      <PillSelect<Mode> label="Batching strategy" value={mode} onChange={setMode} options={[{ value: 'static', label: 'Static' }, { value: 'dynamic', label: 'Dynamic' }, { value: 'continuous', label: 'Continuous' }]} />
      <svg width="100%" viewBox="0 0 480 140" style={{ display: 'block', marginTop: 10 }}>
        {REQUESTS.map((_, ri) => (
          <g key={ri}>
            <text x={10} y={30 + ri * 26} fontSize={8} fill={colors[ri]}>req {ri + 1}</text>
            {Array.from({ length: STEPS }, (_, step) => {
              const isActive = active(ri, step);
              return <rect key={step} x={45 + step * 50} y={18 + ri * 26} width={44} height={18} rx={3} fill={isActive ? colors[ri] : 'none'} opacity={isActive ? 0.8 : 0.15} stroke={colors[ri]} strokeWidth={1} />;
            })}
          </g>
        ))}
        <text x={45} y={125} fontSize={8} fill={t.textMuted}>decode step →</text>
      </svg>
    </VisualizationContainer>
  );
}
