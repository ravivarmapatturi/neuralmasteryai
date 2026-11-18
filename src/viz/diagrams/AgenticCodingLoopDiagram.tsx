import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, FlowDots, line, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Stage = 'context' | 'plan' | 'act' | 'verify';

const STAGE_DESC: Record<Stage, string> = {
  context: 'Search and read -- grep for the failing symbol, read the file, check the test that\'s red. Real coding agents mostly do this with the same tools a human would (search, read, grep), on demand, rather than working off a pre-built index of the whole repo.',
  plan: 'Decide the specific edit: which file, which lines, what the new code should say -- and why it should fix the actual failure, not just silence the symptom.',
  act: 'Take the action: edit the file, run the build or test command. This is the step a permission system gates -- see below.',
  verify: 'Read the real output: did the test actually pass, did the build actually succeed? Not "does this look right" -- a program-checkable result, the same distinction Loops and Graphs draws for any loop\'s check.',
};

const TRACE: { stage: Stage; note: string }[] = [
  { stage: 'context', note: 'grep the failing test name, read the module it exercises' },
  { stage: 'plan', note: 'the null check is missing on line 42, add it' },
  { stage: 'act', note: 'edit the file, run the test command' },
  { stage: 'verify', note: 'test still fails -- different assertion now' },
  { stage: 'context', note: 're-read the new failure, read one more file' },
  { stage: 'plan', note: 'the actual bug is upstream, in the caller' },
  { stage: 'act', note: 'edit the caller, re-run the test' },
  { stage: 'verify', note: 'test passes -- stop' },
];

/** The same produce -> check -> correct -> repeat loop from Loops and Graphs,
 * concretely: a coding agent's context/plan/act/verify cycle, stepping
 * through a real (if abbreviated) two-iteration trace where the first fix
 * doesn't work and the loop has to go back for more context. */
export default function AgenticCodingLoopDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(TRACE.length, 2500);
  const step = cyc.value;
  const current = TRACE[step];
  const stage = current.stage;
  const setStepAndStage = (i: number) => {
    cyc.pick(i);
  };
  const color = getConceptColor(t, 'attention');
  const stageOrder: Stage[] = ['context', 'plan', 'act', 'verify'];

  const angleFor = (s: Stage) => {
    const i = stageOrder.indexOf(s);
    return (i / 4) * 2 * Math.PI - Math.PI / 2;
  };
  const cx = 130, cy = 110, r = 78;

  return (
    <VisualizationContainer footer={STAGE_DESC[stage]}>
      <PillSelect<number>
        label="Trace step"
        value={step}
        onChange={(v) => {
          setStepAndStage(v as number);
        }}
        options={TRACE.map((_, i) => ({ value: i, label: `${i + 1}` }))}
      />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <svg width={260} height={220} viewBox="0 0 260 220">
          {stageOrder.map((s) => {
            const a = angleFor(s);
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            const isActive = s === stage;
            const selectStage = () => {
              const idx = TRACE.findIndex((tr) => tr.stage === s);
              if (idx >= 0) setStepAndStage(idx);
            };
            return (
              <g
                key={s}
                onClick={selectStage}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${s} stage`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectStage();
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r={30} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </text>
              </g>
            );
          })}
          {stageOrder.map((s, i) => {
            const next = stageOrder[(i + 1) % stageOrder.length];
            const a1 = angleFor(s);
            const a2 = angleFor(next);
            const x1 = cx + (r - 30) * Math.cos(a1);
            const y1 = cy + (r - 30) * Math.sin(a1);
            const x2 = cx + (r - 30) * Math.cos(a2);
            const y2 = cy + (r - 30) * Math.sin(a2);
            return (
              <g key={s}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.textMuted} strokeWidth={1} markerEnd="url(#acl-arrow)" />
                <FlowDots d={line(x1, y1, x2, y2)} color={color} dur={2.4} count={1} delay={i * 0.6} />
              </g>
            );
          })}
          <defs>
            <marker id="acl-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
            </marker>
          </defs>
        </svg>
        <div style={{ fontSize: 11, color: t.textSecondary, maxWidth: 220 }}>
          <strong style={{ color: t.textPrimary }}>Step {step + 1} of {TRACE.length}:</strong> {current.note}
        </div>
      </div>
    </VisualizationContainer>
  );
}
