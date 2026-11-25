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

import BayesUpdateDiagram from './BayesUpdateDiagram';
import ColdStartDiagram, { ColdStartDiagram as NamedColdStartDiagram } from './ColdStartDiagram';
import BenchmarkDimensionsSelectorDiagram from './BenchmarkDimensionsSelectorDiagram';
import ABShadowCanaryDiagram from './ABShadowCanaryDiagram';
import LimeLocalApproxDiagram from './LimeLocalApproxDiagram';

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

describe('real playgrounds batch C11', () => {
  it('BayesUpdateDiagram: autoplays steps, pauses off-screen, updates counts & posterior, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<BayesUpdateDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('16.10%');
    expect(screen.getByText(/prior belief/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2250));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <BayesUpdateDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Population size N tested'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Common condition (20%)' }));
    expect(view.container.textContent).toContain('82.61%');

    fireEvent.click(screen.getByRole('button', { name: /About 16% \(healthy false alarms outnumber true catches\)/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run 1% \/ 95% \/ 5% case now/i }));
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
    expect(screen.getAllByText(/16\.10%/i).length).toBeGreaterThanOrEqual(1);

    const compactView = renderWithVis(<BayesUpdateDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ColdStartDiagram: exports named & default, autoplays clicks k, pauses off-screen, edits k, compact mode, predict', () => {
    expect(NamedColdStartDiagram).toBe(ColdStartDiagram);
    vi.useFakeTimers();
    const view = renderWithVis(<ColdStartDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ColdStartDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact interaction count k'), { target: { value: '35' } });
    expect(screen.getByText(/1\. Niche Favorite/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Content-based metadata fallback/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Inspect k = 0 now/i }));
    expect(screen.getByText(/this new user has zero behavior logs/i)).toBeInTheDocument();

    const compactView = renderWithVis(<ColdStartDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('BenchmarkDimensionsSelectorDiagram: autoplays axes, pauses off-screen, switches Served vs Retrieval, edits ranks, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<BenchmarkDimensionsSelectorDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2350));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <BenchmarkDimensionsSelectorDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4800));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retrieval (embedding/reranker)' }));
    fireEvent.change(screen.getByLabelText('True relevant document ranks'), { target: { value: '1, 3, 7' } });
    expect(view.container.textContent).toContain('Hits in top 5: 2/3');

    fireEvent.click(screen.getByRole('button', { name: /TTFT \(time waiting before word 1 starts\)/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 4,000-token prompt now/i }));
    expect(screen.getByText(/Reading 4000 prompt tokens/i)).toBeInTheDocument();

    const compactView = renderWithVis(<BenchmarkDimensionsSelectorDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ABShadowCanaryDiagram: autoplays flow, pauses off-screen, switches Shadow/Canary/AB & N, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ABShadowCanaryDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ABShadowCanaryDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Total requests N'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'A/B test (50/50)' }));
    expect(view.container.textContent).toContain('Old served: 1000 · New served: 1000');

    fireEvent.click(screen.getByRole('button', { name: /0 users see an error, and you CANNOT measure CTR lift/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run Shadow with bug now/i }));
    expect(screen.getByText(/Latency \(140 ms\) and 85 errors are measured risk-free/i)).toBeInTheDocument();

    const compactView = renderWithVis(<ABShadowCanaryDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('LimeLocalApproxDiagram: autoplays LIME stages, pauses off-screen, flips weights on opposite rim, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<LimeLocalApproxDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <LimeLocalApproxDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact kernel width sigma'), { target: { value: '0.3' } });
    fireEvent.click(screen.getByRole('button', { name: /Both b₁ and b₂ flip from negative to positive/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Move to \(−1\.0, −0\.5\) now/i }));
    expect(screen.getByText(/Worked numbers · \(-1\.0, -0\.5\)/i)).toBeInTheDocument();

    const compactView = renderWithVis(<LimeLocalApproxDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <BayesUpdateDiagram key="b" />,
        <ColdStartDiagram key="c" />,
        <BenchmarkDimensionsSelectorDiagram key="d" />,
        <ABShadowCanaryDiagram key="a" />,
        <LimeLocalApproxDiagram key="l" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'BayesUpdateDiagram.tsx',
      'ColdStartDiagram.tsx',
      'BenchmarkDimensionsSelectorDiagram.tsx',
      'ABShadowCanaryDiagram.tsx',
      'LimeLocalApproxDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
