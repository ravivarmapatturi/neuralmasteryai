import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import PageRankVisualizer from './PageRankVisualizer';

describe('PageRankVisualizer', () => {
  it('renders initial Step 0 uniform distribution of 0.2500 across all 4 nodes', () => {
    render(<PageRankVisualizer />);

    expect(
      screen.getByRole('group', { name: /PageRank Power Iteration Simulator/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PageRank Graph & Power Iteration Visualizer/i)
    ).toBeInTheDocument();

    // In step 0, all nodes have 0.2500
    const scoreItems = screen.getAllByText('0.2500');
    expect(scoreItems.length).toBeGreaterThanOrEqual(4);
  });

  it('updates node scores to exact worked values on Step 1', () => {
    render(<PageRankVisualizer />);

    const step1Btn = screen.getByRole('button', { name: /Step 1/i });
    fireEvent.click(step1Btn);

    // On Step 1:
    // A: 0.2500
    // B: 0.14375 -> .toFixed(4) = 0.1437
    // C: 0.56875 -> .toFixed(4) = 0.5687
    // D: 0.0375
    expect(screen.getAllByText('0.1437').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.5687').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.0375').length).toBeGreaterThanOrEqual(1);
  });

  it('shows converged steady-state when clicking Converged button', () => {
    render(<PageRankVisualizer />);

    const convergedBtn = screen.getByRole('button', { name: /Converged/i });
    fireEvent.click(convergedBtn);

    expect(screen.getByText(/Converged Steady-State/i)).toBeInTheDocument();
    // Converged values:
    // A: 0.3725
    // B: 0.1958
    // C: 0.3941
    // D: 0.0375
    expect(screen.getAllByText('0.3725').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.1958').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.3941').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.0375').length).toBeGreaterThanOrEqual(1);
  });
});
