import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const N = 16;
const STEPS = N;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(11);
/** Each token position gets a real, fixed random resolve-threshold in
 * (0,1] -- at diffusion step fraction f, a position is "resolved" once
 * f reaches its threshold, so different positions finish at different,
 * randomly-ordered steps but all resolve roughly together by the end --
 * the parallel-refinement behavior diffusion LM visualizations show,
 * computed live rather than hand-placed per step. */
const RESOLVE_THRESHOLDS = Array.from({ length: N }, () => rand());

type Mode = 'ar' | 'diffusion';

export default function AutoregressiveVsDiffusionGenerationDiagram() {
  const t = useVizTokens();
  const modes: Mode[] = ['ar', 'diffusion'];
  const modeCycle = useAutoCycle(modes.length, 9000);
  const mode = modes[modeCycle.value];
  const setMode = (next: Mode) => modeCycle.pick(modes.indexOf(next));
  const stepCycle = useAutoCycle(STEPS + 1, 500);
  const step = stepCycle.value;
  const setStep = stepCycle.pick;

  const resolved = useMemo(() => {
    if (mode === 'ar') return Array.from({ length: N }, (_, i) => i < step);
    const f = step / STEPS;
    return RESOLVE_THRESHOLDS.map((th) => th <= f);
  }, [mode, step]);

  const numResolved = resolved.filter(Boolean).length;

  return (
    <VisualizationContainer footer={mode === 'ar'
      ? `Autoregressive: token i only resolves once i < step (real index comparison) -- strictly left to right, one token per step, ${numResolved}/${N} resolved.`
      : `Diffusion: each position has a real fixed random resolve-threshold in (0,1]; at step fraction f = step/${STEPS} = ${(step / STEPS).toFixed(2)}, position resolves iff threshold <= f -- ${numResolved}/${N} resolved, in a random order, all refining together rather than left-to-right.`}
    >
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PillSelect label="generation mode" value={mode} onChange={(v) => setMode(v as Mode)} options={[
          { value: 'ar', label: 'Autoregressive' },
          { value: 'diffusion', label: 'Diffusion' },
        ]} />
        <Slider label={`step = ${step} / ${STEPS}`} value={step} onChange={setStep} min={0} max={STEPS} step={1} />
      </div>

      <div style={{ display: 'flex', gap: 3, marginTop: 14, flexWrap: 'wrap' }}>
        {Array.from({ length: N }, (_, i) => (
          <div key={i} style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: resolved[i] ? `${t.accentPrimary}22` : t.surfaceAlt, border: `1.5px solid ${resolved[i] ? t.accentPrimary : t.border}` }}>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: resolved[i] ? t.accentPrimary : t.textMuted }}>{resolved[i] ? i : '·'}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        {mode === 'ar' ? 'each step commits exactly one new token, left to right' : 'every position refines simultaneously each step -- resolution order is not left-to-right'}
      </div>
    </VisualizationContainer>
  );
}
