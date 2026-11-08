import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type LoopState = 'overview' | 'executing' | 'verifying' | 'failed_turn' | 'success';

interface StateDetail {
  key: LoopState;
  title: string;
  stepName: string;
  action: string;
  guardrail: string;
}

const STATES: Record<LoopState, StateDetail> = {
  overview: {
    key: 'overview',
    title: 'Closed-Loop State Machine',
    stepName: 'End-to-End Cycle',
    action: 'Harness orchestrates worker generation and supervisory verification across bounded iterations.',
    guardrail: 'Step limits, token velocity monitoring, and SHA-256 tool argument cycle detection.',
  },
  executing: {
    key: 'executing',
    title: 'Worker Subtask Execution',
    stepName: 'Worker Agent Turn',
    action: 'Agent reads files, executes shell commands in sandbox, and writes diffs to achieve subtask.',
    guardrail: 'Context window bounded; tool call execution wrapped in isolated process groups.',
  },
  verifying: {
    key: 'verifying',
    title: 'Independent Supervisor Audit',
    stepName: 'Supervisor / Verifier Gate',
    action: 'Fresh evaluation agent reviews diffs against specification and runs 3-layer verification.',
    guardrail: 'Worker agent has no self-approval privilege; independent exit code gate required.',
  },
  failed_turn: {
    key: 'failed_turn',
    title: 'Cycle Check & Diagnostic Injection',
    stepName: 'Diagnostic Feedback Turn',
    action: 'Harness hashes tool arguments to detect ping-pong loops; injects compiler error into context.',
    guardrail: 'Circuit breaker halts run if same file/error signature repeats 3 consecutive turns.',
  },
  success: {
    key: 'success',
    title: 'Task Checkoff & Integration',
    stepName: 'Subtask Completion',
    action: 'Subtask marked complete in feature_list.json; next item dequeued until goal is met.',
    guardrail: 'Git commit with automated test proofs attached; user notified.',
  },
};

export default function AutonomousGoalLoopDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<LoopState>('overview');
  const active = STATES[selected];

  return (
    <VisualizationContainer
      title="Autonomous Goal Loop State Machine"
      footer="The harness decouples task execution from verification, injecting diagnostic errors upon test failures and tripping circuit breakers on recurring tool call cycles."
    >
      <VisualizationHeader
        eyebrow="CYBERNETIC CONTROL"
        title="Supervised Goal Loop & Cycle Breaker"
        description="Inspect the control flow of autonomous agents, from initial goal dispatch to independent verifier audit and diagnostic feedback."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<LoopState>
          label="Loop Phase"
          value={selected}
          onChange={setSelected}
          options={[
            { value: 'overview', label: '1. Loop Overview' },
            { value: 'executing', label: '2. Worker Turn' },
            { value: 'verifying', label: '3. Verifier Audit' },
            { value: 'failed_turn', label: '4. Cycle Breaker' },
            { value: 'success', label: '5. Subtask Done' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 300" width="100%" role="img" aria-label="Autonomous Goal Loop State Machine Diagram">
        <defs>
          <marker id="agl-arrow-primary" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.accentPrimary} />
          </marker>
          <marker id="agl-arrow-teal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.accentTeal} />
          </marker>
          <marker id="agl-arrow-danger" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.accentDanger} />
          </marker>
        </defs>

        {/* Node 1: User Goal */}
        <rect x={20} y={20} width={170} height={50} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
        <text x={105} y={42} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>User Dispatches Goal</text>
        <text x={105} y={58} textAnchor="middle" fontSize={10} fill={t.textSecondary}>"Implement feature X"</text>

        {/* Arrow to Harness Evaluator */}
        <line x1={190} y1={45} x2={235} y2={45} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#agl-arrow-primary)" />

        {/* Node 2: Harness Evaluator */}
        <rect
          x={240}
          y={15}
          width={200}
          height={60}
          rx={8}
          fill={selected === 'overview' ? `${t.accentPrimary}18` : t.surfaceAlt}
          stroke={selected === 'overview' ? t.accentPrimary : t.border}
          strokeWidth={selected === 'overview' ? 2 : 1}
        />
        <text x={340} y={38} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Harness Evaluates Loop</text>
        <text x={340} y={56} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Iteration cap · Token velocity cap</text>

        {/* Arrow to Worker */}
        <line x1={340} y1={75} x2={340} y2={100} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#agl-arrow-primary)" />

        {/* Node 3: Worker Agent */}
        <rect
          x={240}
          y={105}
          width={200}
          height={55}
          rx={8}
          fill={selected === 'executing' ? `${t.accentSecondary}22` : t.surface}
          stroke={selected === 'executing' ? t.accentSecondary : t.border}
          strokeWidth={selected === 'executing' ? 2 : 1}
        />
        <text x={340} y={128} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Worker Agent Executes</text>
        <text x={340} y={146} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Subtask edits inside sandbox</text>

        {/* Arrow to Verifier */}
        <line x1={340} y1={160} x2={340} y2={185} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#agl-arrow-primary)" />

        {/* Node 4: Verifier */}
        <rect
          x={240}
          y={190}
          width={200}
          height={55}
          rx={8}
          fill={selected === 'verifying' ? `${t.accentWarn}22` : t.surface}
          stroke={selected === 'verifying' ? t.accentWarn : t.border}
          strokeWidth={selected === 'verifying' ? 2 : 1}
        />
        <text x={340} y={212} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Supervisor / Verifier</text>
        <text x={340} y={230} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Audits diffs &amp; runs 3-layer gate</text>

        {/* Branch: Pass (Right) vs Fail (Left) */}
        <line x1={440} y1={217} x2={485} y2={217} stroke={t.accentTeal} strokeWidth={2} markerEnd="url(#agl-arrow-teal)" />
        <line x1={240} y1={217} x2={195} y2={217} stroke={t.accentDanger} strokeWidth={2} markerEnd="url(#agl-arrow-danger)" />

        {/* Node 5: Success / Checkoff (Right) */}
        <rect
          x={490}
          y={190}
          width={170}
          height={55}
          rx={8}
          fill={selected === 'success' ? `${t.accentTeal}22` : t.surface}
          stroke={selected === 'success' ? t.accentTeal : t.border}
          strokeWidth={selected === 'success' ? 2 : 1}
        />
        <text x={575} y={212} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentTeal}>Passed: Check Off</text>
        <text x={575} y={230} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Update feature_list.json</text>

        {/* Loop back from Success if more tasks */}
        <path d="M 575 190 L 575 45 L 445 45" fill="none" stroke={t.accentTeal} strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#agl-arrow-teal)" />

        {/* Node 6: Fail / Cycle Check (Left) */}
        <rect
          x={20}
          y={190}
          width={170}
          height={55}
          rx={8}
          fill={selected === 'failed_turn' ? `${t.accentDanger}22` : t.surface}
          stroke={selected === 'failed_turn' ? t.accentDanger : t.border}
          strokeWidth={selected === 'failed_turn' ? 2 : 1}
        />
        <text x={105} y={212} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentDanger}>Cycle Check &amp; Feedback</text>
        <text x={105} y={230} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Inject error diagnostics</text>

        {/* Loop back from Fail to Harness routed cleanly through clear space */}
        <path d="M 105 190 L 105 175 L 215 175 L 215 60 L 235 60" fill="none" stroke={t.accentDanger} strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#agl-arrow-danger)" />

        {/* Bottom Status text */}
        <text x={340} y={280} textAnchor="middle" fontSize={11} fill={t.textSecondary}>
          {active.stepName}: {active.action}
        </text>
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <p style={{ margin: '0 0 4px 0', fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Phase:</strong> {active.title}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Guardrail:</strong> {active.guardrail}
        </p>
      </div>
    </VisualizationContainer>
  );
}
