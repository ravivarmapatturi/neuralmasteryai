import { useState, lazy, Suspense } from 'react';
import type { FrameworkSpec } from '../../lib/practiceProblem';
import { useVizTokens, RADIUS, SPACING, FONT_FAMILY } from '../../theme/vizTokens';

const CodeEditor = lazy(() => import('../content/CodeEditor'));

interface FrameworkModePaneProps {
  problemId: string;
  frameworkSpec: FrameworkSpec;
  code: string;
  onChangeCode: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onStop?: () => void;
  isBusy: boolean;
  status: 'idle' | 'running' | 'submitting';
  saveStatus: 'saved' | 'saving';
  modeToggle?: React.ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function FrameworkModePane({
  problemId: _problemId,
  frameworkSpec,
  code,
  onChangeCode,
  onRun,
  onSubmit,
  onReset,
  onStop,
  isBusy,
  status,
  saveStatus,
  modeToggle,
  isFullscreen,
  onToggleFullscreen,
}: FrameworkModePaneProps) {
  const t = useVizTokens();
  const [showGapsHelp, setShowGapsHelp] = useState(true);

  // Check which gaps are completed
  const gap1Done = !code.includes('# TODO (Gap 1): Call mock_llm') && (code.includes('mock_llm(messages)') || code.includes('mock_llm(state'));
  const gap2Done = !code.includes('# TODO (Gap 2): Return "tools" if the last message') && code.includes('"tools"') && code.includes('END');
  const gap3Done = !code.includes('# TODO (Gap 3):') && code.includes('add_conditional_edges') && code.includes('add_edge');

  const completedCount = (gap1Done ? 1 : 0) + (gap2Done ? 1 : 0) + (gap3Done ? 1 : 0);

  function handleFillSolution() {
    onChangeCode(frameworkSpec.solutionCode);
  }

  return (
    <div
      data-testid="framework-mode-pane"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--nm-surface-alt, #020617)',
        border: '1px solid var(--nm-border, rgba(255,255,255,0.1))',
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          if (!isBusy) onSubmit();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!isBusy) onRun();
        }
      }}
    >
      {/* IDE Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--nm-border, rgba(255,255,255,0.1))',
          background: 'rgba(15, 23, 42, 0.85)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {modeToggle}

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            LangGraph API
          </span>

          <span style={{ fontSize: 11, color: saveStatus === 'saving' ? '#f59e0b' : '#10b981', fontWeight: 500 }}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            data-testid="framework-fill-solution-btn"
            onClick={handleFillSolution}
            title="Pre-fill verified reference solution into the editor gaps"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: '1px solid rgba(168, 85, 247, 0.4)',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              cursor: 'pointer',
            }}
          >
            Fill Solution
          </button>

          <button
            type="button"
            data-testid="framework-reset-btn"
            onClick={onReset}
            title="Reset to starter scaffolding with blank gaps"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--nm-text-secondary, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            Reset Gaps
          </button>

          {isBusy && onStop && (
            <button
              type="button"
              onClick={onStop}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: '1px solid #ef4444',
                background: 'rgba(239,68,68,0.2)',
                color: '#f87171',
                cursor: 'pointer',
              }}
            >
              Stop
            </button>
          )}

          <button
            type="button"
            data-testid="framework-run-btn"
            disabled={isBusy}
            onClick={onRun}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 4,
              border: 'none',
              background: isBusy ? '#475569' : '#0284c7',
              color: '#ffffff',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {status === 'running' ? 'Running…' : '▶ Run'}
          </button>

          <button
            type="button"
            data-testid="framework-submit-btn"
            disabled={isBusy}
            onClick={onSubmit}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 4,
              border: 'none',
              background: isBusy ? '#475569' : 'var(--nm-accent-primary, #3DDC97)',
              color: '#0A0A0B',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit'}
          </button>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--nm-text-muted, #64748b)',
                cursor: 'pointer',
                padding: '4px 6px',
                fontSize: 13,
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '⤦' : '⤢'}
            </button>
          )}
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div
        data-testid="framework-disclaimer-banner"
        style={{
          padding: '8px 14px',
          background: 'rgba(14, 165, 233, 0.08)',
          borderBottom: '1px solid rgba(14, 165, 233, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--nm-text-secondary, #cbd5e1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
            <strong style={{ color: '#38bdf8' }}>LangGraph API Educational Teaching Model:</strong>{' '}
            <span>{frameworkSpec.disclaimer}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGapsHelp(!showGapsHelp)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 4,
            color: '#38bdf8',
            fontSize: 11,
            padding: '2px 8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {showGapsHelp ? 'Hide Guide' : 'Gaps Guide (' + completedCount + '/3)'}
        </button>
      </div>

      {/* Gaps Guide Tray */}
      {showGapsHelp && (
        <div
          data-testid="framework-gaps-card"
          style={{
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.9)',
            borderBottom: '1px solid var(--nm-border, rgba(255,255,255,0.08))',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
          }}
        >
          {frameworkSpec.gaps.map((gap, idx) => {
            const isDone = idx === 0 ? gap1Done : idx === 1 ? gap2Done : gap3Done;
            return (
              <div
                key={gap.id}
                data-testid={`gap-card-${gap.id}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? '#34d399' : '#f1f5f9' }}>
                    {gap.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: isDone ? '#34d399' : '#fbbf24',
                    }}
                  >
                    {isDone ? '✓ Completed' : 'Pending'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--nm-text-muted, #94a3b8)', lineHeight: 1.35 }}>
                  {gap.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Main Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#020617' }}>
        <Suspense
          fallback={
            <textarea
              value={code}
              onChange={(e) => onChangeCode(e.target.value)}
              spellCheck={false}
              rows={Math.max(code.split('\n').length, 8)}
              style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: SPACING.sm,
                background: '#020617',
                color: '#f8fafc',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            />
          }
        >
          <CodeEditor value={code} onChange={onChangeCode} tokens={t} />
        </Suspense>
      </div>
    </div>
  );
}
