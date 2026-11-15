import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import LearningToRankDiagram from './LearningToRankDiagram';

describe('LearningToRankDiagram', () => {
  it('renders initial view with Pointwise MSE objective and inversion state', () => {
    render(<LearningToRankDiagram />);

    expect(
      screen.getByRole('group', {
        name: /Learning to Rank Objectives and Lambda Gradients Simulator/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Learning to Rank \(LTR\) Objectives & Lambda Gradients/i)
    ).toBeInTheDocument();

    // Initial state has Inversion (D2 > D1)
    expect(screen.getByText(/State: Inversion \(D2 > D1\)/i)).toBeInTheDocument();

    // Pointwise MSE is 1.1367
    expect(screen.getByText('1.1367')).toBeInTheDocument();
  });

  it('switches to Pairwise RankNet and shows logistic gradient on (D1 > D2)', () => {
    render(<LearningToRankDiagram />);

    const pairwiseBtn = screen.getByRole('button', { name: /Pairwise \(RankNet\)/i });
    fireEvent.click(pairwiseBtn);

    expect(
      screen.getByText(/Pairwise Objective: RankNet Logistic Cross-Entropy/i)
    ).toBeInTheDocument();
    // RankNet gradient on (D1, D2): -0.7109
    expect(screen.getByText(/RankNet Force λ = -0.7109/i)).toBeInTheDocument();
  });

  it('switches to LambdaRank and displays NDCG metric scaling', () => {
    render(<LearningToRankDiagram />);

    const lambdaRankBtn = screen.getByRole('button', {
      name: /LambdaRank \(Metric Gradients\)/i,
    });
    fireEvent.click(lambdaRankBtn);

    expect(
      screen.getByText(/Metric-Scaled Objective: LambdaRank NDCG-Weighted Forces/i)
    ).toBeInTheDocument();
    // Current NDCG is 0.8340
    expect(screen.getByText('0.8340')).toBeInTheDocument();
    // Scaled lambda is -0.1180
    expect(screen.getByText('LambdaRank λ = -0.1180')).toBeInTheDocument();
  });

  it('switches to LambdaMART and displays decision stump leaf values', () => {
    render(<LearningToRankDiagram />);

    const lambdaMartBtn = screen.getByRole('button', {
      name: /LambdaMART \(GBDT Ensembles\)/i,
    });
    fireEvent.click(lambdaMartBtn);

    expect(
      screen.getByText(/Tree Ensemble Objective: LambdaMART GBDT Split/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Decision Stump Split/i)).toBeInTheDocument();
  });

  it('toggles inversion resolution state', () => {
    render(<LearningToRankDiagram />);

    const toggleBtn = screen.getByRole('button', { name: /State: Inversion/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Resolved: D1 > D2 \(Ideal\)/i)).toBeInTheDocument();
  });
});
