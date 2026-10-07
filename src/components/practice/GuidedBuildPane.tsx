import { useState, useEffect, lazy, Suspense } from 'react';
import type { GuidedStep } from '../../lib/practiceProblem';
import { validateStepCode, assembleGuidedCode, getGuidedScaffold, type StepValidationResult } from '../../lib/guidedValidation';
import { loadGuidedStep, saveGuidedStep, clearGuidedStep } from '../../lib/practicePersistence';
import { useVizTokens, RADIUS, SPACING, FONT_FAMILY } from '../../theme/vizTokens';
import ConfirmDialog from '../common/ConfirmDialog';

const CodeEditor = lazy(() => import('../content/CodeEditor'));

interface GuidedBuildPaneProps {
  problemId: string;
  steps: GuidedStep[];
  code: string;
  onChangeCode: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onStop?: () => void;
  isBusy: boolean;
  status: 'idle' | 'running' | 'submitting';
  saveStatus: 'saved' | 'saving';
  modeToggle?: React.ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function GuidedBuildPane({
  problemId,
  steps,
  code: _workspaceCode,
  onChangeCode,
  onRun,
  onSubmit,
  onStop,
  isBusy,
  status,
  saveStatus,
  modeToggle,
  isFullscreen,
  onToggleFullscreen,
}: GuidedBuildPaneProps) {
  const t = useVizTokens();

  // Step state (0-4 = active step 1-5; 5 = all complete)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = loadGuidedStep(problemId);
    return Math.min(Math.max(saved, 0), steps.length);
  });

  // Editor code buffer
  const [editorCode, setEditorCode] = useState<string>(() => {
    const savedStep = loadGuidedStep(problemId);
    const clamped = Math.min(Math.max(savedStep, 0), steps.length);
    return clamped >= steps.length
      ? assembleGuidedCode(steps, steps.length - 1)
      : getGuidedScaffold(steps, clamped);
  });

  const [validationFeedback, setValidationFeedback] = useState<StepValidationResult | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const isComplete = currentStep >= steps.length;

  // Sync workspace code when completing steps or initializing complete state
  useEffect(() => {
    if (isComplete) {
      const full = assembleGuidedCode(steps, steps.length - 1);
      onChangeCode(full);
    }
  }, [isComplete, steps, onChangeCode]);

  // Submit current step handler
  function handleSubmitStep() {
    if (isComplete) return;

    // Validate current step logic
    const validation = validateStepCode(currentStep, editorCode);
    setValidationFeedback(validation);

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    saveGuidedStep(problemId, nextStep);

    if (nextStep >= steps.length) {
      // Completed all 5 steps: reveal the complete verified reference solution
      const finalSolution = assembleGuidedCode(steps, steps.length - 1);
      setEditorCode(finalSolution);
      onChangeCode(finalSolution);
    } else {
      // Advance to next step scaffold
      const nextScaffold = getGuidedScaffold(steps, nextStep);
      setEditorCode(nextScaffold);
      onChangeCode(assembleGuidedCode(steps, currentStep));
    }
  }

  // Reset steps handler
  function handleResetSteps() {
    setConfirmResetOpen(true);
  }
  function doResetSteps() {
    setConfirmResetOpen(false);
    clearGuidedStep(problemId);
    setCurrentStep(0);
    setValidationFeedback(null);
    const step0Code = getGuidedScaffold(steps, 0);
    setEditorCode(step0Code);
    onChangeCode(step0Code);
  }

  const activeStepData = !isComplete ? steps[currentStep] : null;

  return (
    <div
      data-testid="guided-build-pane"
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
          if (isComplete && !isBusy) onSubmit();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (isComplete) {
            if (!isBusy) onRun();
          } else {
            handleSubmitStep();
          }
        }
      }}
    >
      {/* Guided IDE Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--nm-border, rgba(255,255,255,0.1))',
          background: 'rgba(15, 23, 42, 0.8)',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {modeToggle ? (
            modeToggle
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: t.accentTeal }}>
              🪜 GUIDED BUILD
            </span>
          )}

          <span
            data-testid="guided-step-indicator"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: RADIUS.sm,
              background: isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: isComplete ? '#10b981' : '#60a5fa',
              border: `1px solid ${isComplete ? '#10b981' : '#3b82f6'}`,
            }}
          >
            {isComplete ? 'All 5 Steps Completed ✓' : `Step ${currentStep + 1} of ${steps.length}`}
          </span>

          <span style={{ fontSize: 11, color: saveStatus === 'saving' ? '#f59e0b' : '#10b981', fontWeight: 500 }}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isBusy && onStop && (
            <button type="button" onClick={onStop} style={btnStyle(t, 'secondary')}>
              Stop
            </button>
          )}

          <button
            type="button"
            data-testid="reset-guided-steps-btn"
            onClick={handleResetSteps}
            disabled={isBusy}
            style={btnStyle(t, 'secondary', isBusy)}
            title="Reset guided build back to Step 1"
          >
            ↺ Reset Steps
          </button>

          {!isComplete ? (
            <button
              type="button"
              data-testid="submit-guided-step-btn"
              onClick={handleSubmitStep}
              disabled={isBusy}
              style={btnStyle(t, 'primary', isBusy)}
              title="Submit this step and advance to next scaffold (Ctrl/Cmd + Enter)"
            >
              Submit Step {currentStep + 1} →
            </button>
          ) : (
            <>
              <button
                type="button"
                data-testid="run-code-btn"
                onClick={onRun}
                disabled={isBusy}
                style={btnStyle(t, 'secondary', isBusy)}
                title="Run visible test cases (Ctrl/Cmd + Enter)"
              >
                {status === 'running' ? 'Running…' : '▶ Run'}
              </button>

              <button
                type="button"
                data-testid="submit-code-btn"
                onClick={onSubmit}
                disabled={isBusy}
                style={btnStyle(t, 'primary', isBusy)}
                title="Submit to system test suite (Ctrl/Cmd + Shift + Enter)"
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit'}
              </button>
            </>
          )}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={btnStyle(t, 'secondary')}
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Fullscreen Code Editor'}
            >
              {isFullscreen ? '↙' : '⤢'}
            </button>
          )}
        </div>
      </div>

      {/* Step Prompt & Instruction Header */}
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--nm-surface, #0f172a)',
          borderBottom: '1px solid var(--nm-border, rgba(255,255,255,0.1))',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Step Progress Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map((s, idx) => {
            const isStepDone = idx < currentStep;
            const isStepCurrent = idx === currentStep;
            return (
              <div
                key={s.title}
                data-testid={`step-pill-${idx + 1}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: RADIUS.sm,
                  fontSize: 11,
                  fontWeight: 700,
                  background: isStepDone
                    ? 'rgba(16, 185, 129, 0.15)'
                    : isStepCurrent
                      ? 'var(--nm-accent-primary, #3ddc97)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: isStepDone
                    ? '#10b981'
                    : isStepCurrent
                      ? '#0a0a0b'
                      : 'var(--nm-text-muted, #71717a)',
                  border: isStepCurrent
                    ? '1px solid var(--nm-accent-primary, #3ddc97)'
                    : isStepDone
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid var(--nm-border, rgba(255,255,255,0.08))',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{isStepDone ? '✓' : idx + 1}</span>
                <span>Step {idx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Current Step Title and Prompt */}
        {!isComplete && activeStepData ? (
          <div>
            <div
              data-testid="guided-step-title"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--nm-text-primary, #f8fafc)',
                marginBottom: 4,
              }}
            >
              {activeStepData.title}
            </div>
            <div
              data-testid="guided-step-prompt"
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--nm-text-secondary, #cbd5e1)',
              }}
            >
              {activeStepData.prompt}
            </div>
          </div>
        ) : (
          <div
            data-testid="guided-completion-banner"
            style={{
              padding: '8px 12px',
              borderRadius: RADIUS.sm,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 2 }}>
                🎉 All 5 Steps Completed & Verified!
              </div>
              <div style={{ fontSize: 12, color: 'var(--nm-text-secondary, #cbd5e1)' }}>
                Your complete ReAct loop reference solution has been progressively assembled. Click <strong>▶ Run</strong> or <strong>Submit</strong> above to test against the Pyodide runtime.
              </div>
            </div>
          </div>
        )}

        {/* Validation Feedback Alert */}
        {validationFeedback && (
          <div
            data-testid="guided-validation-feedback"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 10px',
              borderRadius: RADIUS.sm,
              background: validationFeedback.valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              color: validationFeedback.valid ? '#10b981' : '#f59e0b',
              border: `1px solid ${validationFeedback.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{validationFeedback.valid ? '✓' : 'ℹ'}</span>
            <span>{validationFeedback.message}</span>
          </div>
        )}
      </div>

      {/* CodeMirror Code Editor Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#020617' }}>
        <Suspense
          fallback={
            <textarea
              value={editorCode}
              onChange={(e) => {
                setEditorCode(e.target.value);
                onChangeCode(e.target.value);
              }}
              spellCheck={false}
              rows={Math.max(editorCode.split('\n').length, 8)}
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
          <CodeEditor
            value={editorCode}
            onChange={(next) => {
              setEditorCode(next);
              onChangeCode(next);
            }}
            tokens={t}
          />
        </Suspense>
      </div>
      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset guided steps?"
        description="This resets all guided steps back to Step 1."
        confirmLabel="Reset"
        onConfirm={doResetSteps}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}

function btnStyle(t: ReturnType<typeof useVizTokens>, variant: 'primary' | 'secondary', disabled = false) {
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 10px',
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    border: `1px solid ${variant === 'primary' ? t.accentPrimary : t.border}`,
    background: variant === 'primary' ? t.accentPrimary : 'transparent',
    color: variant === 'primary' ? t.background : t.textPrimary,
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
  } as const;
}
