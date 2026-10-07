import { useState, useEffect } from 'react';
import type { PracticeTestCase } from '../../lib/practiceProblem';
import type { ExecutionResult } from '../../lib/execution/types';
import type { SubmissionRecord } from '../../lib/practicePersistence';
import {
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '../icons/PracticeIcons';

interface TestResultsPaneProps {
  testCases: PracticeTestCase[];
  customTestCases: PracticeTestCase[];
  onAddCustomTest: (input: Record<string, unknown>, expected?: unknown) => void;
  onRemoveCustomTest: (id: string) => void;
  result: ExecutionResult | null;
  lastAction: 'run' | 'submit' | null;
  submissions: SubmissionRecord[];
  onLoadSubmissionCode?: (code: string) => void;
}

/**
 * Generic failure diagnostic: detects shape/type/precision mismatches
 * across any problem structurally without custom authoring.
 */
export function diagnoseFailure(
  expected: unknown,
  actual: unknown,
  caseError?: string,
  expectError?: string,
): string | null {
  // 1. Exception raised where a value was expected
  if (caseError && !expectError) {
    return 'Your code encountered a runtime error before returning a value.';
  }

  // If problem expected an error
  if (expectError) {
    if (!caseError) {
      return `Expected your function to raise ${expectError}, but it returned a value without raising.`;
    }
    return null;
  }

  if (expected === undefined || actual === undefined) {
    if (expected !== undefined && actual === undefined) {
      return 'Expected a return value, but your function returned None / undefined.';
    }
    return null;
  }

  // 2. Array/list length mismatch (both are arrays)
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `Expected ${expected.length} elements but got ${actual.length}.`;
    }
    return null;
  }

  // 3. Type mismatch (including array vs non-array)
  const isExpArr = Array.isArray(expected);
  const isActArr = Array.isArray(actual);
  if (isExpArr !== isActArr) {
    const expType = isExpArr ? 'list' : typeof expected;
    const actType = isActArr ? 'list' : typeof actual;
    return `Expected a ${expType} but your function returned a ${actType}.`;
  }

  if (typeof expected !== typeof actual) {
    return `Expected a ${typeof expected} but your function returned a ${typeof actual}.`;
  }

  // 4. Off-by-a-small-amount on a single number
  if (typeof expected === 'number' && typeof actual === 'number') {
    const diff = Math.abs(expected - actual);
    if (diff > 0 && diff < 0.01) {
      return 'Your answer is very close — check for a rounding or floating-point precision issue.';
    }
  }

  // Fallback: no fabricated explanation
  return null;
}

export default function TestResultsPane({
  testCases,
  customTestCases,
  onAddCustomTest,
  onRemoveCustomTest,
  result,
  lastAction,
  submissions,
  onLoadSubmissionCode,
}: TestResultsPaneProps) {
  const [activeTab, setActiveTab] = useState<'examples' | 'custom' | 'console' | 'submissions'>('examples');
  const [newInputJson, setNewInputJson] = useState<string>('{\n  "a": [1, 2],\n  "b": [3, 4]\n}');
  const [newExpectedJson, setNewExpectedJson] = useState<string>('11');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const visibleTestCases = testCases.filter((tc) => !tc.hidden);
  const passedCount = result?.caseResults.filter((c) => c.passed).length ?? 0;
  const totalCount = result?.caseResults.length ?? 0;

  // Immediately make results visible upon execution/submission. A wrong
  // answer routes to the Examples tab specifically, since that's the
  // view that actually shows expected-vs-actual per case (C2) -- the
  // Results/console tab only ever showed a bare "Wrong Answer" status
  // with no diff, even though the diff UI already existed one tab over.
  useEffect(() => {
    if (result) {
      setActiveTab(result.status === 'wrong_answer' ? 'examples' : 'console');
    }
  }, [result]);

  function handleCreateCustomTest() {
    try {
      const parsedInput = JSON.parse(newInputJson);
      const parsedExpected = newExpectedJson.trim() ? JSON.parse(newExpectedJson) : undefined;
      onAddCustomTest(parsedInput, parsedExpected);
      setShowAddForm(false);
    } catch (err) {
      alert(`Invalid JSON in custom test case input or expected output: ${(err as Error).message}`);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--nm-surface)',
        border: '1px solid var(--nm-border)',
        borderRadius: 8,
        overflow: 'hidden',
        fontSize: 12.5,
        color: 'var(--nm-text-primary)',
      }}
    >
      {/* Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--nm-border)',
          background: 'var(--nm-surface-alt)',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab('examples')}
            style={tabBtnStyle(activeTab === 'examples')}
          >
            Examples ({visibleTestCases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            style={tabBtnStyle(activeTab === 'custom')}
          >
            Custom ({customTestCases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('console')}
            style={tabBtnStyle(activeTab === 'console')}
          >
            Results {result && `(${passedCount}/${totalCount})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            style={tabBtnStyle(activeTab === 'submissions')}
          >
            Submissions ({submissions.length})
          </button>
        </div>

        {result && (
          <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {result.status === 'success' ? (
              <span style={{ color: 'var(--nm-accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckIcon size={14} color="var(--nm-accent-primary)" />
                <span>{lastAction === 'submit' ? 'Submission Accepted' : 'All Tests Passed'}</span>
                {result.bonusEarned && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'color-mix(in srgb, var(--nm-accent-warn) 15%, transparent)',
                      color: 'var(--nm-accent-warn)',
                      marginLeft: 4,
                    }}
                  >
                    +Bonus
                  </span>
                )}
              </span>
            ) : result.status === 'syntax_error' ? (
              <span style={{ color: 'var(--nm-accent-danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangleIcon size={14} color="var(--nm-accent-danger)" />
                <span>Syntax Error</span>
              </span>
            ) : result.status === 'runtime_error' ? (
              <span style={{ color: 'var(--nm-accent-danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangleIcon size={14} color="var(--nm-accent-danger)" />
                <span>Runtime Error</span>
              </span>
            ) : (
              <span style={{ color: 'var(--nm-accent-warn)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CloseIcon size={13} color="var(--nm-accent-warn)" />
                <span>Wrong Answer</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Tab 1: Examples */}
        {activeTab === 'examples' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {visibleTestCases.map((tc, idx) => {
                const caseResult = result?.caseResults.find((c) => c.testCaseId === tc.id);
                const diagnostic =
                  caseResult && !caseResult.passed
                    ? diagnoseFailure(tc.expectedOutput, caseResult.actualOutput, caseResult.error, tc.expectError)
                    : null;

                return (
                  <div
                    key={tc.id}
                    style={{
                      background: 'var(--nm-surface-alt)',
                      border: `1px solid ${
                        caseResult
                          ? caseResult.passed
                            ? 'color-mix(in srgb, var(--nm-accent-primary) 35%, transparent)'
                            : 'color-mix(in srgb, var(--nm-accent-danger) 35%, transparent)'
                          : 'var(--nm-border)'
                      }`,
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--nm-text-primary)' }}>
                        Case {idx + 1}: {tc.label}
                      </span>

                      {caseResult && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: caseResult.passed
                              ? 'color-mix(in srgb, var(--nm-accent-primary) 12%, transparent)'
                              : 'color-mix(in srgb, var(--nm-accent-danger) 12%, transparent)',
                            color: caseResult.passed ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {caseResult.passed ? <CheckIcon size={12} /> : <CloseIcon size={11} />}
                          <span>{caseResult.passed ? 'Passed' : 'Failed'}</span>
                          {caseResult.executionTimeMs !== undefined && ` (${caseResult.executionTimeMs}ms)`}
                        </span>
                      )}
                    </div>

                    {/* Prominent Exception Alert if crashed */}
                    {caseResult?.error && !tc.expectError && (
                      <div
                        style={{
                          margin: '4px 0',
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: 'color-mix(in srgb, var(--nm-accent-danger) 10%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--nm-accent-danger) 25%, transparent)',
                          color: 'var(--nm-accent-danger)',
                          fontSize: 11.5,
                          fontFamily: 'ui-monospace, monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {caseResult.error}
                      </div>
                    )}

                    <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--nm-text-secondary)' }}>
                      <span style={{ color: 'var(--nm-text-muted)' }}>Input: </span>
                      {JSON.stringify(tc.input)}
                    </div>

                    <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--nm-text-secondary)' }}>
                      <span style={{ color: 'var(--nm-text-muted)' }}>Expected: </span>
                      {tc.expectError ? `Raises ${tc.expectError}` : JSON.stringify(tc.expectedOutput)}
                    </div>

                    {caseResult && (
                      <div style={{ fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
                        <span style={{ color: 'var(--nm-text-muted)' }}>Actual: </span>
                        <span style={{ color: caseResult.passed ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)', fontWeight: 600 }}>
                          {JSON.stringify(caseResult.actualOutput)}
                        </span>
                      </div>
                    )}

                    {/* Pedagogical Failure Explanation */}
                    {diagnostic && (
                      <div
                        style={{
                          fontSize: 11.5,
                          lineHeight: 1.45,
                          marginTop: 4,
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: 'color-mix(in srgb, var(--nm-accent-warn) 8%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--nm-accent-warn) 20%, transparent)',
                          color: 'var(--nm-accent-warn)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <InfoIcon size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{diagnostic}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Test Cases */}
        {activeTab === 'custom' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: 'var(--nm-text-secondary)', fontSize: 13 }}>
                Create custom inputs to verify edge cases against your solution.
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  background: 'var(--nm-surface-alt)',
                  border: '1px solid var(--nm-border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--nm-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {showAddForm ? 'Cancel' : '+ Add Test Case'}
              </button>
            </div>

            {showAddForm && (
              <div
                style={{
                  background: 'var(--nm-surface-alt)',
                  border: '1px solid var(--nm-border)',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--nm-text-primary)', marginBottom: 8 }}>
                  New Custom Test Case
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--nm-text-muted)', marginBottom: 4 }}>
                    Input JSON kwargs:
                  </label>
                  <textarea
                    value={newInputJson}
                    onChange={(e) => setNewInputJson(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--nm-surface)',
                      color: 'var(--nm-text-primary)',
                      border: '1px solid var(--nm-border)',
                      borderRadius: 4,
                      padding: 8,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 12,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--nm-text-muted)', marginBottom: 4 }}>
                    Expected Output JSON:
                  </label>
                  <input
                    type="text"
                    value={newExpectedJson}
                    onChange={(e) => setNewExpectedJson(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--nm-surface)',
                      color: 'var(--nm-text-primary)',
                      border: '1px solid var(--nm-border)',
                      borderRadius: 4,
                      padding: 8,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 12,
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateCustomTest}
                  style={{
                    background: 'var(--nm-accent-primary)',
                    color: 'var(--nm-bg, #fff)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Test Case
                </button>
              </div>
            )}

            {customTestCases.length === 0 ? (
              <div style={{ color: 'var(--nm-text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No custom test cases added yet. Click "+ Add Test Case" above.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {customTestCases.map((tc, idx) => {
                  const caseResult = result?.caseResults.find((c) => c.testCaseId === tc.id);

                  return (
                    <div
                      key={tc.id}
                      style={{
                        background: 'var(--nm-surface-alt)',
                        border: '1px solid var(--nm-border)',
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: 'var(--nm-text-primary)' }}>Custom Test {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveCustomTest(tc.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--nm-accent-danger)', cursor: 'pointer', fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>

                      <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--nm-text-secondary)' }}>
                        <span style={{ color: 'var(--nm-text-muted)' }}>Input: </span>
                        {JSON.stringify(tc.input)}
                      </div>

                      <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--nm-text-secondary)' }}>
                        <span style={{ color: 'var(--nm-text-muted)' }}>Expected: </span>
                        {JSON.stringify(tc.expectedOutput)}
                      </div>

                      {caseResult && (
                        <div style={{ fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>
                          <span style={{ color: 'var(--nm-text-muted)' }}>Actual: </span>
                          <span style={{ color: caseResult.passed ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)' }}>
                            {JSON.stringify(caseResult.actualOutput)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Console Output & Results */}
        {activeTab === 'console' && (
          <div>
            {result ? (
              <div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background:
                      result.status === 'success'
                        ? 'color-mix(in srgb, var(--nm-accent-primary) 10%, transparent)'
                        : 'color-mix(in srgb, var(--nm-accent-danger) 10%, transparent)',
                    border: `1px solid ${
                      result.status === 'success'
                        ? 'color-mix(in srgb, var(--nm-accent-primary) 30%, transparent)'
                        : 'color-mix(in srgb, var(--nm-accent-danger) 30%, transparent)'
                    }`,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: result.status === 'success' ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {result.status === 'success' ? (
                      <>
                        <CheckIcon size={16} color="var(--nm-accent-primary)" />
                        <span>{lastAction === 'submit' ? 'Submission Accepted' : 'Execution Succeeded'}</span>
                      </>
                    ) : result.status === 'syntax_error' ? (
                      <>
                        <AlertTriangleIcon size={16} color="var(--nm-accent-danger)" />
                        <span>Syntax Error</span>
                      </>
                    ) : result.status === 'runtime_error' ? (
                      <>
                        <AlertTriangleIcon size={16} color="var(--nm-accent-danger)" />
                        <span>Runtime Error</span>
                      </>
                    ) : (
                      <>
                        <CloseIcon size={15} color="var(--nm-accent-danger)" />
                        <span>Wrong Answer</span>
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--nm-text-muted)', marginTop: 4 }}>
                    Tests Passed: {passedCount} / {totalCount}
                    {result.totalExecutionTimeMs !== undefined && ` · Total Runtime: ${result.totalExecutionTimeMs}ms`}
                  </div>

                  {result.bonusMessage && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: result.bonusEarned
                          ? 'color-mix(in srgb, var(--nm-accent-warn) 12%, transparent)'
                          : 'var(--nm-surface-alt)',
                        border: `1px solid ${
                          result.bonusEarned
                            ? 'color-mix(in srgb, var(--nm-accent-warn) 30%, transparent)'
                            : 'var(--nm-border)'
                        }`,
                        color: result.bonusEarned ? 'var(--nm-accent-warn)' : 'var(--nm-text-secondary)',
                        fontWeight: 600,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <InfoIcon size={13} color="currentColor" />
                      <span>{result.bonusMessage}</span>
                    </div>
                  )}

                  {result.errorMessage && (
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 4,
                        background: 'var(--nm-surface-alt)',
                        border: '1px solid var(--nm-border)',
                        color: 'var(--nm-accent-danger)',
                        fontSize: 11.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {result.errorMessage}
                    </pre>
                  )}
                </div>

                {result.stdout && (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--nm-text-muted)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Stdout Console:
                    </div>
                    <pre
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: 'var(--nm-surface-alt)',
                        border: '1px solid var(--nm-border)',
                        color: 'var(--nm-text-primary)',
                        fontSize: 12,
                        fontFamily: 'ui-monospace, monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {result.stdout}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--nm-text-muted)', fontStyle: 'italic' }}>
                No execution results yet. Click "Run" or "Submit" to execute your solution.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Submissions History */}
        {activeTab === 'submissions' && (
          <div>
            {submissions.length === 0 ? (
              <div style={{ color: 'var(--nm-text-muted)', fontStyle: 'italic' }}>
                No submissions recorded yet. Click "Submit" after implementing your code.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'var(--nm-surface-alt)',
                      border: '1px solid var(--nm-border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: sub.status === 'success' ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {sub.status === 'success' ? <CheckIcon size={13} /> : <CloseIcon size={12} />}
                          <span>{sub.status === 'success' ? 'Accepted' : 'Wrong Answer'}</span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--nm-text-muted)' }}>
                          {sub.passedCount}/{sub.totalCount} tests passed
                        </span>
                        {sub.totalExecutionTimeMs !== undefined && (
                          <span style={{ fontSize: 11, color: 'var(--nm-text-muted)' }}>({sub.totalExecutionTimeMs}ms)</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nm-text-muted)', marginTop: 2 }}>
                        {new Date(sub.timestamp).toLocaleString()}
                      </div>
                    </div>

                    {onLoadSubmissionCode && (
                      <button
                        type="button"
                        onClick={() => onLoadSubmissionCode(sub.code)}
                        style={{
                          background: 'var(--nm-surface)',
                          border: '1px solid var(--nm-border)',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 11,
                          color: 'var(--nm-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Load Code
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function tabBtnStyle(active: boolean) {
  return {
    background: active ? 'var(--nm-surface)' : 'transparent',
    border: `1px solid ${active ? 'var(--nm-border)' : 'transparent'}`,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: active ? 'var(--nm-text-primary)' : 'var(--nm-text-muted)',
    cursor: 'pointer',
  } as const;
}
