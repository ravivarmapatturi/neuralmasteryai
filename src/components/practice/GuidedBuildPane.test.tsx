import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuidedBuildPane from './GuidedBuildPane';
import { getPracticeProblem } from '../../lib/practiceProblem';
import { ThemeProvider } from '../../theme/ThemeProvider';

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('GuidedBuildPane Component', () => {
  const problem = getPracticeProblem('react-agent-loop')!;
  const steps = problem.guidedSteps!;

  const defaultProps = {
    problemId: 'react-agent-loop',
    steps,
    code: '',
    onChangeCode: vi.fn(),
    onRun: vi.fn(),
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    isBusy: false,
    status: 'idle' as const,
    saveStatus: 'saved' as const,
    modeToggle: <div data-testid="mock-toggle">Toggle</div>,
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  function renderGuidedPane(props = {}) {
    return render(
      <ThemeProvider>
        <GuidedBuildPane {...defaultProps} {...props} />
      </ThemeProvider>,
    );
  }

  it('renders Step 1 initially with prompt and indicators', () => {
    renderGuidedPane();

    expect(screen.getByTestId('mock-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 1 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[0].title);
    expect(screen.getByTestId('guided-step-prompt')).toHaveTextContent(steps[0].prompt);
    expect(screen.getByTestId('submit-guided-step-btn')).toBeInTheDocument();
  });

  it('advances through steps on submit and reveals Run/Submit on step 5', async () => {
    const user = userEvent.setup();
    const onChangeCode = vi.fn();
    renderGuidedPane({ onChangeCode });

    // Step 1 -> Step 2
    await user.click(screen.getByTestId('submit-guided-step-btn'));
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 2 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[1].title);

    // Step 2 -> Step 3
    await user.click(screen.getByTestId('submit-guided-step-btn'));
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 3 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[2].title);

    // Step 3 -> Step 4
    await user.click(screen.getByTestId('submit-guided-step-btn'));
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 4 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[3].title);

    // Step 4 -> Step 5
    await user.click(screen.getByTestId('submit-guided-step-btn'));
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 5 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[4].title);

    // Step 5 -> Complete!
    await user.click(screen.getByTestId('submit-guided-step-btn'));

    // Completion state
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('All 5 Steps Completed ✓');
    expect(screen.getByTestId('guided-completion-banner')).toBeInTheDocument();

    // Run and Submit buttons are now visible
    const runBtn = screen.getByTestId('run-code-btn');
    const submitBtn = screen.getByTestId('submit-code-btn');
    expect(runBtn).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    // Verify full solution was emitted
    expect(onChangeCode).toHaveBeenCalled();
    const lastCall = onChangeCode.mock.calls[onChangeCode.mock.calls.length - 1][0];
    expect(lastCall).toContain('def react_agent_step(agent_output, available_tools):');
    expect(lastCall).toContain('Final Answer:');
    expect(lastCall).toContain('Observation:');
  });

  it('triggers onRun and onSubmit when completed', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    const onSubmit = vi.fn();

    // Pre-populate completed state in localStorage
    window.localStorage.setItem('nm_practice_guided_step_react-agent-loop', '5');

    renderGuidedPane({ onRun, onSubmit });

    expect(screen.getByTestId('guided-completion-banner')).toBeInTheDocument();

    await user.click(screen.getByTestId('run-code-btn'));
    expect(onRun).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('submit-code-btn'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('resets back to Step 1 on reset confirmation', async () => {
    const user = userEvent.setup();

    // Pre-populate step 3
    window.localStorage.setItem('nm_practice_guided_step_react-agent-loop', '3');

    renderGuidedPane();
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 4 of 5');

    await user.click(screen.getByTestId('reset-guided-steps-btn'));
    // Clicking Reset opens an in-app confirm dialog (not window.confirm) --
    // confirm within it before the reset actually happens.
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 1 of 5');
    expect(screen.getByTestId('guided-step-title')).toHaveTextContent(steps[0].title);
  });

  it('does not reset when the confirm dialog is cancelled', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('nm_practice_guided_step_react-agent-loop', '3');

    renderGuidedPane();
    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 4 of 5');

    await user.click(screen.getByTestId('reset-guided-steps-btn'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('guided-step-indicator')).toHaveTextContent('Step 4 of 5');
  });
});
