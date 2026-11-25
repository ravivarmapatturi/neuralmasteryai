import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import TfidfSearchExplorer from './TfidfSearchExplorer';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TfidfSearchExplorer', () => {
  it('renders default query "machine learning" with D1 and D3 tied at 0.1438, KaTeX sticky formulas, and >=14px SVG fonts', () => {
    const { container } = renderWithVis(<TfidfSearchExplorer />, true);

    expect(screen.getByRole('group', { name: /Interactive TF-IDF Search Engine/i })).toBeInTheDocument();
    expect(screen.getByText(/How TF-IDF decides which document matches best/i)).toBeInTheDocument();

    expect(screen.getAllByText('0.2877').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('0.1438').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0.1233')).toBeInTheDocument();
    expect(screen.getByText('0.0000')).toBeInTheDocument();
    expect(screen.getByText(/D1 and D3 tie exactly/i)).toBeInTheDocument();

    // KaTeX sticky notes render cleanly with zero KaTeX errors, and active formula is highlighted
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('.katex-error')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Classic TF×IDF/i })).toHaveAttribute('aria-pressed', 'true');

    // All SVG <text> nodes use fontSize >= 14
    for (const node of Array.from(container.querySelectorAll('svg text'))) {
      expect(Number(node.getAttribute('font-size'))).toBeGreaterThanOrEqual(14);
    }
    // Plot clipped & single VisualizationContainer
    expect(container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(1);
    const outer = container.querySelector('.nm-viz-frame');
    expect(outer).not.toBeNull();
    expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);
  });

  it('updates rankings when switching presets or clicking formula sticky notes', () => {
    renderWithVis(<TfidfSearchExplorer />, true);

    fireEvent.click(screen.getByRole('button', { name: /“deep learning”/i }));
    expect(screen.getByText('0.2802')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /“cooking food”/i }));
    expect(screen.getByText('0.6931')).toBeInTheDocument();

    // Clicking the Cosine TF-IDF sticky note switches the active formula
    fireEvent.click(screen.getByRole('button', { name: /Cosine TF-IDF/i }));
    expect(screen.getByRole('button', { name: /Cosine TF-IDF/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('autoplays steps, pauses off-screen, supports free text & editable docs, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<TfidfSearchExplorer />, true);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4 · What just happened')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText('Step 2 of 4 · What just happened')).toBeInTheDocument();

    // Off-screen pauses playback
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <TfidfSearchExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('Step 2 of 4 · What just happened')).toBeInTheDocument();

    // Free text query + editable doc + variant + predict challenge
    fireEvent.change(screen.getByLabelText(/Search words/i), { target: { value: 'search' } });
    expect(screen.getByText('0.3466')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Cosine$/ }));
    fireEvent.click(screen.getByRole('button', { name: '4. Total & rank' }));
    expect(screen.getByText(/Cosine compares arrow direction/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Edit D1/i), { target: { value: 'search improves search' } });
    expect(screen.getByRole('button', { name: 'Reset docs' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /D2 wins/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Search “learning” now/i }));
    expect(screen.getByLabelText(/Search words/i)).toHaveValue('learning');
  });

  it('renders compact home mode with core picture + 2 sticky notes and no controls', () => {
    const { container } = renderWithVis(<TfidfSearchExplorer compact />, true);
    expect(container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText(/Search words/i)).not.toBeInTheDocument();
  });

  it('respects prefers-reduced-motion by starting static on the full rank stage', () => {
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
      renderWithVis(<TfidfSearchExplorer />, true);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByText('Step 4 of 4 · What just happened')).toBeInTheDocument();
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });
});
