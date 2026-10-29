import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type DefectMode = 'clean' | 'type_error' | 'test_failure' | 'runtime_leak';

interface VerificationResult {
  l1_syntax: { name: string; command: string; passed: boolean; message: string; durationMs: number };
  l2_unit: { name: string; command: string; passed: boolean; message: string; durationMs: number };
  l3_runtime: { name: string; command: string; passed: boolean; message: string; durationMs: number };
}

export default function VerificationThreeLayerSimulator() {
  const t = useVizTokens();
  const [defect, setDefect] = useState<DefectMode>('test_failure');
  const [running, setRunning] = useState(false);

  const getResult = (d: DefectMode): VerificationResult => {
    switch (d) {
      case 'type_error':
        return {
          l1_syntax: {
            name: 'Layer 1: Type & Syntax Audit',
            command: 'ruff check . && mypy --strict',
            passed: false,
            message: 'error: Argument 1 to "forward" of "MultiHeadAttention" has incompatible type "Tensor | None"; expected "Tensor" [arg-type]',
            durationMs: 420,
          },
          l2_unit: {
            name: 'Layer 2: Deterministic Tests',
            command: 'pytest tests/test_attention.py -v',
            passed: false,
            message: 'Skipped: Layer 1 failed. Harness aborted pytest runner to preserve execution budget.',
            durationMs: 0,
          },
          l3_runtime: {
            name: 'Layer 3: Behavioral Smoke Tests',
            command: 'python -m tests.e2e.test_smoke',
            passed: false,
            message: 'Skipped: Preceding layers unverified.',
            durationMs: 0,
          },
        };
      case 'test_failure':
        return {
          l1_syntax: {
            name: 'Layer 1: Type & Syntax Audit',
            command: 'ruff check . && mypy --strict',
            passed: true,
            message: 'Clean: All 24 Python modules passed ruff lint & mypy strict checks.',
            durationMs: 380,
          },
          l2_unit: {
            name: 'Layer 2: Deterministic Tests',
            command: 'pytest tests/test_attention.py -v',
            passed: false,
            message: 'FAILED tests/test_attention.py::test_qkv_projection_shape - AssertionError: assert (2, 1, 512) == (2, 8, 64). Dropped num_heads dimension.',
            durationMs: 890,
          },
          l3_runtime: {
            name: 'Layer 3: Behavioral Smoke Tests',
            command: 'python -m tests.e2e.test_smoke',
            passed: false,
            message: 'Skipped: Unit test assertions failed.',
            durationMs: 0,
          },
        };
      case 'runtime_leak':
        return {
          l1_syntax: {
            name: 'Layer 1: Type & Syntax Audit',
            command: 'ruff check . && mypy --strict',
            passed: true,
            message: 'Clean: 0 static syntax or type errors.',
            durationMs: 370,
          },
          l2_unit: {
            name: 'Layer 2: Deterministic Tests',
            command: 'pytest tests/test_attention.py -v',
            passed: true,
            message: 'PASSED: 22 / 22 pytest assertions green.',
            durationMs: 820,
          },
          l3_runtime: {
            name: 'Layer 3: Behavioral Smoke Tests',
            command: 'python -m tests.e2e.test_smoke',
            passed: false,
            message: 'TimeoutError: FastAPI inference server did not respond on /health within 15.0s. Worker thread deadlocked on unreleased asyncio.Lock.',
            durationMs: 15100,
          },
        };
      case 'clean':
      default:
        return {
          l1_syntax: {
            name: 'Layer 1: Type & Syntax Audit',
            command: 'ruff check . && mypy --strict',
            passed: true,
            message: 'Clean: 0 errors in ruff or mypy across all Python files.',
            durationMs: 390,
          },
          l2_unit: {
            name: 'Layer 2: Deterministic Tests',
            command: 'pytest tests/test_attention.py -v',
            passed: true,
            message: 'PASSED: 22 / 22 pytest tests passed in 0.84s (100% test coverage on changed symbols).',
            durationMs: 840,
          },
          l3_runtime: {
            name: 'Layer 3: Behavioral Smoke Tests',
            command: 'python -m tests.e2e.test_smoke',
            passed: true,
            message: 'PASSED: FastAPI server booted, healthcheck 200 OK, Pyodide/NumPy kernel verified in 1.4s.',
            durationMs: 1420,
          },
        };
    }
  };

  const results = getResult(defect);
  const overallPassed = results.l1_syntax.passed && results.l2_unit.passed && results.l3_runtime.passed;

  const triggerRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
    }, 600);
  };

  return (
    <VisualizationContainer
      footer="The 3-Layer Verification Rule: A change is never declared complete until it survives Static Audit (Layer 1), Unit Assertion (Layer 2), and Behavioral Smoke Execution (Layer 3). When any layer fails, the harness catches the error and feeds actionable feedback into the agent's next turn."
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <PillSelect<DefectMode>
          label="Test Scenario"
          value={defect}
          onChange={(v) => {
            setDefect(v);
          }}
          options={[
            { value: 'clean', label: '1. Clean Build (All 3 Pass)' },
            { value: 'type_error', label: '2. Type Mismatch (Layer 1 Fails)' },
            { value: 'test_failure', label: '3. Math Regression (Layer 2 Fails)' },
            { value: 'runtime_leak', label: '4. Render Hang (Layer 3 Fails)' },
          ]}
        />
        <button
          type="button"
          onClick={triggerRun}
          disabled={running}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            background: running ? t.surfaceAlt : t.accentPrimary,
            color: running ? t.textMuted : '#FFFFFF',
            border: `1px solid ${running ? t.border : t.accentPrimary}`,
            fontWeight: 600,
            fontSize: 12,
            cursor: running ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          {running ? 'Running Verification Pipeline...' : '▶ Re-run 3-Layer Pipeline'}
        </button>
      </div>

      {/* 3 Pipeline Stages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* Layer 1 */}
        <div
          style={{
            padding: 14,
            borderRadius: 8,
            background: t.surface,
            border: `1.5px solid ${results.l1_syntax.passed ? t.accentPrimary : t.accentDanger}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>LAYER 1: STATIC</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: results.l1_syntax.passed ? t.accentPrimary : t.accentDanger,
              }}
            >
              {results.l1_syntax.passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, margin: '6px 0 2px' }}>
            TypeScript & Linter Audit
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>{results.l1_syntax.command}</div>
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderRadius: 4,
              background: t.surfaceAlt,
              fontSize: 11,
              fontFamily: 'monospace',
              color: results.l1_syntax.passed ? t.textSecondary : t.accentDanger,
              minHeight: 46,
            }}
          >
            {results.l1_syntax.message}
          </div>
        </div>

        {/* Layer 2 */}
        <div
          style={{
            padding: 14,
            borderRadius: 8,
            background: t.surface,
            border: `1.5px solid ${
              !results.l1_syntax.passed
                ? t.border
                : results.l2_unit.passed
                ? t.accentPrimary
                : t.accentDanger
            }`,
            opacity: !results.l1_syntax.passed ? 0.6 : 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>LAYER 2: UNIT</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: !results.l1_syntax.passed ? t.textMuted : results.l2_unit.passed ? t.accentPrimary : t.accentDanger,
              }}
            >
              {!results.l1_syntax.passed ? 'SKIPPED' : results.l2_unit.passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, margin: '6px 0 2px' }}>
            Deterministic Test Suite
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>{results.l2_unit.command}</div>
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderRadius: 4,
              background: t.surfaceAlt,
              fontSize: 11,
              fontFamily: 'monospace',
              color: results.l2_unit.passed ? t.textSecondary : t.accentDanger,
              minHeight: 46,
            }}
          >
            {results.l2_unit.message}
          </div>
        </div>

        {/* Layer 3 */}
        <div
          style={{
            padding: 14,
            borderRadius: 8,
            background: t.surface,
            border: `1.5px solid ${
              !results.l2_unit.passed
                ? t.border
                : results.l3_runtime.passed
                ? t.accentPrimary
                : t.accentDanger
            }`,
            opacity: !results.l2_unit.passed ? 0.6 : 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>LAYER 3: RUNTIME</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: !results.l2_unit.passed ? t.textMuted : results.l3_runtime.passed ? t.accentPrimary : t.accentDanger,
              }}
            >
              {!results.l2_unit.passed ? 'SKIPPED' : results.l3_runtime.passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, margin: '6px 0 2px' }}>
            End-to-End Behavioral Smoke
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>{results.l3_runtime.command}</div>
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderRadius: 4,
              background: t.surfaceAlt,
              fontSize: 11,
              fontFamily: 'monospace',
              color: results.l3_runtime.passed ? t.textSecondary : t.accentDanger,
              minHeight: 46,
            }}
          >
            {results.l3_runtime.message}
          </div>
        </div>
      </div>

      {/* Feedback Delivery Box */}
      <div
        style={{
          padding: 14,
          borderRadius: 8,
          background: overallPassed ? `${t.accentPrimary}15` : `${t.accentWarn}15`,
          border: `1.5px solid ${overallPassed ? t.accentPrimary : t.accentWarn}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: overallPassed ? t.accentPrimary : t.accentWarn }}>
            {overallPassed ? '✓ HARNESS VERIFICATION PASSED' : '⚡ HARNESS FEEDBACK INTERCEPTED'}
          </span>
          <span style={{ fontSize: 11, fontFamily: HAND_FONT, color: t.textSecondary }}>
            {overallPassed ? 'Ready for Git Commit & Deployment' : 'Triggering Agent Self-Correction Turn'}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: t.textPrimary, lineHeight: 1.45 }}>
          {overallPassed
            ? 'All 3 layers succeeded. The harness grants authorization to finalize the task, stage commits, and deploy.'
            : 'The model attempted to conclude the turn, but the harness blocked premature completion. The diagnostic output above was automatically injected into the next prompt turn, compelling the agent to resolve the regression.'}
        </p>
      </div>
    </VisualizationContainer>
  );
}
