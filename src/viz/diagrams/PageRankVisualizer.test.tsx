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
      screen.getByText(/How links decide which web page to trust most/i)
    ).toBeInTheDocument();

    const scoreItems = screen.getAllByText('0.2500');
    expect(scoreItems.length).toBeGreaterThanOrEqual(4);
  });

  it('updates node scores to exact worked values on Step 1', () => {
    render(<PageRankVisualizer />);

    const step1Btn = screen.getByRole('button', { name: 'Step 1' });
    fireEvent.click(step1Btn);

    // On Step 1 (matching ranking-fundamentals.mdx):
    // A: 0.2500, B: 0.1438, C: 0.5688, D: 0.0375
    expect(screen.getAllByText('0.1438').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.5688').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.0375').length).toBeGreaterThanOrEqual(1);
  });

  it('shows converged steady-state when clicking Converged button', () => {
    render(<PageRankVisualizer />);

    const convergedBtn = screen.getByRole('button', { name: 'Converged' });
    fireEvent.click(convergedBtn);

    expect(screen.getByText(/Converged Steady-State/i)).toBeInTheDocument();
    expect(screen.getAllByText('0.3725').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.1958').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.3941').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.0375').length).toBeGreaterThanOrEqual(1);
  });
});
