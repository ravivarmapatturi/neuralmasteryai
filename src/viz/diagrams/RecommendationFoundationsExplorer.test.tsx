import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import RecommendationFoundationsExplorer from './RecommendationFoundationsExplorer';

describe('RecommendationFoundationsExplorer', () => {
  it('renders initial state with Alice selected and User-User k-NN mode', () => {
    render(<RecommendationFoundationsExplorer />);

    expect(
      screen.getByRole('group', { name: /Candidate Generation & Collaborative Filtering Explorer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore Interaction Matrices & Nearest-Neighbor Retrieval/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/User-User Cosine Neighborhood for Alice/i)).toBeInTheDocument();
  });

  it('switches active user to Bob on button click', () => {
    render(<RecommendationFoundationsExplorer />);

    const bobBtn = screen.getByRole('button', { name: 'Bob' });
    fireEvent.click(bobBtn);

    expect(screen.getByText(/User-User Cosine Neighborhood for Bob/i)).toBeInTheDocument();
  });

  it('switches to Item-Item k-NN mode', () => {
    render(<RecommendationFoundationsExplorer />);

    const itemModeBtn = screen.getByRole('button', { name: 'Item-Item k-NN' });
    fireEvent.click(itemModeBtn);

    expect(screen.getByText(/Item-Item Similarity for Target/i)).toBeInTheDocument();
  });

  it('switches to Implicit Exposure mode and shows confidence indicators', () => {
    render(<RecommendationFoundationsExplorer />);

    const implicitBtn = screen.getByRole('button', { name: 'Implicit Exposure' });
    fireEvent.click(implicitBtn);

    expect(screen.getByText(/Missing-Not-At-Random \(MNAR\) Exposure Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Matrix C_ui/i)).toBeInTheDocument();
  });
});
