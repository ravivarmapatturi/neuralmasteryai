import { lazy, Suspense } from 'react';
import { useVizTokens, RADIUS, SPACING, FONT_FAMILY } from '../../theme/vizTokens';

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
      {/* IDE Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',

          padding: '6px 12px',
          borderBottom: `1px solid ${EDITOR_CHROME.border}`,
          background: EDITOR_CHROME.bar,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {modeToggle ? (
            modeToggle
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: EDITOR_CHROME.label }}>
              Python3
            </span>
          )}

          <span style={{ fontSize: 11, color: saveStatus === 'saving' ? '#f59e0b' : '#10b981', fontWeight: 500 }}>
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

/** The editor is always dark (like most code editors), in both site themes,
 * so its toolbar uses fixed dark-surface colours rather than theme tokens:
 * theme text colours are dark ink in light mode, which made the toolbar
 * buttons invisible on this bar. */
const EDITOR_CHROME = {
  bar: '#0f172a',
  border: 'rgba(148, 163, 184, 0.28)',
  label: '#5eead4',
  text: '#e2e8f0',
  buttonBorder: 'rgba(148, 163, 184, 0.45)',
  buttonHover: 'rgba(148, 163, 184, 0.14)',
} as const;

function btnStyle(variant: 'primary' | 'secondary', disabled = false) {
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 10px',
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    border: `1px solid ${variant === 'primary' ? '#16a34a' : EDITOR_CHROME.buttonBorder}`,
    background: variant === 'primary' ? '#16a34a' : 'transparent',
    color: variant === 'primary' ? '#ffffff' : EDITOR_CHROME.text,
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
  } as const;
}
