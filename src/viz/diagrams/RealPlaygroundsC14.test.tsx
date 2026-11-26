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

import RouterVsSupervisorDiagram from './RouterVsSupervisorDiagram';
import ContextCompactionVisualizer from './ContextCompactionVisualizer';
import PagedAttentionVisualizer from './PagedAttentionVisualizer';
import PageRankVisualizer from './PageRankVisualizer';
import DistributionExplorerDiagram from './DistributionExplorerDiagram';

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

describe('real playgrounds batch C14', () => {
  it('RouterVsSupervisorDiagram: autoplays trace, pauses off-screen, accepts free text & threshold, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RouterVsSupervisorDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <RouterVsSupervisorDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();

    // Free text mixed request + supervisor switch -> 100% coverage in 3 decision calls
    fireEvent.change(screen.getByLabelText('User request text'), {
      target: { value: 'I was charged twice and export crashes' },
    });
    expect(view.container.textContent).toContain('1/2 (50%)');
    fireEvent.click(screen.getByRole('button', { name: 'Supervisor (loop & inspect)' }));
    expect(view.container.textContent).toContain('2/2 (100%)');

    // Predict challenge action button
    fireEvent.click(screen.getByRole('button', { name: /coat advice is dropped silently/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run 2-part question on Router now/i }));
    expect(view.container.textContent).toContain('1/2 (50%)');

    const compactView = renderWithVis(<RouterVsSupervisorDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ContextCompactionVisualizer: autoplays turns, pauses off-screen, hand-checked Turn 12 107.7k vs 17.7k, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ContextCompactionVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1950));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ContextCompactionVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Hand-checked Turn 12 worked numbers: 17,700 vs 107,700 (83.6% saved)
    fireEvent.change(screen.getByLabelText('Exact conversation turn'), { target: { value: '12' } });
    expect(view.container.textContent).toContain('17,700');
    expect(view.container.textContent).toContain('107,700');
    expect(view.container.textContent).toContain('83.6%');

    // Predict challenge loads Turn 12 Naive (84.1%)
    fireEvent.click(screen.getByRole('button', { name: /84\.1% full at turn 12/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test Turn 12 Naive/i }));
    expect(view.container.textContent).toContain('84.1%');

    const compactView = renderWithVis(<ContextCompactionVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('PagedAttentionVisualizer: autoplays token growth, pauses off-screen, hand-checked 4.2% vs 79.3% waste, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<PagedAttentionVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    // Hand-checked Step 0 Paged: 184 used / 192 allocated = 8 slots waste = 4.2%
    expect(view.container.textContent).toContain('4.2%');

    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <PagedAttentionVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Edit Req A tokens -> updates block count cleanly
    fireEvent.change(screen.getByLabelText('Request A tokens'), { target: { value: '32' } });
    expect(view.container.textContent).toContain('32 tok');

    // Predict challenge switches to Contiguous 256 -> 2/3 serving, 79.3% waste
    fireEvent.click(screen.getByRole('button', { name: /locked all 32 blocks/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run Contiguous 256-limit now/i }));
    expect(view.container.textContent).toContain('79.3%');
    expect(view.container.textContent).toContain('2/3');

    const compactView = renderWithVis(<PagedAttentionVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('PageRankVisualizer: autoplays iterations, pauses off-screen, edits damping & C->D link, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<PageRankVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1950));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();
    // Hand-checked Step 1: B=0.1438, C=0.5688
    expect(view.container.textContent).toContain('0.1438');
    expect(view.container.textContent).toContain('0.5688');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <PageRankVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Toggle Link C -> D ON and jump to Converged -> rescues D above 0.15
    fireEvent.click(screen.getByRole('button', { name: /Link C → D: OFF/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Converged' }));
    expect(view.container.textContent).toContain('Link C → D: ON');

    // Predict challenge runs d=1.00 -> Page D drains to 0.0000
    fireEvent.click(screen.getByRole('button', { name: /drains all the way down to 0\.0000/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test d = 1\.00 at Converged now/i }));
    expect(view.container.textContent).toContain('0.0000');

    const compactView = renderWithVis(<PageRankVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('DistributionExplorerDiagram: autoplays probe, pauses off-screen, edits params across all 4 families, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<DistributionExplorerDiagram />, true);
    assertCleanPlayground(view.container, 4, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    // Hand-checked Binomial(10, 0.5): mean 5.00, variance 2.50
    expect(view.container.textContent).toContain('5.00');
    expect(view.container.textContent).toContain('2.50');

    act(() => vi.advanceTimersByTime(1900));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <DistributionExplorerDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Switch to Gaussian & edit sigma -> variance updates
    fireEvent.click(screen.getByRole('button', { name: 'Gaussian (bell curve)' }));
    fireEvent.change(screen.getByLabelText('Exact Gaussian std dev sigma'), { target: { value: '2' } });
    expect(view.container.textContent).toContain('4.00');

    // Switch to Categorical & adjust temperature
    fireEvent.click(screen.getByRole('button', { name: 'Categorical (LLM next word)' }));
    fireEvent.change(screen.getByLabelText('Exact softmax temperature T'), { target: { value: '0.5' } });
    expect(view.container.textContent).toContain('Temp T = 0.5');

    // Predict challenge sets Binomial n=20, p=0.50 -> variance 5.00
    fireEvent.click(screen.getByRole('button', { name: /Variance doubles too/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test Binomial n = 20, p = 0\.50 now/i }));
    expect(view.container.textContent).toContain('10.00');
    expect(view.container.textContent).toContain('5.00');

    const compactView = renderWithVis(<DistributionExplorerDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <RouterVsSupervisorDiagram key="router" />,
        <ContextCompactionVisualizer key="compact" />,
        <PagedAttentionVisualizer key="paged" />,
        <PageRankVisualizer key="pr" />,
        <DistributionExplorerDiagram key="dist" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const relPath of [
      'RouterVsSupervisorDiagram.tsx',
      'ContextCompactionVisualizer.tsx',
      'PagedAttentionVisualizer.tsx',
      'PageRankVisualizer.tsx',
      'DistributionExplorerDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, relPath), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
