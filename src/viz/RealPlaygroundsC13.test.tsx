import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { VizVisibleContext } from './primitives';

vi.mock('../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../theme/vizTokens')>('../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import PinnLossDiagram from './diagrams/PinnLossDiagram';
import RidgeRegressionStudio from './RidgeRegressionStudio';
import LassoRegressionStudio from './LassoRegressionStudio';
import MatrixTransformationDiagram from './diagrams/MatrixTransformationDiagram';
import StatisticalPowerDiagram from './diagrams/StatisticalPowerDiagram';

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

describe('real playgrounds batch C13', () => {
  it('PinnLossDiagram: autoplays training, pauses off-screen, edits params, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<PinnLossDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();
    // Hand-checked initial state (a=1.0, b=0.8, x0=0.1) -> L_data = 0.0052
    expect(view.container.textContent).toContain('0.0052');

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <PinnLossDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact decay speed a'), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText('Exact drift knob b'), { target: { value: '0.0' } });
    expect(view.container.textContent).toContain('0.0000');

    fireEvent.click(screen.getByRole('button', { name: /data loss at x = 0\.1 stays tiny/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test Data-only drift/i }));
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('0.0052');

    const compactView = renderWithVis(<PinnLossDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('RidgeRegressionStudio: autoplays lambda sweep, pauses off-screen, edits correlation & lambda, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RidgeRegressionStudio />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <RidgeRegressionStudio />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    // Hand-checked at rho=0.98, lambda=0, seed=5 -> x1=1.20, x2=4.76, sum=5.96
    fireEvent.change(screen.getByLabelText('Exact twin correlation rho'), { target: { value: '0.98' } });
    fireEvent.change(screen.getByLabelText('Exact penalty lambda'), { target: { value: '0' } });
    expect(view.container.textContent).toContain('1.20');
    expect(view.container.textContent).toContain('4.76');
    expect(view.container.textContent).toContain('5.96');

    fireEvent.click(screen.getByRole('button', { name: /swing apart in opposite directions/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test ρ = 0\.98 at λ = 0 now/i }));
    expect(view.container.textContent).toContain('25.3×');

    const compactView = renderWithVis(<RidgeRegressionStudio compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('LassoRegressionStudio: autoplays lambda sweep, pauses off-screen, drops features to exact 0, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<LassoRegressionStudio />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <LassoRegressionStudio />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    // Hand-checked at lambda=2.5, rho=0.9, seed=5 -> 2 of 4 dropped, fee = 50.0
    fireEvent.change(screen.getByLabelText('Exact penalty lambda'), { target: { value: '2.5' } });
    expect(view.container.textContent).toContain('2 of 4 dropped');
    expect(view.container.textContent).toContain('50.0');

    fireEvent.click(screen.getByRole('button', { name: /x₃ hits exact zero early/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jump to λ = 0\.25/i }));
    expect(view.container.textContent).toContain('0.000');

    const compactView = renderWithVis(<LassoRegressionStudio compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('MatrixTransformationDiagram: autoplays morph, pauses off-screen, edits matrix & vector, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<MatrixTransformationDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <MatrixTransformationDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Hand-checked shear A=[[1.4,0.6],[0.2,1.1]], v=[1,2] -> A*v=(2.60, 2.40), det=1.42
    fireEvent.change(screen.getByLabelText('Test vector y'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    expect(view.container.textContent).toContain('1.42');
    expect(view.container.textContent).toContain('2.60, 2.40');

    fireEvent.click(screen.getByRole('button', { name: /collapses onto one 1D line/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load \[1\.0, 0\.5; 2\.0, 1\.0\] collapse now/i }));
    expect(view.container.textContent).toContain('Rank = 1');

    const compactView = renderWithVis(<MatrixTransformationDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('StatisticalPowerDiagram: autoplays sample size growth, pauses off-screen, edits n & effect size, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<StatisticalPowerDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    // Hand-checked: 50% vs 55% at n=20 -> requiredN80 = 1,566, power ~6.1%
    expect(view.container.textContent).toContain('1,566');

    act(() => vi.advanceTimersByTime(1900));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <StatisticalPowerDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact sample size n per group'), { target: { value: '1566' } });
    expect(view.container.textContent).toContain('80.');

    fireEvent.click(screen.getByRole('button', { name: /Under 10%/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test \+5\.0 pts at n = 20 now/i }));
    expect(view.container.textContent).toContain('n = 20');

    const compactView = renderWithVis(<StatisticalPowerDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <PinnLossDiagram key="pinn" />,
        <RidgeRegressionStudio key="ridge" />,
        <LassoRegressionStudio key="lasso" />,
        <MatrixTransformationDiagram key="matrix" />,
        <StatisticalPowerDiagram key="power" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const relPath of [
      'diagrams/PinnLossDiagram.tsx',
      'RidgeRegressionStudio.tsx',
      'LassoRegressionStudio.tsx',
      'diagrams/MatrixTransformationDiagram.tsx',
      'diagrams/StatisticalPowerDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, relPath), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
