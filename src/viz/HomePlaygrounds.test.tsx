import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { VizVisibleContext } from './primitives';
import AttentionStepThrough from './AttentionStepThrough';
import GradientDescentExplorer from './GradientDescentExplorer';

function renderWithTheme(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AttentionStepThrough interactive playground', () => {
  it('mounts with autoplay, plain-English cosine caption, live readout, and >= 13px SVG fonts', () => {
    vi.useFakeTimers();
    const { container } = renderWithTheme(<AttentionStepThrough />);

    // Default sentence starts on "cat" at Stage 0 -> shows cosine 0.94 explanation
    expect(screen.getByText(/Q·Kᵀ: the query vector Q of 'cat'.*'kitten' scores/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    // Autoplay advances to Stage 1 after 1900ms
    act(() => {
      vi.advanceTimersByTime(1950);
    });
    expect(screen.getByText(/dₖ is the length of each key vector/i)).toBeInTheDocument();

    // All SVG <text> nodes use fontSize >= 13
    const svgTexts = Array.from(container.querySelectorAll('svg text'));
    expect(svgTexts.length).toBeGreaterThan(5);
    for (const node of svgTexts) {
      const fs = Number(node.getAttribute('font-size'));
      expect(fs).toBeGreaterThanOrEqual(13);
    }

    // No nested bordered card boxes inside VisualizationContainer
    const outerFrame = container.querySelector('.nm-viz-frame');
    expect(outerFrame).not.toBeNull();
    expect(outerFrame!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);
  });

  it('pauses autoplay when off-screen (VizVisibleContext=false) and when user clicks Pause/Step', () => {
    vi.useFakeTimers();
    renderWithTheme(<AttentionStepThrough />, false);

    // Off-screen: stays on Stage 0 even after interval
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/Q·Kᵀ: the query vector Q of 'cat'/i)).toBeInTheDocument();

    // Visible: manual Step advances stages cleanly and hands control to learner
    renderWithTheme(<AttentionStepThrough />, true);
    const stepBtns = screen.getAllByRole('button', { name: 'Step' });
    fireEvent.click(stepBtns[1]);
    expect(screen.getByText(/dₖ is the length of each key vector/i)).toBeInTheDocument();
  });

  it('responds to free text input, head switching, causal mask, scale toggle, and predict challenge', () => {
    renderWithTheme(<AttentionStepThrough />);

    // Free text sentence input, then click row token 'dog' and toggle causal mask ON
    const input = screen.getByLabelText('Sentence:');
    fireEvent.change(input, { target: { value: 'the dog chased the mouse' } });
    expect(screen.getByText(/Q·Kᵀ: the query vector Q of 'the'/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('dog')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Causal mask: OFF/i }));
    expect(screen.getByRole('button', { name: /Causal mask: ON/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Softmax' }));
    expect(screen.getByText(/masked to 0%/i)).toBeInTheDocument();

    // Switch head
    fireEvent.click(screen.getByRole('button', { name: 'Who did what' }));

    // Predict-then-run challenge reveals feedback and "Test ÷√dₖ OFF now" action
    fireEvent.click(screen.getByRole('button', { name: 'Gets sharper (closer to 100%)' }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test ÷√dₖ OFF now/i }));
    expect(screen.getByRole('button', { name: /÷√dₖ: OFF/i })).toBeInTheDocument();
  });
});

describe('GradientDescentExplorer interactive playground', () => {
  it('mounts with autoplay, live step progression, plain-English caption, and >= 13px SVG fonts', () => {
    vi.useFakeTimers();
    const { container } = renderWithTheme(<GradientDescentExplorer />);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Start at \(-4\.00, 2\.00\)/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(550);
    });
    expect(screen.getByText(/Adam scaled each axis separately/i)).toBeInTheDocument();

    const svgTexts = Array.from(container.querySelectorAll('svg text'));
    expect(svgTexts.length).toBeGreaterThan(5);
    for (const node of svgTexts) {
      const fs = Number(node.getAttribute('font-size'));
      expect(fs).toBeGreaterThanOrEqual(13);
    }
  });

  it('pauses when off-screen (VizVisibleContext=false) and runs manual Step, surface switch, free Start inputs, and predict challenge', () => {
    vi.useFakeTimers();
    renderWithTheme(<GradientDescentExplorer />, false);

    // Off-screen: stays at step 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Start at \(-4\.00, 2\.00\)/i)).toBeInTheDocument();

    // Re-render visible and test free numeric inputs + surface + predict challenge
    renderWithTheme(<GradientDescentExplorer />, true);
    const w1Input = screen.getAllByLabelText(/Start w₁:/i)[1];
    fireEvent.change(w1Input, { target: { value: '-2.5' } });
    expect(screen.getByText(/Start at \(-2\.50, 2\.00\)/i)).toBeInTheDocument();

    const saddleBtn = screen.getAllByRole('button', { name: 'Saddle' })[1];
    fireEvent.click(saddleBtn);
    expect(screen.getAllByText(/Saddle valley/).length).toBeGreaterThan(0);

    const predictBtn = screen.getAllByRole('button', { name: 'Bounces across the steep w₂ wall' })[1];
    fireEvent.click(predictBtn);
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();

    const runPredBtn = screen.getByRole('button', { name: /Run η = 0\.45 SGD now/i });
    fireEvent.click(runPredBtn);
    const stepBtn = screen.getAllByRole('button', { name: 'Step' })[1];
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);
    expect(screen.getByText(/bounced across the steep w₂ wall/i)).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion by starting static in a populated informative state', () => {
    vi.useFakeTimers();
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    try {
      renderWithTheme(<AttentionStepThrough />);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      // Static on stage 2 (Softmax weights)
      expect(screen.getByText(/Softmax turns scores into weights summing to 100%/i)).toBeInTheDocument();

      renderWithTheme(<GradientDescentExplorer />);
      expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(2);
      // Pre-computed full trajectory shown statically
      expect(screen.getByText(/Adam scaled each axis separately|reached the valley floor/i)).toBeInTheDocument();
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });
});
