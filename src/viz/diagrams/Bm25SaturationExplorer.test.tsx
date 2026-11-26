import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import DefaultBm25, { Bm25SaturationExplorer } from './Bm25SaturationExplorer';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Bm25SaturationExplorer', () => {
  it('renders both named and default exports with exact benchmark fixture values (2.299, 1.000, 1.571, 3.612)', () => {
    const view = renderWithVis(<Bm25SaturationExplorer />, true);

    expect(screen.getByRole('group', { name: /Interactive BM25 Saturation & Calculator/i })).toBeInTheDocument();
    expect(screen.getByText(/Why repeating a keyword ten times does not give ten times the score/i)).toBeInTheDocument();

    expect(view.container.textContent).toContain('2.299');
    expect(view.container.textContent).toContain('1.000');
    expect(view.container.textContent).toContain('1.571');
    expect(view.container.textContent).toContain('3.612');
    expect(view.container.textContent).toContain('5.057');

    cleanup();
    renderWithVis(<DefaultBm25 />, true);
    expect(screen.getByRole('group', { name: /Interactive BM25 Saturation & Calculator/i })).toBeInTheDocument();
  });

  it('updates score and ceiling live from presets, sliders, and free numeric inputs', () => {
    const view = renderWithVis(<Bm25SaturationExplorer />, true);

    fireEvent.click(screen.getByRole('button', { name: /Keyword saturation \(tf=30\)/i }));
    expect(view.container.textContent).toContain('4.862');

    fireEvent.click(screen.getByRole('button', { name: /Long document \(\|D\|=500\)/i }));
    expect(view.container.textContent).toContain('1.945');

    fireEvent.click(screen.getByRole('button', { name: /Disable length penalty \(b=0\)/i }));
    expect(view.container.textContent).toContain('3.612');

    // Adjust k1 slider -> ceiling shifts from 2.2*IDF=5.057 to 3.0*IDF=6.896
    const k1Input = screen.getByRole('spinbutton', { name: 'Saturation k₁' });
    fireEvent.change(k1Input, { target: { value: '2' } });
    expect(view.container.textContent).toContain('6.896');

    // Adjust df free numeric input -> IDF changes cleanly
    const dfInput = screen.getByRole('spinbutton', { name: 'Docs with word df' });
    fireEvent.change(dfInput, { target: { value: '50' } });
    expect(view.container.textContent).not.toContain('2.299');
  });

  it('autoplays checkpoints, pauses off-screen, and runs predict-then-run challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<Bm25SaturationExplorer />, true);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/What just happened · step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByText(/What just happened · step 2 of 5/i)).toBeInTheDocument();

    // Off-screen pauses playback
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <Bm25SaturationExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/What just happened · step 2 of 5/i)).toBeInTheDocument();

    // Predict challenge
    fireEvent.click(screen.getByRole('button', { name: /Barely grows \(3\.612 → 4\.862/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run tf = 30 now/i }));
    expect(view.container.textContent).toContain('4.862');
    expect(screen.getByText(/What just happened · step 5 of 5/i)).toBeInTheDocument();
  });
});
