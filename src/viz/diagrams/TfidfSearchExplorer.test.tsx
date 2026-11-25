import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import TfidfSearchExplorer from './TfidfSearchExplorer';

function renderWithVis(visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>
        <TfidfSearchExplorer />
      </VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TfidfSearchExplorer', () => {
  it('renders default query "machine learning" with D1 and D3 tied at 0.1438 and D2 at 0.1233', () => {
    const { container } = renderWithVis(true);

    expect(screen.getByRole('group', { name: /Interactive TF-IDF Search Engine/i })).toBeInTheDocument();
    expect(screen.getByText(/Score the four documents for a search/i)).toBeInTheDocument();

    const idfElements = screen.getAllByText('0.2877');
    expect(idfElements.length).toBeGreaterThanOrEqual(2);

    expect(screen.getAllByText(/Score: 0.1438/i)).toHaveLength(2);
    expect(screen.getByText(/Score: 0.1233/i)).toBeInTheDocument();
    expect(screen.getByText(/Score: 0.0000/i)).toBeInTheDocument();
    expect(screen.getByText(/D1 and D3 tie exactly/i)).toBeInTheDocument();

    // All SVG <text> nodes use fontSize >= 13
    for (const node of Array.from(container.querySelectorAll('svg text'))) {
      expect(Number(node.getAttribute('font-size'))).toBeGreaterThanOrEqual(13);
    }
    // Single VisualizationContainer, no nested bordered panels
    const outer = container.querySelector('.nm-viz-frame');
    expect(outer).not.toBeNull();
    expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);
  });

  it('updates rankings when switching to query "deep learning" or "cooking food"', () => {
    renderWithVis(true);

    fireEvent.click(screen.getByRole('button', { name: /“deep learning”/i }));
    expect(screen.getByText(/Score: 0.2802/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /“cooking food”/i }));
    expect(screen.getByText(/Score: 0.6931/i)).toBeInTheDocument();
  });

  it('autoplays steps, pauses off-screen, supports free text & editable docs, and predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(true);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1\/4:/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2\/4:/)).toBeInTheDocument();

    // Off-screen pauses playback
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <TfidfSearchExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2\/4:/)).toBeInTheDocument();

    // Free text query + editable doc + variant + predict challenge
    fireEvent.change(screen.getByLabelText(/Search query:/i), { target: { value: 'search' } });
    expect(screen.getByText(/Score: 0.3466/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cosine TF-IDF' }));
    fireEvent.click(screen.getByRole('button', { name: '4. Rank' }));
    expect(screen.getByText(/cos\(q, d\)/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Edit D1:/i), { target: { value: 'search improves search' } });
    expect(screen.getByRole('button', { name: 'Reset docs' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /D2 wins/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Search "learning" now/i }));
    expect(screen.getByLabelText(/Search query:/i)).toHaveValue('learning');
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
      renderWithVis(true);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByText(/Step 4\/4:/)).toBeInTheDocument();
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });
});
