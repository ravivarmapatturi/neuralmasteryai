import { useMemo, useState } from 'react';
import { SketchArrow, SketchRect } from '../components/notebook/RoughShape';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from './primitives';
import {
  buildAgentExecution,
  type AgentArchitecture,
  type AgentExecutionConfig,
  type AgentStepKind,
} from './lib/agentExecutionGraph';
import { usePlaygroundPlayback } from './diagrams/usePlaygroundPlayback';

interface BlueprintNode {
  id: string;
  label: string;
  plain: string;
  x: number;
  y: number;
  kind: AgentStepKind;
}

const ARCHITECTURE_NAME: Record<AgentArchitecture, string> = {
  react: 'ReAct (reason, act, observe)',
  'plan-execute': 'Plan and execute',
  reflection: 'Reflection (draft, critique, revise)',
};

const BLUEPRINTS: Record<AgentArchitecture, BlueprintNode[]> = {
  react: [
    { id: 'think', label: 'Thought', plain: 'decide what is needed', x: 36, y: 54, kind: 'thought' },
    { id: 'act', label: 'Action', plain: 'call one tool', x: 246, y: 54, kind: 'action' },
    { id: 'observe', label: 'Observation', plain: 'read the tool result', x: 456, y: 54, kind: 'observation' },
    { id: 'answer', label: 'Answer', plain: 'return when evidence is enough', x: 246, y: 210, kind: 'answer' },
  ],
  'plan-execute': [
    { id: 'plan', label: 'Plan', plain: 'split the goal into tasks', x: 36, y: 54, kind: 'thought' },
    { id: 'execute', label: 'Execute', plain: 'run the next task', x: 246, y: 54, kind: 'action' },
    { id: 'check', label: 'Check', plain: 'record the task result', x: 456, y: 54, kind: 'observation' },
    { id: 'answer', label: 'Answer', plain: 'combine completed tasks', x: 246, y: 210, kind: 'answer' },
  ],
  reflection: [
    { id: 'draft', label: 'Draft', plain: 'write a first answer', x: 20, y: 54, kind: 'thought' },
    { id: 'tools', label: 'Tools', plain: 'collect evidence', x: 190, y: 54, kind: 'action' },
    { id: 'critique', label: 'Critique', plain: 'name a weakness', x: 360, y: 54, kind: 'observation' },
    { id: 'revise', label: 'Revise', plain: 'repair that weakness', x: 530, y: 54, kind: 'thought' },
    { id: 'answer', label: 'Answer', plain: 'return the revision', x: 275, y: 210, kind: 'answer' },
  ],
};

function nodeForPhase(architecture: AgentArchitecture, phase: string, kind: AgentStepKind): string {
  if (kind === 'answer') return 'answer';
  if (architecture === 'react') return kind === 'action' ? 'act' : kind === 'observation' ? 'observe' : 'think';
  if (architecture === 'plan-execute') {
    if (phase === 'Make a plan') return 'plan';
    if (kind === 'action') return 'execute';
    return phase === 'Check task' ? 'check' : kind === 'observation' ? 'check' : 'execute';
  }
  if (phase === 'Draft') return 'draft';
  if (phase === 'Critique') return 'critique';
  if (phase === 'Revise') return 'revise';
  return 'tools';
}

function NumberInput({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 125, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  );
}

function AgentExecutionPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [config, setConfig] = useState<AgentExecutionConfig>({
    architecture: 'react',
    goal: 'Find today’s weather and decide whether to carry a coat',
    toolCalls: 2,
    failAtCall: 1,
    retryBudget: 1,
    modelStepMs: 300,
    toolStepMs: 500,
  });
  const [prediction, setPrediction] = useState<'complete' | 'stop'>('complete');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const result = useMemo(() => buildAgentExecution(config), [config]);
  const playback = usePlaygroundPlayback(result.steps.length, 1150);
  const current = result.steps[playback.step] ?? result.steps[0];
  const currentNode = nodeForPhase(config.architecture, current.phase, current.kind);
  const nodes = BLUEPRINTS[config.architecture];
  const colors: Record<AgentStepKind, string> = {
    thought: t.accentPurple,
    action: t.accentTeal,
    observation: t.accentWarn,
    answer: t.accentPrimary,
  };

  const update = <K extends keyof AgentExecutionConfig>(key: K, value: AgentExecutionConfig[K]) => {
    setConfig((state) => ({ ...state, [key]: value }));
    setPredictionResult(null);
    playback.reset();
  };

  const edges = config.architecture === 'reflection'
    ? [['draft', 'tools'], ['tools', 'critique'], ['critique', 'revise'], ['revise', 'critique'], ['revise', 'answer']]
    : config.architecture === 'react'
      ? [['think', 'act'], ['act', 'observe'], ['observe', 'think'], ['think', 'answer']]
      : [['plan', 'execute'], ['execute', 'check'], ['check', 'execute'], ['check', 'answer']];
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

  const runPrediction = () => {
    setPredictionResult(prediction === (result.completed ? 'complete' : 'stop'));
    playback.setStep(result.steps.length - 1);
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="An agent is a control loop around a model and its tools"
            description="This solves a coordination problem: the loop decides when to call a tool, how to react to its result, when to retry, and when enough evidence exists to answer."
          />
          <label style={{ display: 'block', minWidth: 0, marginBottom: 8, fontSize: 15 }}>
            <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Goal the agent must finish</span>
            <input aria-label="Agent goal" value={config.goal} onChange={(event) => update('goal', event.target.value)} style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }} />
          </label>
          <PillSelect<AgentArchitecture>
            label="Agent architecture (how control moves)"
            value={config.architecture}
            onChange={(next) => update('architecture', typeof next === 'function' ? next(config.architecture) : next)}
            options={[
              { value: 'react', label: 'ReAct' },
              { value: 'plan-execute', label: 'Plan and execute' },
              { value: 'reflection', label: 'Reflection' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <NumberInput label="Planned tool calls" value={config.toolCalls} min={1} max={5} onChange={(value) => update('toolCalls', Math.round(value))} />
            <NumberInput label="Fail at call (0 = none)" value={config.failAtCall} min={0} max={config.toolCalls} onChange={(value) => update('failAtCall', Math.round(value))} />
            <NumberInput label="Retry budget" value={config.retryBudget} min={0} max={3} onChange={(value) => update('retryBudget', Math.round(value))} />
            <NumberInput label="Model step (ms)" value={config.modelStepMs} min={0} max={3000} step={50} onChange={(value) => update('modelStepMs', value)} />
            <NumberInput label="Tool result (ms)" value={config.toolStepMs} min={0} max={5000} step={50} onChange={(value) => update('toolStepMs', value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 7, fontSize: 15 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span aria-live="polite">Step <strong>{playback.step + 1}</strong> of {result.steps.length} · elapsed <strong>{current.elapsedMs.toLocaleString()} ms</strong></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginBottom: 4, fontSize: 15 }} aria-label="Agent step colours">
            {(Object.entries(colors) as [AgentStepKind, string][]).map(([kind, color]) => <span key={kind}><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: color }} />{kind === 'thought' ? 'Model reasoning' : kind === 'action' ? 'Tool call' : kind === 'observation' ? 'Tool result' : 'Final answer'}</span>)}
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 340" role="img" aria-label={`${ARCHITECTURE_NAME[config.architecture]} execution graph; current phase ${current.phase}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <text x={20} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>{ARCHITECTURE_NAME[config.architecture]}</text>
        <text x={740} y={22} textAnchor="end" fontSize={14} fill={t.textSecondary}>{result.toolAttempts} tool attempts · {result.retriesUsed} retries · {result.totalMs.toLocaleString()} ms total</text>
        {edges.map(([from, to], index) => {
          const a = nodeById[from];
          const b = nodeById[to];
          const reverse = (from === 'observe' && to === 'think') || (from === 'check' && to === 'execute') || (from === 'revise' && to === 'critique');
          const points: [number, number][] = reverse
            ? [[a.x + 70, a.y + 80], [a.x + 70, 188], [b.x + 70, 188], [b.x + 70, b.y + 80]]
            : [[a.x + 140, a.y + 40], [b.x, b.y + 40]];
          return <SketchArrow key={`${from}-${to}`} points={points} color={currentNode === to ? colors[b.kind] : t.edge} strokeWidth={currentNode === to ? 2.6 : 1.6} roughness={0.8} id={`agent-edge-${index}`} />;
        })}
        {nodes.map((node) => {
          const active = currentNode === node.id;
          const color = colors[node.kind];
          return (
            <g key={node.id}>
              <rect x={node.x} y={node.y} width={140} height={80} rx={8} fill={active ? `${color}28` : t.surfaceAlt} />
              <SketchRect x={node.x} y={node.y} width={140} height={80} color={color} strokeWidth={active ? 3 : 1.6} roughness={1} id={`agent-node-${node.id}`} />
              <text x={node.x + 70} y={node.y + 31} textAnchor="middle" fontSize={16} fontWeight={700} fill={color}>{node.label}</text>
              <text x={node.x + 70} y={node.y + 57} textAnchor="middle" fontSize={14} fill={t.textPrimary}>{node.plain}</text>
            </g>
          );
        })}
        <line x1={20} y1={306} x2={740} y2={306} stroke={t.border} strokeWidth={1.2} />
        {result.steps.map((step, index) => {
          const x = 26 + (index / Math.max(1, result.steps.length - 1)) * 708;
          const revealed = index <= playback.step;
          return <rect key={step.id} x={x - 4} y={302} width={8} height={8} rx={2} fill={colors[step.kind]} opacity={revealed ? 1 : 0.22} />;
        })}
        <text x={20} y={333} fontSize={14} fill={t.textSecondary}>start</text>
        <text x={740} y={333} textAnchor="end" fontSize={14} fill={t.textSecondary}>finish</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title="Elapsed time" latex={String.raw`T_{\text{total}}=\sum_i d_i`} color="yellow" tilt={-1}><p>dᵢ is the duration of one visible model or tool-result step.</p></StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${result.steps.length}`} color="blue" tilt={1} live><p><strong>{current.phase}:</strong> {current.detail}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Elapsed time" latex={String.raw`T_{\text{total}}=\sum_i d_i`} color="yellow" tilt={-1}>
              <p>dᵢ is the duration of one visible model or tool-result step. A tool action itself adds no wait; its observation carries the tool time.</p>
            </StickyNote>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p>{result.steps.filter((step) => step.kind === 'thought' || step.kind === 'answer').length} model steps and {result.toolAttempts} tool attempts produce <strong>{result.totalMs.toLocaleString()} ms</strong> in this transparent timing model.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live><p><strong>{current.phase}:</strong> {current.detail}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px dashed ${t.border}`, fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>With this failure and retry budget, does the agent reach a final answer?</span>
            <select aria-label="Predicted agent outcome" value={prediction} onChange={(event) => { setPrediction(event.target.value as 'complete' | 'stop'); setPredictionResult(null); }} style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}>
              <option value="complete">Reaches an answer</option>
              <option value="stop">Stops after the error</option>
            </select>
            <VizButton onClick={runPrediction}>Run to the end</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : result.completed ? 'It reaches an answer.' : 'It stops because no retry remains.'}</span>}
          </div>
        </>
      )}
    </>
  );
}

export default function AgentExecutionGraph({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="Agent execution graph playground"
      footer="The graph follows the standard ReAct, plan-and-execute, and reflection control-loop shapes. It is a deterministic simulator, not a live model call: every step and millisecond comes directly from the visible controls."
    >
      <AgentExecutionPlayground compact={compact} />
    </VisualizationContainer>
  );
}
