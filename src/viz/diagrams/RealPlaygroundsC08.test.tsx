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

import FourierSumOfSinesDiagram from './FourierSumOfSinesDiagram';
import AnnVsExactTradeoffDiagram from './AnnVsExactTradeoffDiagram';
import BanditRegretRaceDiagram from './BanditRegretRaceDiagram';
import MorphologicalOpsDiagram from './MorphologicalOpsDiagram';
import ContextBudgetWaterfallVisualizer from './ContextBudgetWaterfallVisualizer';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertCleanPlayground(container: HTMLElement, minKatexCount: number, minClipCount = 1) {
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

describe('real playgrounds batch C08', () => {
  it('FourierSumOfSinesDiagram: autoplays harmonics, pauses off-screen, edits harmonic & pitch, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<FourierSumOfSinesDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1950));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <FourierSumOfSinesDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact max harmonic k'), { target: { value: '11' } });
    expect(screen.getByText(/Highest wave k = 11/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Base pitch f0 (Hz)'), { target: { value: '200' } });
    expect(screen.getAllByText(/2200 Hz/i).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole('button', { name: /squeezes narrower toward the cliff/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test k ≤ 25 square wave now/i }));
    expect(screen.getByText(/Highest wave k = 25/i)).toBeInTheDocument();

    const compactView = renderWithVis(<FourierSumOfSinesDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('AnnVsExactTradeoffDiagram: autoplays ef steps, pauses off-screen, switches index & dataset size, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AnnVsExactTradeoffDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AnnVsExactTradeoffDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /IVF \(clustered buckets\)/i }));
    expect(screen.getByRole('button', { name: /IVF cluster buckets/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Exact ef search budget'), { target: { value: '120' } });
    expect(screen.getByText(/Worked numbers · 10M vectors, ef = 120/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Run a plain exact scan/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 10k vectors now/i }));
    expect(screen.getByText(/At 10k vectors, exact scan takes 0\.85 ms/i)).toBeInTheDocument();

    const compactView = renderWithVis(<AnnVsExactTradeoffDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('BanditRegretRaceDiagram: autoplays horizons, pauses off-screen, edits arm probabilities, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<BanditRegretRaceDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <BanditRegretRaceDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Arm 1 win rate'), { target: { value: '0.85' } });
    expect(screen.getByText(/best arm = #1, p\* = 0\.85/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /UCB1 flattens into a curve/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run 4,500 pulls now/i }));
    expect(screen.getByText(/Crossover achieved!/i)).toBeInTheDocument();

    const compactView = renderWithVis(<BanditRegretRaceDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('MorphologicalOpsDiagram: autoplays ops, pauses off-screen, inspects coordinates & stamp shapes, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<MorphologicalOpsDiagram />, true);
    assertCleanPlayground(view.container, 4, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2250));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <MorphologicalOpsDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Inspect row'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Inspect col'), { target: { value: '5' } });
    expect(screen.getByText(/Worked numbers · Pixel \(5, 5\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Erosion deletes all 4 pixels/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 2×2 object with Opening now/i }));
    expect(screen.getByText(/22 → 16/i)).toBeInTheDocument();

    const compactView = renderWithVis(<MorphologicalOpsDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ContextBudgetWaterfallVisualizer: autoplays turns, pauses off-screen, edits limits, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ContextBudgetWaterfallVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ContextBudgetWaterfallVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Context window limit W'), { target: { value: '64000' } });
    expect(screen.getByText(/64,000 tokens/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Over 1\.3 million cumulative tokens/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run 16 unmanaged turns now/i }));
    expect(screen.getByText(/Turn 16 memory window: 116,200/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1,319,200/).length).toBeGreaterThanOrEqual(2);

    const compactView = renderWithVis(<ContextBudgetWaterfallVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and avoids monospace or uppercase CSS', () => {
    withReducedMotion(() => {
      for (const node of [
        <FourierSumOfSinesDiagram key="f" />,
        <AnnVsExactTradeoffDiagram key="a" />,
        <BanditRegretRaceDiagram key="b" />,
        <MorphologicalOpsDiagram key="m" />,
        <ContextBudgetWaterfallVisualizer key="c" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'FourierSumOfSinesDiagram.tsx',
      'AnnVsExactTradeoffDiagram.tsx',
      'BanditRegretRaceDiagram.tsx',
      'MorphologicalOpsDiagram.tsx',
      'ContextBudgetWaterfallVisualizer.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
