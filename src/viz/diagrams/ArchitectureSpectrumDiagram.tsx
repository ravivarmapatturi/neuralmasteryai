import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { Pulse } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ARCHS = [
  { key: 'react', label: 'ReAct', reliability: 0.55, cost: 0.4, desc: 'Interleave reasoning and action, react to each result as it comes back. Flexible and course-corrects on real information, but can wander -- no commitment to an overall plan.' },
  { key: 'plan', label: 'Plan-and-Execute', reliability: 0.75, cost: 0.6, desc: 'Commit to a full plan upfront, execute it step by step, replan on failure. More predictable and cheaper per-step than re-reasoning constantly, but a bad upfront plan compounds until a replan triggers.' },
  { key: 'reflect', label: 'Reflection', reliability: 0.85, cost: 0.9, desc: 'Critique and revise your own output before finalizing it. Highest reliability of the three, at the cost of extra LLM calls per task -- worth it when correctness matters more than latency/cost.' },
] as const;

/** Positions the three architectures on the reliability-vs-cost tradeoff
 * they actually make, rather than presenting them as three equally-valid
 * unranked options -- there IS a real axis here, and the right pick
 * depends on where a task's own priorities sit on it. */
export default function ArchitectureSpectrumDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(ARCHS.length, 3500);
  const active = ARCHS[cyc.value].key;
  const color = getConceptColor(t, 'attention');
  const width = 380;
  const height = 220;
  const left = 50;
  const bottom = 170;
  const top = 20;
  const right = width - 20;

  const xFor = (cost: number) => left + cost * (right - left);
  const yFor = (rel: number) => bottom - rel * (bottom - top);

  return (
    <VisualizationContainer footer={ARCHS.find((a) => a.key === active)!.desc}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={t.border} strokeWidth={1} />
        <line x1={left} y1={bottom} x2={left} y2={top} stroke={t.border} strokeWidth={1} />
        <text x={left} y={top - 6} fontSize={9} fill={t.textMuted}>reliability</text>
        <text x={right} y={bottom + 18} textAnchor="end" fontSize={9} fill={t.textMuted}>cost/latency →</text>
        {ARCHS.map((a, i) => {
          const x = xFor(a.cost);
          const y = yFor(a.reliability);
          const isActive = active === a.key;
          return (
            <g key={a.key} onClick={() => cyc.pick(i)} onMouseEnter={() => cyc.pick(i)} style={{ cursor: 'pointer' }}>
              {isActive && !reducedMotion && <Pulse cx={x} cy={y} r={18} color={color} />}
              <circle cx={x} cy={y} r={isActive ? 10 : 7} fill={isActive ? color : `${color}60`} stroke={color} strokeWidth={1.5} />
              <text x={x} y={y - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{a.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>Click an architecture -- the axis is real: more reliability generally costs more per task.</div>
    </VisualizationContainer>
  );
}