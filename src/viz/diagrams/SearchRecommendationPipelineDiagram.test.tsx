import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import SearchRecommendationPipelineDiagram from './SearchRecommendationPipelineDiagram';

describe('SearchRecommendationPipelineDiagram', () => {
  it('renders initial search mode and default candidate stage', () => {
    render(<SearchRecommendationPipelineDiagram />);

    expect(screen.getByRole('group', { name: /The Unified Search & Recommendation Pipeline/i })).toBeInTheDocument();
    expect(screen.getByText(/Unified Funnel: From Millions of Items to a Ranked Top-10/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 1: Candidate Generation/i)).toBeInTheDocument();
    expect(screen.getByText(/Sparse BM25 & dense vector ANN match explicit query tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/Item H1 \(Noise-Cancelling Headphones\) retrieved in top 1,000 candidates/i)).toBeInTheDocument();
  });

  it('switches between search and recommendation modes', () => {
    render(<SearchRecommendationPipelineDiagram />);

    const recModeButton = screen.getByRole('button', { name: /Recommendation \(User Context: "Audio enthusiast"\)/i });
    fireEvent.click(recModeButton);

    expect(screen.getByText(/Two-tower embeddings & collaborative filtering match user history/i)).toBeInTheDocument();

    const searchModeButton = screen.getByRole('button', { name: /Search \(Explicit Query: "wireless headphones"\)/i });
    fireEvent.click(searchModeButton);

    expect(screen.getByText(/Sparse BM25 & dense vector ANN match explicit query tokens/i)).toBeInTheDocument();
  });

  it('navigates through pipeline stages and updates stage information', () => {
    render(<SearchRecommendationPipelineDiagram />);

    // Click on Stage 3 (Ranking / Scoring)
    const stage3Tab = screen.getByRole('tab', { name: /Ranking \/ Scoring/i });
    fireEvent.click(stage3Tab);

    expect(screen.getByText(/Stage 3: Ranking \/ Scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/GBDT \/ Neural Ranker predicts P\(click\) and relevance score/i)).toBeInTheDocument();
    expect(screen.getByText(/Item H1 scores 0.94; H3 scores 0.88/i)).toBeInTheDocument();

    // Click on Stage 4 (Re-Ranking & Rules)
    const stage4Tab = screen.getByRole('tab', { name: /Re-Ranking & Rules/i });
    fireEvent.click(stage4Tab);

    expect(screen.getByText(/Stage 4: Re-Ranking & Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/Enforce brand diversity, freshness boost, and sponsored disclosures/i)).toBeInTheDocument();
    expect(screen.getByText(/rank 2 allocated to E2 for brand diversity instead of H3/i)).toBeInTheDocument();
  });
});
