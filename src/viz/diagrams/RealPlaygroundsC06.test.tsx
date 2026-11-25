import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import EntropyKlDiagram from './EntropyKlDiagram';
import IndexScanComparisonDiagram from './IndexScanComparisonDiagram';
import MembershipInferenceDiagram from './MembershipInferenceDiagram';
import SimToRealGapDiagram from './SimToRealGapDiagram';
import PsiCalculatorDiagram from './PsiCalculatorDiagram';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertNotebookStandards(container: HTMLElement) {
  const outer = container.querySelector('.nm-viz-frame');
  expect(outer).not.toBeNull();
  expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);

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
  vi.useRealTimers();
});

describe('real playgrounds batch C06', () => {
  it('EntropyKlDiagram: autoplays, pauses off-screen, computes exact weights, supports predict challenge & compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<EntropyKlDiagram />, true);
    assertNotebookStandards(view.container);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2650));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Off-screen pauses autoplay
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <EntropyKlDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    // Switch back visible, edit free numeric weight & test predict challenge
    fireEvent.change(screen.getByLabelText('Model Q weight for cat'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Model Q weight for dog'), { target: { value: '49' } });
    fireEvent.change(screen.getByLabelText('Model Q weight for bird'), { target: { value: '50' } });
    expect(screen.getAllByText(/4\.957/).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Spikes sharply (> 4.5 bits)' }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();

    // Compact mode renders core picture + 2 sticky notes only
    const compactView = renderWithVis(<EntropyKlDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('IndexScanComparisonDiagram: autoplays 16-row race, computes exact O(n) vs O(log n) and planner I/O switch', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<IndexScanComparisonDiagram />, true);
    assertNotebookStandards(view.container);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1950));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Off-screen pauses
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <IndexScanComparisonDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Free input for 1,000,000 rows and predict challenge at 40%
    fireEvent.change(screen.getByLabelText('Exact rows n'), { target: { value: '1000000' } });
    expect(screen.getByText(/50\.0k× speedup/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sequential full scan' }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 1,000,000 rows @ 40% now/i }));
    expect(screen.getByText(/Use Sequential Full Scan/i)).toBeInTheDocument();

    const compactView = renderWithVis(<IndexScanComparisonDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('MembershipInferenceDiagram: autoplays DP stages, supports direct noise/probe inputs & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<MembershipInferenceDiagram />, true);
    assertNotebookStandards(view.container);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2650));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Probe record confidence c'), { target: { value: '0.88' } });
    expect(screen.getByText(/probe c = 88% \(flagged\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Drops near 10–25%/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Apply σ = 0\.35 defense now/i }));
    expect(screen.getByLabelText('Test noise σ directly')).toHaveValue(0.35);

    const compactView = renderWithVis(<MembershipInferenceDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('SimToRealGapDiagram: autoplays reality presets, computes exact gains from free inputs & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<SimToRealGapDiagram />, true);
    assertNotebookStandards(view.container);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2550));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Simulator baseline f_sim'), { target: { value: '1.25' } });
    expect(screen.getByText(/w_sim = 1\/1\.25 = 0\.800/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sim-only (0.0% error at exact match)' }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test exact match f_real = 1\.00 now/i }));
    expect(
      screen.getByText((_, node) => node?.tagName === 'P' && /w_sim = 1\/1\.00 = 1\.000.*0\.0% err/.test(node.textContent ?? '')),
    ).toBeInTheDocument();

    const compactView = renderWithVis(<SimToRealGapDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('PsiCalculatorDiagram: autoplays drift scenarios, recomputes exact PSI from free bucket inputs & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<PsiCalculatorDiagram />, true);
    assertNotebookStandards(view.container);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2550));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Typing exact reference baseline weights yields PSI = 0.000
    fireEvent.change(screen.getByLabelText('Today weight for $0–20'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Today weight for $20–50'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Today weight for $50–100'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('Today weight for $100–250'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Today weight for $250+'), { target: { value: '10' } });
    expect(screen.getAllByText(/PSI = 0\.000/).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /Moving \+15% into the rare 10% bucket/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run \+15% tail spike now/i }));
    expect(screen.getAllByText(/0\.275/).length).toBeGreaterThanOrEqual(1);

    const compactView = renderWithVis(<PsiCalculatorDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and never uses monospace fonts', () => {
    withReducedMotion(() => {
      for (const node of [
        <EntropyKlDiagram key="e" />,
        <IndexScanComparisonDiagram key="i" />,
        <MembershipInferenceDiagram key="m" />,
        <SimToRealGapDiagram key="s" />,
        <PsiCalculatorDiagram key="p" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'EntropyKlDiagram.tsx',
      'IndexScanComparisonDiagram.tsx',
      'MembershipInferenceDiagram.tsx',
      'SimToRealGapDiagram.tsx',
      'PsiCalculatorDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
    }
  });
});
