import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useVizTokens, RADIUS, SPACING, FONT_FAMILY } from '../../theme/vizTokens';
import { useGamification } from '../../contexts/GamificationContext';
import { usePracticeSplitPanes } from '../../contexts/PracticeSplitPaneContext';
import { normalizeRoute } from '../../lib/contentTree';
import { getPracticeProblem, type PracticeTestCase } from '../../lib/practiceProblem';
import { PyodideExecutor } from '../../lib/execution/pyodideExecutor';
import { ServerExecutor } from '../../lib/execution/serverExecutor';
import type { CodeExecutor, ExecutionResult } from '../../lib/execution/types';
import { showRewardToast } from '../ui/Confetti';
import ConfirmDialog from '../common/ConfirmDialog';

// Same bundle-size reasoning as RunnableCode.tsx: CodeMirror stays out of
// every page that doesn't need it.
const CodeEditor = lazy(() => import('./CodeEditor'));

type RunStatus = 'idle' | 'running' | 'submitting';

/**
 * The reusable practice-problem engine (real LeetCode-style Run/Submit,
 * a real per-case testcase panel -- every case its own pass/fail, not one
 * aggregate) -- replaces the older one-off `<RunnableCode code={...}
 * tests={...} />` embedding for any problem migrated to the structured
 * PracticeProblem data model (see practiceProblem.ts). Declared inline in
 * a problem's MDX exactly the same way RunnableCode is (just
 * `<PracticePlayground problemId="dot-product" />`, no other props).
 *
 * Renders in two pieces when a split-pane layout is available (see
 * PracticeSplitPaneContext.tsx): the editor + Run/Submit/Reset controls
 * portal into the layout's editor pane, and the per-case results list
 * portals into a SEPARATE testcase pane below it. Falls back to a single
 * inline block (editor above, testcase list below, in normal document
 * flow) when no split-pane context is provided.
 *
 * Deliberately does NOT import Pyodide or a Worker directly -- only the
 * CodeExecutor interface (see lib/execution/types.ts). PyodideExecutor is
 * the only implementation that exists today (this repo has no
 * application server anywhere), but a future real server-side judge
 * could implement the same interface without this component changing.
 *
 * What this increment does NOT yet do (real, explicit scope -- not
 * silently missing): no autosave/restore of in-progress code, no
 * submission history, no hints, no notes. Those are separate, later
 * increments on top of this same engine.
 */
export interface PracticePlaygroundProps {
  problemId: string;
  celebrateOnSuccess?: boolean;
  onRunSuccess?: (result: ExecutionResult) => void;
}

export default function PracticePlayground({ problemId, celebrateOnSuccess = false, onRunSuccess }: PracticePlaygroundProps) {
  const problem = getPracticeProblem(problemId);
  const t = useVizTokens();
  const { awardProblemCompleted } = useGamification();
  const permalink = normalizeRoute(useLocation().pathname);
  const panes = usePracticeSplitPanes();

  const [code, setCode] = useState(problem?.starterCode ?? '');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [lastAction, setLastAction] = useState<'run' | 'submit' | null>(null);

  const executorRef = useRef<CodeExecutor | null>(null);
  useEffect(() => {
    return () => executorRef.current?.terminate();
  }, []);

  if (!problem) {
    // Not migrated to the Playground engine -- a real, loud signal during
    // development rather than a silent blank pane in production content.
    if (import.meta.env.DEV) {
      return <div style={{ padding: SPACING.sm, color: 'red', fontFamily: FONT_FAMILY }}>PracticePlayground: no problem data registered for "{problemId}".</div>;
    }
    return null;
  }

  function ensureExecutor(): CodeExecutor {
    if (!executorRef.current) {
      if (problem?.judgeMode === 'server' || problem?.judgeMode === 'hybrid') {
        executorRef.current = new ServerExecutor({ enableFallback: true });
      } else {
        executorRef.current = new PyodideExecutor();
      }
    }
    return executorRef.current;
  }

  async function runAgainst(testCases: PracticeTestCase[], action: 'run' | 'submit') {
    setStatus(action === 'run' ? 'running' : 'submitting');
    setLastAction(action);
    const executor = ensureExecutor();
    const res = await executor.execute({ code, functionName: problem!.functionName, testCases });
    setResult(res);
    setStatus('idle');
    if (res.status === 'success') {
      if (action === 'submit') {
        awardProblemCompleted(permalink, undefined); // no-op if this page already earned it once -- structured PracticeProblem has no difficulty field yet
      }
      if (celebrateOnSuccess) {
        showRewardToast({
          title: 'Code Executed Successfully!',
          subtitle: `All ${res.caseResults.length} test cases passed in browser runtime`,
          icon: '⚡',
          type: 'celebration',
        });
      }
      onRunSuccess?.(res);
    }
  }

  function handleRun() {
    void runAgainst(problem!.testCases, 'run');
  }
  function handleSubmit() {
    void runAgainst(problem!.testCases, 'submit');
  }
  function handleReset() {
    setConfirmResetOpen(true);
  }
  function doReset() {
    setConfirmResetOpen(false);
    setCode(problem!.starterCode);
    setResult(null);
    executorRef.current?.terminate();
    executorRef.current = null;
  }
  function handleStop() {
    executorRef.current?.terminate();
    executorRef.current = null;
    setStatus('idle');
  }

  const isBusy = status !== 'idle';

  const editorBlock = (
    <div
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!isBusy) handleRun();
        }
      }}
      style={{ border: `1px solid ${t.border}`, borderRadius: RADIUS.md, background: t.surfaceAlt, fontFamily: FONT_FAMILY, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SPACING.xs}px ${SPACING.sm}px`, borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.accentTeal }}>Python3</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isBusy && (
            <button type="button" onClick={handleStop} style={btnStyle(t, 'secondary')}>
              Stop
            </button>
          )}
          <button type="button" onClick={handleReset} disabled={isBusy} style={btnStyle(t, 'secondary', isBusy)}>
            Reset
          </button>
          <button type="button" onClick={handleRun} disabled={isBusy} style={btnStyle(t, 'secondary', isBusy)} title="Run (Ctrl/Cmd+Enter)">
            {status === 'running' ? 'Running…' : '▶ Run'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={isBusy} style={btnStyle(t, 'primary', isBusy)}>
            {status === 'submitting' ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <Suspense
        fallback={
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={Math.min(Math.max(code.split('\n').length, 4), 20)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: SPACING.sm,
              background: t.surface,
              color: t.textPrimary,
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          />
        }
      >
        <CodeEditor value={code} onChange={setCode} tokens={t} />
      </Suspense>

      {result && (
        <div style={{ padding: SPACING.sm, borderTop: `1px solid ${t.border}` }}>
          <ResultBanner result={result} lastAction={lastAction} t={t} />
          {result.stdout && (
            <pre style={{ marginTop: 8, fontSize: 12, color: t.textSecondary, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>{result.stdout}</pre>
          )}
        </div>
      )}
    </div>
  );

  const testcaseBlock = (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: RADIUS.md, background: t.surfaceAlt, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.accentTeal }}>Test Cases</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {problem.testCases.map((tc, i) => {
          const cr = result?.caseResults.find((c) => c.testCaseId === tc.id);
          return (
            <div key={tc.id} style={{ padding: SPACING.sm, borderBottom: `1px solid ${t.border}`, fontSize: 12.5, fontFamily: 'ui-monospace, monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span
                  aria-hidden="true"
                  style={{ display: 'inline-flex', width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 11, fontWeight: 700, color: t.background, background: cr ? (cr.passed ? t.accentPrimary : t.accentDanger) : t.border }}
                >
                  {cr ? (cr.passed ? '✓' : '✗') : ''}
                </span>
                <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, color: t.textPrimary }}>
                  Case {i + 1}
                  {tc.label ? ` — ${tc.label}` : ''}
                </span>
              </div>
              <div style={{ color: t.textSecondary }}>
                <span style={{ color: t.textMuted }}>Input: </span>
                {JSON.stringify(tc.input)}
              </div>
              <div style={{ color: t.textSecondary }}>
                <span style={{ color: t.textMuted }}>Expected: </span>
                {JSON.stringify(tc.expectedOutput)}
              </div>
              {cr && !cr.error && (
                <div style={{ color: cr.passed ? t.accentPrimary : t.accentDanger }}>
                  <span style={{ color: t.textMuted }}>Actual: </span>
                  {JSON.stringify(cr.actualOutput)}
                </div>
              )}
              {cr?.error && <pre style={{ marginTop: 4, color: t.accentDanger, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>{cr.error}</pre>}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (panes) {
    // A split-pane layout is in play, but its DOM refs may not have
    // resolved yet on the very first render (they're set via ref
    // callbacks in PracticeProblemLayout, which fire slightly after this
    // component's first pass) -- createPortal requires a REAL DOM
    // element, so each portal only renders once its own target exists,
    // rather than passing a throwaway detached div that would silently
    // render nothing visible.
    return (
      <>
        {panes.editorPaneEl && createPortal(editorBlock, panes.editorPaneEl)}
        {panes.testcasePaneEl && createPortal(testcaseBlock, panes.testcasePaneEl)}
        <ConfirmDialog
          open={confirmResetOpen}
          title="Reset your code?"
          description="This resets your code back to the starter template. This cannot be undone."
          confirmLabel="Reset"
          onConfirm={doReset}
          onCancel={() => setConfirmResetOpen(false)}
        />
      </>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
      {editorBlock}
      {testcaseBlock}
      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset your code?"
        description="This resets your code back to the starter template. This cannot be undone."
        confirmLabel="Reset"
        onConfirm={doReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}

/** A real, distinct message per ExecutionStatus -- never a bare
 * pass/fail boolean. Explicitly labels Submit's result as local
 * evaluation (see ExecutionMode's own docstring): this repo has no
 * application server, so "Submit" here means "ran every visible test
 * case in your browser," not an authoritative, hidden-test judge. */
function ResultBanner({ result, lastAction, t }: { result: ExecutionResult; lastAction: 'run' | 'submit' | null; t: ReturnType<typeof useVizTokens> }) {
  const passedCount = result.caseResults.filter((c) => c.passed).length;
  const totalCount = result.caseResults.length;

  if (result.status === 'syntax_error') {
    return <div style={{ color: t.accentDanger, fontWeight: 700, fontSize: 13 }}>Syntax error — your code didn't run at all.</div>;
  }
  if (result.status === 'runtime_error') {
    return (
      <div>
        <div style={{ color: t.accentDanger, fontWeight: 700, fontSize: 13 }}>Runtime error</div>
        {result.errorMessage && <pre style={{ marginTop: 4, fontSize: 12, color: t.accentDanger, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>{result.errorMessage}</pre>}
      </div>
    );
  }
  if (result.status === 'timeout') {
    return <div style={{ color: t.accentDanger, fontWeight: 700, fontSize: 13 }}>Timed out.</div>;
  }
  if (result.status === 'success') {
    return (
      <div style={{ color: t.accentPrimary, fontWeight: 700, fontSize: 13 }}>
        {lastAction === 'submit' ? `Submitted — ${passedCount}/${totalCount} passed (evaluated locally, in your browser).` : `${passedCount}/${totalCount} passed.`}
      </div>
    );
  }
  return (
    <div style={{ color: t.accentDanger, fontWeight: 700, fontSize: 13 }}>
      Wrong answer — {passedCount}/{totalCount} passed.
    </div>
  );
}

function btnStyle(t: ReturnType<typeof useVizTokens>, variant: 'primary' | 'secondary', disabled = false) {
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '5px 12px',
    borderRadius: RADIUS.sm,
    fontSize: 12.5,
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    border: `1px solid ${variant === 'primary' ? t.accentPrimary : t.border}`,
    background: variant === 'primary' ? t.accentPrimary : 'transparent',
    color: variant === 'primary' ? t.background : t.textPrimary,
    opacity: disabled ? 0.6 : 1,
  } as const;
}
