import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { useGamification } from '../../contexts/GamificationContext';
import { usePracticeCodePane } from '../../contexts/PracticeSplitPaneContext';
import { normalizeRoute, getPageByRoute } from '../../lib/contentTree';

// Lazy so CodeMirror's real ~155KB (min+gzip, measured via `npm run build`) stays out of the main bundle --
// every page that isn't a practice problem (the vast majority of the
// site) never pays for it. The plain <textarea> below is the Suspense
// fallback, not a loading spinner, so typing is never blocked on the
// chunk fetching -- it's a live, fully-functional input the whole time,
// just without highlighting until CodeMirror swaps in (typically well
// under a second on a warm cache, and the code isn't lost either way
// since both inputs share the same `code` state).
const CodeEditor = lazy(() => import('./CodeEditor'));

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

type Status = 'idle' | 'loading' | 'running' | 'done';

/**
 * Real, in-browser Python execution -- Pyodide (CPython compiled to WASM),
 * loaded lazily from a CDN into a dedicated Worker on first Run click, not
 * on page load. Two modes:
 *
 * - No `tests` prop: plain "edit and run" -- real stdout, real tracebacks
 *   on error, nothing simulated.
 * - `tests` prop supplied (assert-based Python lines referencing whatever
 *   the learner's `code` defines): "implement this yourself" mode -- each
 *   assertion is run and reported pass/fail individually, not one
 *   all-or-nothing gate.
 *
 * Why a Worker at all: running CPython-in-WASM on the main thread would
 * freeze the page's UI for however long the script takes. Why "Stop"
 * terminates rather than interrupts: GitHub Pages cannot serve the
 * COOP/COEP headers Pyodide's SharedArrayBuffer-based interrupt buffer
 * needs, so a clean mid-script stop isn't available on this hosting --
 * terminate+respawn is the honest tradeoff, not a workaround pretending
 * to be the real thing.
 */
export default function RunnableCode({
  code: initialCode,
  tests,
  language = 'python',
}: {
  code: string;
  tests?: string;
  language?: 'python';
}) {
  const t = useVizTokens();
  const { awardProblemCompleted } = useGamification();
  const permalink = normalizeRoute(useLocation().pathname);
  // Real frontmatter difficulty for the CURRENT page, looked up once here
  // rather than threaded as a prop through every one of the 66 practice-
  // problem MDX files' own <RunnableCode> call -- pointsForDifficulty
  // (see lib/gamification.ts) falls back sanely to the old flat value if
  // this is undefined (a page with no difficulty frontmatter, or not a
  // real practice-problem route at all).
  const difficulty = getPageByRoute(permalink)?.difficulty;
  void language; // reserved for a future non-Python runtime; Pyodide is Python-only today
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<Status>('idle');
  const [stdout, setStdout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const nextIdRef = useRef(0);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  function ensureWorker(): Worker {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('../../workers/pyodideWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return worker;
  }

  function run() {
    setStatus(tests ? 'loading' : 'loading');
    setStdout('');
    setError(null);
    setTestResults(null);
    setLoadError(null);

    const worker = ensureWorker();
    const id = ++nextIdRef.current;

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.id !== id) return; // stale response from a prior (possibly terminated) run
      if (msg.type === 'load-error') {
        setLoadError(msg.loadErrorDetail ?? 'Failed to load the Python runtime.');
        setStatus('idle');
        return;
      }
      setStdout(msg.stdout ?? '');
      setError(msg.error ?? null);
      if (msg.testResults) setTestResults(msg.testResults);
      if (msg.testResults?.length > 0 && msg.testResults.every((r: TestResult) => r.passed)) {
        awardProblemCompleted(permalink, difficulty); // no-op if this page already earned it once
      }
      setStatus('done');
    };

    setStatus('running');
    if (tests) {
      worker.postMessage({ id, type: 'run-tests', code, tests });
    } else {
      worker.postMessage({ id, type: 'run', code });
    }
  }

  function stop() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('idle');
  }

  const isBusy = status === 'loading' || status === 'running';
  const codePane = usePracticeCodePane();

  const content = (
    <div style={{ border: '1px solid var(--nm-code-rule)', borderRadius: RADIUS.md, margin: `${SPACING.sm}px 0`, background: 'var(--nm-code-bg)', fontFamily: 'var(--font-hand)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SPACING.xs}px ${SPACING.sm}px`, borderBottom: '1px solid var(--nm-code-rule)', background: 'var(--nm-code-gutter-bg)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--nm-code-keyword)', fontFamily: 'var(--font-hand)' }}>
          {tests ? 'Implement it yourself' : 'Run it yourself'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isBusy && (
            <button type="button" onClick={stop} style={btnStyle('secondary')}>
              Stop
            </button>
          )}
          <button type="button" onClick={run} disabled={isBusy} style={btnStyle('primary', isBusy)}>
            {status === 'loading' ? 'Loading Python…' : status === 'running' ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, borderBottom: '1px solid var(--nm-code-rule)', background: 'var(--nm-code-gutter-bg)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--nm-code-gutter-text)', marginBottom: 4, fontFamily: 'var(--font-hand)' }}>
            Downloading a real Python + NumPy runtime into your browser — usually under 20s, one time per page visit.
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--nm-code-rule)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: '40%',
                borderRadius: 2,
                background: 'var(--nm-code-keyword)',
                animation: 'runnable-code-loading-sweep 1.1s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes runnable-code-loading-sweep {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(250%); }
            }
          `}</style>
        </div>
      )}

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
              background: 'var(--nm-code-bg)',
              color: 'var(--nm-code-text)',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'var(--font-mono)',
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          />
        }
      >
        <CodeEditor value={code} onChange={setCode} tokens={t} />
      </Suspense>

      {tests && (
        <div style={{ padding: `${SPACING.xs}px ${SPACING.sm}px`, fontSize: 12, color: 'var(--nm-code-comment)', background: 'var(--nm-code-gutter-bg)', borderTop: '1px solid var(--nm-code-rule)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
          {tests}
        </div>
      )}

      {loadError && (
        <div style={{ padding: SPACING.sm, fontSize: 13, color: 'var(--nm-code-invalid)', fontFamily: 'var(--font-hand)' }}>
          Couldn't load the in-browser Python runtime (needs network access to the CDN it loads from): {loadError}
        </div>
      )}

      {status === 'done' && !loadError && (
        <div style={{ padding: SPACING.sm, borderTop: '1px solid var(--nm-code-rule)', background: 'var(--nm-code-bg)', fontFamily: 'var(--font-hand)' }}>
          {stdout && (
            <pre style={{ margin: 0, marginBottom: error || testResults ? 8 : 0, fontSize: 12.5, color: 'var(--nm-code-text)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
              {stdout}
            </pre>
          )}
          {error && (
            <pre style={{ margin: 0, fontSize: 12.5, color: 'var(--nm-code-invalid)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
              {error}
            </pre>
          )}
          {testResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-hand)' }}>
              {testResults.map((r, i) => (
                <div key={i} style={{ fontSize: 12.5, color: r.passed ? 'var(--nm-code-string)' : 'var(--nm-code-invalid)', fontFamily: 'var(--font-mono)' }}>
                  {r.passed ? '✓' : '✗'} {r.name}
                  {!r.passed && <div style={{ paddingLeft: 16, color: 'var(--nm-code-gutter-text)', whiteSpace: 'pre-wrap' }}>{r.detail}</div>}
                </div>
              ))}
              {testResults.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--nm-code-gutter-text)', fontFamily: 'var(--font-hand)' }}>
                  {testResults.filter((r) => r.passed).length} / {testResults.length} passed
                </div>
              )}
            </div>
          )}
          {!stdout && !error && !testResults && <div style={{ fontSize: 12.5, color: 'var(--nm-code-gutter-text)', fontFamily: 'var(--font-hand)' }}>(no output)</div>}
        </div>
      )}
    </div>
  );

  // On a split-pane practice-problem page (see PracticeProblemLayout.tsx),
  // this teleports the editor/Run/results panel into the right-hand code
  // pane via a portal -- the component still logically renders at its
  // normal position in the MDX tree (so its React state/effects/Worker
  // lifecycle are completely unaffected), it just visually appears
  // elsewhere. Every other page that embeds RunnableCode (no split-pane
  // context provided) renders it inline exactly as before.
  return codePane ? createPortal(content, codePane) : content;
}

function btnStyle(variant: 'primary' | 'secondary', disabled = false) {
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 12px',
    borderRadius: RADIUS.sm,
    fontSize: 12.5,
    fontFamily: 'var(--font-hand)',
    fontWeight: 600,
    border: `1px solid ${variant === 'primary' ? 'var(--nm-code-keyword)' : 'var(--nm-code-rule)'}`,
    background: variant === 'primary' ? 'var(--nm-code-keyword)' : 'transparent',
    color: variant === 'primary' ? '#ffffff' : 'var(--nm-code-text)',
    opacity: disabled ? 0.6 : 1,
  } as const;
}
