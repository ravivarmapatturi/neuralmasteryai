import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import DeepRecommendersArchitectureExplorer from './DeepRecommendersArchitectureExplorer';

describe('DeepRecommendersArchitectureExplorer', () => {
  it('renders default Two-Tower Retrieval architecture with ANN badge and score', () => {
    render(<DeepRecommendersArchitectureExplorer />);

    expect(
      screen.getByRole('group', { name: /Deep Recommender Architectures Explorer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compare Two-Tower, Wide & Deep, DLRM & Sequential Models/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Two-Tower Retrieval/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ANN Compatible/i)).toBeInTheDocument();
    expect(screen.getByText(/Retrieval Score:/i)).toBeInTheDocument();
  });

  it('switches to Wide & Deep architecture', () => {
    render(<DeepRecommendersArchitectureExplorer />);

    const wideBtn = screen.getByRole('button', { name: 'Wide & Deep' });
    fireEvent.click(wideBtn);

    expect(screen.getByText(/Ranking Stage Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary Paper: Cheng et al. Google \(2016\)/i)).toBeInTheDocument();
  });

  it('switches to DLRM architecture and displays pairwise dot products', () => {
    render(<DeepRecommendersArchitectureExplorer />);

    const dlrmBtn = screen.getByRole('button', { name: 'DLRM' });
    fireEvent.click(dlrmBtn);

    expect(screen.getByText(/Naumov et al. \(2019\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Interaction dimension:/i)).toBeInTheDocument();
  });

  it('switches to SASRec architecture and displays attention weights', () => {
    render(<DeepRecommendersArchitectureExplorer />);

    const sasrecBtn = screen.getByRole('button', { name: 'SASRec (Sequential)' });
    fireEvent.click(sasrecBtn);

    expect(screen.getAllByText(/Kang & McAuley \(2018\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Causal Attention Weights/i)).toBeInTheDocument();
  });
});
