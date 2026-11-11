import { lazy, Suspense } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';

const CodeEditor = lazy(() => import('../content/CodeEditor'));

interface CodeEditorPaneProps {
  code: string;
  onChangeCode: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onFormat?: () => void;
  onStop?: () => void;
  isBusy: boolean;
  status: 'idle' | 'running' | 'submitting';
  saveStatus: 'saved' | 'saving';
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  modeToggle?: React.ReactNode;
}

export default function CodeEditorPane({
  code,
  onChangeCode,
  onRun,
  onSubmit,
  onReset,
  onFormat,
  onStop,
  isBusy,
  status,
  saveStatus,
  onToggleFullscreen,
  isFullscreen,
  modeToggle,
}: CodeEditorPaneProps) {
  const t = useVizTokens();

  function handleFormatCode() {
    if (onFormat) {
      onFormat();
      return;
    }
    // Basic clean python formatting: trim trailing spaces per line
    const formatted = code
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
    onChangeCode(formatted);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--nm-code-bg)',
        border: '1px solid var(--nm-code-rule)',
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        fontFamily: 'var(--font-hand)',
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
      {/* IDE Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',

          padding: '6px 12px',
          borderBottom: '1px solid var(--nm-code-rule)',
          background: 'var(--nm-code-gutter-bg)',
          fontFamily: 'var(--font-hand)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {modeToggle ? (
            modeToggle
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--nm-code-keyword)', fontFamily: 'var(--font-hand)' }}>
              Python3
            </span>
          )}

          <span style={{ fontSize: 11.5, color: saveStatus === 'saving' ? 'var(--nm-code-number)' : 'var(--nm-code-string)', fontWeight: 600, fontFamily: 'var(--font-hand)' }}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isBusy && onStop && (
            <button type="button" onClick={onStop} style={btnStyle('secondary')}>
              Stop
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            disabled={isBusy}
            style={btnStyle('secondary', isBusy)}
            title="Reset code template"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleFormatCode}
            disabled={isBusy}
            style={btnStyle('secondary', isBusy)}
            title="Format Code"
          >
            Format
          </button>

          <button
            type="button"
            onClick={onRun}
            disabled={isBusy}
            style={btnStyle('secondary', isBusy)}
            title="Run visible test cases (Ctrl/Cmd + Enter)"
          >
            {status === 'running' ? 'Running…' : '▶ Run'}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isBusy}
            style={btnStyle('primary', isBusy)}
            title="Submit to system test suite (Ctrl/Cmd + Shift + Enter)"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit'}
          </button>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={btnStyle('secondary')}
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Fullscreen Code Editor'}
            >
              {isFullscreen ? '↙' : '⤢'}
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror Code Editor Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: 'var(--nm-code-bg)' }}>
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
                background: 'var(--nm-code-bg)',
                color: 'var(--nm-code-text)',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                lineHeight: 1.6,
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

function btnStyle(variant: 'primary' | 'secondary', disabled = false) {
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 10px',
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontFamily: 'var(--font-hand)',
    fontWeight: 600,
    border: `1px solid ${variant === 'primary' ? 'var(--nm-code-keyword)' : 'var(--nm-code-rule)'}`,
    background: variant === 'primary' ? 'var(--nm-code-keyword)' : 'transparent',
    color: variant === 'primary' ? '#ffffff' : 'var(--nm-code-text)',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
  } as const;
}
