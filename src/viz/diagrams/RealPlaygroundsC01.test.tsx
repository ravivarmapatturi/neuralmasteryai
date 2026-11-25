import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import HashMapVsArrayDiagram from './HashMapVsArrayDiagram';
import ImageTensorExplorerDiagram from './ImageTensorExplorerDiagram';
import RewardHackingSimulationDiagram from './RewardHackingSimulationDiagram';
import ScreeningFunnelDiagram from './ScreeningFunnelDiagram';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertCleanContainerFontsAndKatex(container: HTMLElement, minKatexCount = 1) {
  const outer = container.querySelector('.nm-viz-frame');
  expect(outer).not.toBeNull();
  expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);

  expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(minKatexCount);
  expect(container.querySelectorAll('.katex-error')).toHaveLength(0);

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

describe('HashMapVsArrayDiagram live playground', () => {
  it('autoplays, pauses off-screen, computes live hashes with KaTeX sticky notes, handles predict challenge, and supports compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<HashMapVsArrayDiagram />, true);
    assertCleanContainerFontsAndKatex(view.container, 2);
    expect(view.container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getAllByText(/651 mod 8 = bucket 3/i).length).toBeGreaterThanOrEqual(1);

    act(() => vi.advanceTimersByTime(1350));
    expect(screen.getByText(/Step 2:/i)).toBeInTheDocument();

    // Off-screen pauses autoplay
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <HashMapVsArrayDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2:/i)).toBeInTheDocument();

    // Free inputs + bucket change + predict action
    fireEvent.change(screen.getByRole('textbox', { name: /Lookup key/i }), { target: { value: 'sat' } });
    expect(screen.getAllByText(/657 mod 8 = bucket 1/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: '4 buckets' }));
    expect(screen.getAllByText(/657 mod 4 = bucket 1/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText(/Exact n:/i), { target: { value: '100000' } });
    expect(screen.getByText(/100,000 vs/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Array: 100,000 · Hash: ~1–2/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test missing “zebra” now/i }));
    expect(screen.getByRole('textbox', { name: /Lookup key/i })).toHaveValue('zebra');

    const compactView = renderWithVis(<HashMapVsArrayDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion', () => {
    withReducedMotion(() => {
      renderWithVis(<HashMapVsArrayDiagram />, true);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByText(/Done after 6 array checks vs 1 hash check/i)).toBeInTheDocument();
    });
  });
});

describe('ImageTensorExplorerDiagram live playground', () => {
  it('autoplays pixel inspection, edits RGB live, switches mode via clickable formula sticky notes, and satisfies layout guards', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ImageTensorExplorerDiagram />, true);
    assertCleanContainerFontsAndKatex(view.container, 4);

    expect(screen.getByText(/Pixel \(0, 0\) stores \[82, 138, 226\]/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Pixel \(1, 2\) stores/i)).toBeInTheDocument();

    // Click sticky formula note for Grayscale (Y) and edit R,G,B
    fireEvent.click(screen.getByRole('button', { name: /Grayscale brightness \(Y\)/i }));
    expect(screen.getByRole('button', { name: /Grayscale brightness \(Y\)/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByLabelText('R'), { target: { value: '255' } });
    fireEvent.change(screen.getByLabelText('G'), { target: { value: '255' } });
    fireEvent.change(screen.getByLabelText('B'), { target: { value: '0' } });
    expect(screen.getByText(/0\.299×255 \+ 0\.587×255 \+ 0\.114×0 = 225\.9/)).toBeInTheDocument();

    // Switch Z-score via PillSelect and verify clickable sticky active state updates
    fireEvent.click(screen.getByRole('button', { name: /^Z-score$/ }));
    expect(screen.getByRole('button', { name: /ImageNet Z-score/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/z_R = \(1\.000−0\.485\)\/0\.229 = 2\.25/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Blue = 0, Grayscale Y ≈ 226/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();

    const compactView = renderWithVis(<ImageTensorExplorerDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('pauses off-screen and respects prefers-reduced-motion', () => {
    vi.useFakeTimers();
    renderWithVis(<ImageTensorExplorerDiagram />, false);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Pixel \(0, 0\) stores/i)).toBeInTheDocument();

    withReducedMotion(() => {
      renderWithVis(<ImageTensorExplorerDiagram />, true);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByText(/Pixel \(1, 2\) stores/i)).toBeInTheDocument();
    });
  });
});

describe('RewardHackingSimulationDiagram live playground', () => {
  it('autoplays Goodhart collapse, tests KL tether mitigation, clips plots, and supports compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RewardHackingSimulationDiagram />, true);
    assertCleanContainerFontsAndKatex(view.container, 2);
    expect(view.container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText(/Step 0 \(SFT start\)/i)).toBeInTheDocument();
    for (let i = 0; i < 10; i++) {
      act(() => vi.advanceTimersByTime(760));
    }
    expect(screen.getByText(/Step 10 \(Goodhart collapse!\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unbiased judge' }));
    act(() => vi.advanceTimersByTime(760));
    expect(screen.getByText(/zero length bias/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Ideal length L\*:/i), { target: { value: '180' } });
    expect(screen.getByLabelText(/Ideal length L\*:/i)).toHaveValue(180);

    fireEvent.click(screen.getByRole('button', { name: /Stays high \(~8\.7\/10\)/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test β = 2\.0 now/i }));
    expect(screen.getAllByText(/2\.00/).length).toBeGreaterThanOrEqual(1);

    const compactView = renderWithVis(<RewardHackingSimulationDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('pauses off-screen and starts static on step 10 under prefers-reduced-motion', () => {
    vi.useFakeTimers();
    renderWithVis(<RewardHackingSimulationDiagram />, false);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/Step 0 \(SFT start\)/i)).toBeInTheDocument();

    withReducedMotion(() => {
      renderWithVis(<RewardHackingSimulationDiagram />, true);
      expect(screen.getByText(/Step 10 \(Goodhart collapse!\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });
  });
});

describe('ScreeningFunnelDiagram live playground', () => {
  it('autoplays stages, recomputes counts/recall/savings from free inputs, clips histogram, and supports compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ScreeningFunnelDiagram />, true);
    assertCleanContainerFontsAndKatex(view.container, 2);
    expect(view.container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/Start with 200,000 candidates/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/AI filter ≥ 0\.70 cuts 200,000 down to 17,110/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Library N:/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Wet-lab slots K:/i), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/Assay \$\/test:/i), { target: { value: '1000' } });
    expect(screen.getByText(/Lab top-40: 40 tested/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Recall plunges/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test τ = 0\.93 now/i }));
    expect(screen.getByText(/τ=0\.93/)).toBeInTheDocument();

    const compactView = renderWithVis(<ScreeningFunnelDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('pauses off-screen and starts static on final ROI stage under prefers-reduced-motion', () => {
    vi.useFakeTimers();
    renderWithVis(<ScreeningFunnelDiagram />, false);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Start with 200,000 candidates/i)).toBeInTheDocument();

    withReducedMotion(() => {
      renderWithVis(<ScreeningFunnelDiagram />, true);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByText(/Physical tests confirm/i)).toBeInTheDocument();
    });
  });
});
