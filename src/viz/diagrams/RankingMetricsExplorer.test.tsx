import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import RankingMetricsExplorer from './RankingMetricsExplorer';

describe('RankingMetricsExplorer', () => {
  it('renders initial metrics for Preset 1 [A, D, B, C, E]', () => {
    render(<RankingMetricsExplorer />);

    expect(screen.getByRole('group', { name: /Interactive Ranking Evaluation Metrics Calculator/i })).toBeInTheDocument();
    expect(screen.getByText(/Rank-Aware vs. Set-Based Evaluation/i)).toBeInTheDocument();

    // Precision@3 = 2/3 = 0.6667 and Recall@3 = 2/3 = 0.6667
    const metricValues = screen.getAllByText('0.6667');
    expect(metricValues.length).toBeGreaterThanOrEqual(2);

    // Hit Rate@3 = 1.00
    expect(screen.getByText('1.00')).toBeInTheDocument();
    // MRR = 1.0000 (Doc A at rank 1)
    expect(screen.getByText('1.0000')).toBeInTheDocument();
    // AP@3 = 0.5556
    expect(screen.getByText('0.5556')).toBeInTheDocument();
    // NDCG@3 = 0.9049
    expect(screen.getByText('0.9049')).toBeInTheDocument();
  });

  it('demonstrates that demoting the first relevant document drops MRR and NDCG while Precision and Recall stay fixed', () => {
    render(<RankingMetricsExplorer />);

    // Switch to Preset 2: [D, A, B, C, E]
    const preset2Btn = screen.getByRole('button', { name: /Preset 2: \[D, A, B, C, E\]/i });
    fireEvent.click(preset2Btn);

    // Precision@3 and Recall@3 remain 0.6667
    const precisionValues = screen.getAllByText('0.6667');
    expect(precisionValues.length).toBeGreaterThanOrEqual(2); // P@3 and R@3

    // MRR drops from 1.0000 to 0.5000 (first relevant item delayed to rank 2)
    expect(screen.getByText('0.5000')).toBeInTheDocument();

    // AP@3 drops from 0.5556 to 0.3889
    expect(screen.getByText('0.3889')).toBeInTheDocument();

    // NDCG@3 drops from 0.9049 to 0.6299
    expect(screen.getByText('0.6299')).toBeInTheDocument();
  });

  it('calculates ideal NDCG=1.0000 when Ideal Preset [A, B, C, D, E] is clicked', () => {
    render(<RankingMetricsExplorer />);

    const idealBtn = screen.getByRole('button', { name: /Ideal: \[A, B, C, D, E\]/i });
    fireEvent.click(idealBtn);

    // Both MRR and NDCG@3 achieve 1.0000
    const perfectScores = screen.getAllByText('1.0000');
    expect(perfectScores.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('DCG: 9.39 / 9.39')).toBeInTheDocument();
  });

  it('supports interactive document reordering using up and down buttons', () => {
    render(<RankingMetricsExplorer />);

    // Move Doc D (index 1) up to index 0, turning [A, D, B, C, E] into [D, A, B, C, E]
    const moveUpButtons = screen.getAllByText('▲');
    fireEvent.click(moveUpButtons[1]); // Move second item (Doc D) up

    // Result matches Preset 2 behavior: MRR drops to 0.5000
    expect(screen.getByText('0.5000')).toBeInTheDocument();
  });

  it('handles cutoff k < R_total edge case correctly', () => {
    render(<RankingMetricsExplorer />);

    // Select cutoff k=1 where k=1 < R_total=3
    const k1Button = screen.getByRole('button', { name: 'k=1' });
    fireEvent.click(k1Button);

    // At k=1 for [A, D, B, C, E]:
    // Doc A is relevant (rank 1). Precision@1 = 1.0000. Recall@1 = 1/3 = 0.3333.
    // AP@1 = (1/1) / 3 = 1/3 = 0.3333.
    // Crucially, AP@1 divides by R_total=3, yielding 0.3333 (NOT 1.0 from dividing by min(1, 3)).
    expect(screen.getByText('Precision@1')).toBeInTheDocument();
    expect(screen.getByText('Recall@1')).toBeInTheDocument();
    expect(screen.getByText('AP@1 (MAP)')).toBeInTheDocument();
    const thirdValues = screen.getAllByText('0.3333');
    expect(thirdValues.length).toBeGreaterThanOrEqual(2); // Recall@1 and AP@1
  });
});
