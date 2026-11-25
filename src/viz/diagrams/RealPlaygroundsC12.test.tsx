import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import CapTheoremDiagram from './CapTheoremDiagram';
import CtcAlignmentDiagram from './CtcAlignmentDiagram';
import ConvolutionSlideDiagram from './ConvolutionSlideDiagram';
import AgentHarnessArchitectureVisualizer from './AgentHarnessArchitectureVisualizer';
import CohensKappaDiagram from './CohensKappaDiagram';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertCleanPlayground(container: HTMLElement, minKatexCount: number, minClipCount = 2) {
  const outer = container.querySelector('.nm-viz-frame');
  expect(outer).not.toBeNull();
  expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);

  const stickyNotes = container.querySelectorAll('.nm-sticky');
  expect(stickyNotes.length).toBeGreaterThanOrEqual(4);
  expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(minKatexCount);
  expect(container.querySelectorAll('.katex-error')).toHaveLength(0);
  expect(container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(minClipCount);

  const svg = container.querySelector('svg[viewBox]');
  expect(svg).not.toBeNull();
  expect(svg!.getAttribute('viewBox')).toMatch(/^0 0 760 /);

  const svgTexts = Array.from(container.querySelectorAll('svg text'));
  expect(svgTexts.length).toBeGreaterThan(4);
  for (const node of svgTexts) {
    const fs = Number(node.getAttribute('font-size'));
    expect(fs).toBeGreaterThanOrEqual(14);
    expect(fs).toBeLessThanOrEqual(16);
  }
}

function withReducedMotion(fn: () => void) {
  const orig = window.matchMedia;
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
    fn();
  } finally {
    window.matchMedia = orig;
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('real playgrounds batch C12', () => {
  it('CapTheoremDiagram: autoplays steps, pauses off-screen, edits write value & CP/AP, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<CapTheoremDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2250));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <CapTheoremDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New write value on Node A'), { target: { value: '420' } });
    fireEvent.click(screen.getByRole('button', { name: 'AP: Availability first' }));
    // Hand-checked: |420 - 100| = 320 stale gap
    expect(view.container.textContent).toContain('$320');

    fireEvent.click(screen.getByRole('button', { name: /Node B refuses to answer/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run Split \+ CP now/i }));
    expect(screen.getByText(/Step 4 of 4/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('Error 503');

    const compactView = renderWithVis(<CapTheoremDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('CtcAlignmentDiagram: autoplays collapse, pauses off-screen, edits frames & rule order, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<CtcAlignmentDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <CtcAlignmentDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Free text edit: SPEED
    fireEvent.change(screen.getByLabelText('Target transcript word'), { target: { value: 'SPEED' } });
    fireEvent.change(screen.getByLabelText('Per-frame CTC symbols'), { target: { value: 'S - P P - E E - - E E - D D -' } });
    expect(view.container.textContent).toContain('“SPEED”');

    // Predict broken order -> loads HELLO and flips to drop-blanks-first (HELO)
    fireEvent.click(screen.getByRole('button', { name: /Both LL runs merge into one L, turning HELLO into HELO/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test broken order on "HELLO" now/i }));
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('HELO');

    const compactView = renderWithVis(<CtcAlignmentDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ConvolutionSlideDiagram: autoplays sliding window, pauses off-screen, edits pixel intensity & stride, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ConvolutionSlideDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 25/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1350));
    expect(screen.getByText(/Step 2 of 25/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ConvolutionSlideDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2 of 25/i)).toBeInTheDocument();

    // Default Sobel X on verticalEdge at (0, 1) has hand-checked output 760
    expect(view.container.textContent).toContain('760');

    fireEvent.click(screen.getByRole('button', { name: 'Stride 2 (3×3 out)' }));
    expect(view.container.textContent).toContain('3×3');

    fireEvent.change(screen.getByLabelText('Bright pixel intensity'), { target: { value: '110' } });
    // Hand-checked: (110 - 10) * 4 = 400
    expect(view.container.textContent).toContain('400');

    fireEvent.click(screen.getByRole('button', { name: /0, because negative left weights and positive right weights cancel/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jump to flat patch \(0, 0\) now/i }));
    expect(screen.getByText(/Step 1 of 25/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('Total = 0');
    expect(view.container.textContent).toContain('Output [0, 0] = 0');

    const compactView = renderWithVis(<ConvolutionSlideDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('AgentHarnessArchitectureVisualizer: autoplays loop, pauses off-screen, tests custom dangerous commands & budget, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AgentHarnessArchitectureVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AgentHarnessArchitectureVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Free command input + token budget check
    fireEvent.change(screen.getByLabelText('Model proposed shell command'), { target: { value: 'cat ~/.ssh/id_ed25519' } });
    expect(view.container.textContent).toContain('Blocked before run');

    fireEvent.change(screen.getByLabelText('Context token budget'), { target: { value: '16000' } });
    expect(view.container.textContent).toContain('43%');

    fireEvent.click(screen.getByRole('button', { name: /It declares victory anyway because it has no compiler or test exit code/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Switch to Naked model \+ inspect verifier now/i }));
    expect(screen.getByText(/Step 4 of 5/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('Host exposed!');

    const compactView = renderWithVis(<AgentHarnessArchitectureVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('CohensKappaDiagram: autoplays steps, pauses off-screen, edits 2x2 counts, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<CohensKappaDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    // Default skewed trap 85 / 7 / 7 / 1 -> 86.0% raw, 0.049 kappa
    expect(view.container.textContent).toContain('86.0%');
    expect(view.container.textContent).toContain('0.049');

    act(() => vi.advanceTimersByTime(2250));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <CohensKappaDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Switch to balanced preset -> kappa = 0.800
    fireEvent.click(screen.getByRole('button', { name: 'Balanced & clear (κ = 0.80)' }));
    expect(view.container.textContent).toContain('0.800');

    // Free numeric edit
    fireEvent.change(screen.getByLabelText('Exact count: Both say Good'), { target: { value: '10' } });
    expect(view.container.textContent).toContain('N = 65');

    fireEvent.click(screen.getByRole('button', { name: /κ collapses near 0\.05 because both raters say Good ~92% of the time anyway/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load 85 \/ 7 \/ 7 \/ 1 trap now/i }));
    expect(screen.getByText(/Step 4 of 4/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('0.049');

    const compactView = renderWithVis(<CohensKappaDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <CapTheoremDiagram key="cap" />,
        <CtcAlignmentDiagram key="ctc" />,
        <ConvolutionSlideDiagram key="conv" />,
        <AgentHarnessArchitectureVisualizer key="har" />,
        <CohensKappaDiagram key="kap" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'CapTheoremDiagram.tsx',
      'CtcAlignmentDiagram.tsx',
      'ConvolutionSlideDiagram.tsx',
      'AgentHarnessArchitectureVisualizer.tsx',
      'CohensKappaDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
