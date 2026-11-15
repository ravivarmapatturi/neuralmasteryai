import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import InvertedIndexVisualizer from './InvertedIndexVisualizer';

describe('InvertedIndexVisualizer', () => {
  it('renders default query "search AND ranking" with matched candidates D1 and D2', () => {
    render(<InvertedIndexVisualizer />);

    expect(screen.getByRole('group', { name: /Interactive Inverted Index & Boolean Retrieval/i })).toBeInTheDocument();
    expect(screen.getByText(/Inverted Postings & Boolean Query Evaluation/i)).toBeInTheDocument();

    // Default matches
    expect(screen.getByText('Candidate D1 (Matched)')).toBeInTheDocument();
    expect(screen.getByText('Candidate D2 (Matched)')).toBeInTheDocument();
    expect(screen.queryByText('Candidate D3 (Matched)')).not.toBeInTheDocument();
  });

  it('updates matching documents when query is switched to "ranking OR recommendation"', () => {
    render(<InvertedIndexVisualizer />);

    const unionBtn = screen.getByRole('button', { name: /ranking OR recommendation/i });
    fireEvent.click(unionBtn);

    expect(screen.getByText('Candidate D1 (Matched)')).toBeInTheDocument();
    expect(screen.getByText('Candidate D2 (Matched)')).toBeInTheDocument();
    expect(screen.getByText('Candidate D3 (Matched)')).toBeInTheDocument();
    expect(screen.getByText('Candidate D4 (Matched)')).toBeInTheDocument();
  });

  it('correctly handles negation query "search AND NOT neural"', () => {
    render(<InvertedIndexVisualizer />);

    const notBtn = screen.getByRole('button', { name: /search AND NOT neural/i });
    fireEvent.click(notBtn);

    expect(screen.getByText('Candidate D1 (Matched)')).toBeInTheDocument();
    expect(screen.queryByText('Candidate D2 (Matched)')).not.toBeInTheDocument();
    expect(screen.queryByText('Candidate D3 (Matched)')).not.toBeInTheDocument();
  });
});
