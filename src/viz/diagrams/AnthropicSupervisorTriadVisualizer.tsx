import { useState, useEffect } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, usePrefersReducedMotion } from '../primitives';

interface TriadStep {
  stepIndex: number;
  phaseName: string;
  activeAgent: 'planner' | 'generator' | 'evaluator';
  description: string;
  messageType: 'order' | 'code' | 'verification' | 'checkpoint';
  payloadSummary: string;
  checklistStatus: {
    item1: 'pending' | 'in_progress' | 'passed';
    item2: 'pending' | 'in_progress' | 'passed';
    item3: 'pending' | 'in_progress' | 'passed';
  };
}

const TRIAD_STEPS: TriadStep[] = [
  {
    stepIndex: 1,
    phaseName: 'Step 1: Planner Scoping',
    activeAgent: 'planner',
    description: 'Planner ingests the user request, inspects repository state, and writes an atomic work order to feature_list.json.',
    messageType: 'order',
    payloadSummary: 'TASK_DISPATCH: Implement exponential backoff in retry_policy.py (tests/test_retry.py required)',
    checklistStatus: { item1: 'in_progress', item2: 'pending', item3: 'pending' },
  },
  {
    stepIndex: 2,
    phaseName: 'Step 2: Generator Implementation',
    activeAgent: 'generator',
    description: 'Generator writes Python code and unit tests inside the sandbox. It proposes a git commit candidate.',
    messageType: 'code',
    payloadSummary: 'PROPOSAL: Added calculate_backoff(attempt, base_delay) + pytest suite in tests/test_retry.py',
    checklistStatus: { item1: 'in_progress', item2: 'pending', item3: 'pending' },
  },
  {
    stepIndex: 3,
    phaseName: 'Step 3: Evaluator Interception',
    activeAgent: 'evaluator',
    description: 'Evaluator runs the 3-layer deterministic verifier (ruff, mypy, pytest) inside the sandbox. A defect is caught!',
    messageType: 'verification',
    payloadSummary: 'REJECTED: pytest failed on test_jitter_overflow (AssertionError: 32.1 > 30.0 max_delay cap)',
    checklistStatus: { item1: 'in_progress', item2: 'pending', item3: 'pending' },
  },
  {
    stepIndex: 4,
    phaseName: 'Step 4: Generator Self-Correction',
    activeAgent: 'generator',
    description: 'Generator receives the structured failure traceback, diagnoses the missing min(cap, backoff) clamp, and amends the code.',
    messageType: 'code',
    payloadSummary: 'AMENDMENT: Added clamp return min(max_delay, base_delay * (2 ** attempt)) + full type annotations',
    checklistStatus: { item1: 'in_progress', item2: 'pending', item3: 'pending' },
  },
  {
    stepIndex: 5,
    phaseName: 'Step 5: Evaluator Acceptance & Commit',
    activeAgent: 'evaluator',
    description: 'All 3 verification layers pass cleanly. Evaluator checks off the feature in feature_list.json and writes git commit.',
    messageType: 'checkpoint',
    payloadSummary: 'ACCEPTED: 100% tests passed, 0 type errors. Committed as feat(retry): add capped exponential backoff',
    checklistStatus: { item1: 'passed', item2: 'pending', item3: 'pending' },
  },
];

export default function AnthropicSupervisorTriadVisualizer() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const step = TRIAD_STEPS[currentStepIdx];

  useEffect(() => {
    if (!isPlaying || reducedMotion) return undefined;
    const timer = setTimeout(() => {
      if (currentStepIdx < TRIAD_STEPS.length - 1) {
        setCurrentStepIdx((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, reducedMotion]);

  const handleNext = () => {
    if (currentStepIdx < TRIAD_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  const getAgentColor = (agent: 'planner' | 'generator' | 'evaluator') => {
    if (agent === 'planner') return t.accentPurple;
    if (agent === 'generator') return t.accentTeal;
    return t.accentPrimary;
  };

  return (
    <VisualizationContainer footer="Anthropic's long-running agent architecture separates concerns into specialized agents. The Generator never marks its own work as complete; only the independent Evaluator can sign off on verification and state externalization.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            Multi-Agent Supervisor Protocol
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Anthropic Triad: Planner → Generator → Evaluator
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <VizButton onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? 'Pause' : 'Auto Play'}
          </VizButton>
          <VizButton variant="secondary" onClick={handlePrev} disabled={currentStepIdx === 0}>
            Prev
          </VizButton>
          <VizButton variant="secondary" onClick={handleNext} disabled={currentStepIdx === TRIAD_STEPS.length - 1}>
            Next
          </VizButton>
          <VizButton variant="secondary" onClick={handleReset}>
            Reset
          </VizButton>
        </div>
      </div>

      {/* 3-Agent Node Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Planner Node */}
        <div
          style={{
            background: t.surfaceAlt,
            border: `2px solid ${step.activeAgent === 'planner' ? t.accentPurple : t.border}`,
            borderRadius: 8,
            padding: 12,
            boxShadow: step.activeAgent === 'planner' ? `0 0 12px ${t.accentPurple}40` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentPurple, textTransform: 'uppercase' }}>
              1. Planner Agent
            </span>
            {step.activeAgent === 'planner' && (
              <span style={{ fontSize: 10, background: t.accentPurple, color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            Owns global decomposition, budget tracking, and atomic step definitions.
          </div>
        </div>

        {/* Generator Node */}
        <div
          style={{
            background: t.surfaceAlt,
            border: `2px solid ${step.activeAgent === 'generator' ? t.accentTeal : t.border}`,
            borderRadius: 8,
            padding: 12,
            boxShadow: step.activeAgent === 'generator' ? `0 0 12px ${t.accentTeal}40` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentTeal, textTransform: 'uppercase' }}>
              2. Generator Agent
            </span>
            {step.activeAgent === 'generator' && (
              <span style={{ fontSize: 10, background: t.accentTeal, color: '#000', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            Writes pure code and test edits. Operates strictly inside the isolated sandbox.
          </div>
        </div>

        {/* Evaluator Node */}
        <div
          style={{
            background: t.surfaceAlt,
            border: `2px solid ${step.activeAgent === 'evaluator' ? t.accentPrimary : t.border}`,
            borderRadius: 8,
            padding: 12,
            boxShadow: step.activeAgent === 'evaluator' ? `0 0 12px ${t.accentPrimary}40` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accentPrimary, textTransform: 'uppercase' }}>
              3. Evaluator Agent
            </span>
            {step.activeAgent === 'evaluator' && (
              <span style={{ fontSize: 10, background: t.accentPrimary, color: '#000', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            Deterministic referee. Runs pytest, verifies invariants, signs off on commits.
          </div>
        </div>
      </div>

      {/* Message Bus & Live Step Status */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: getAgentColor(step.activeAgent) }}>
            {step.phaseName}
          </span>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            Step {currentStepIdx + 1} of {TRIAD_STEPS.length}
          </span>
        </div>
        <p style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.5, margin: '0 0 12px 0' }}>
          {step.description}
        </p>

        {/* Telemetry Payload */}
        <div
          style={{
            background: t.background,
            padding: '10px 14px',
            borderRadius: 6,
            border: `1px solid ${t.border}`,
            fontFamily: 'monospace',
            fontSize: 12,
            color: step.messageType === 'verification' && currentStepIdx === 2 ? t.accentDanger : t.textPrimary,
          }}
        >
          {step.payloadSummary}
        </div>
      </div>

      {/* Externalized State: feature_list.json */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
          External State Artifact: feature_list.json
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: step.checklistStatus.item1 === 'passed' ? t.accentPrimary : t.accentWarn }}>
              {step.checklistStatus.item1 === 'passed' ? '✔' : '⏳'}
            </span>
            <span style={{ color: t.textPrimary, textDecoration: step.checklistStatus.item1 === 'passed' ? 'line-through' : 'none' }}>
              Feature: Add exponential backoff algorithm with max jitter cap
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: t.textMuted }}>◻</span>
            <span style={{ color: t.textMuted }}>
              Feature: Add Redis distributed lock provider
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: t.textMuted }}>◻</span>
            <span style={{ color: t.textMuted }}>
              Feature: Telemetry Prometheus metrics exporter
            </span>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
