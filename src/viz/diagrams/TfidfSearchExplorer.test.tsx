import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import TfidfSearchExplorer from './TfidfSearchExplorer';

describe('TfidfSearchExplorer', () => {
  it('renders default query "machine learning" with D1 and D3 tied at 0.1438 and D2 at 0.1233', () => {
    render(<TfidfSearchExplorer />);

    expect(screen.getByRole('group', { name: /Interactive TF-IDF Search Engine/i })).toBeInTheDocument();
    expect(screen.getByText(/Explore TF-IDF Term Weighting & Document Ranking/i)).toBeInTheDocument();

    // Query terms IDF in Step A
    expect(screen.getByText(/Step A: Per-Term Inverse Document Frequency/i)).toBeInTheDocument();
    // '0.2877' in IDF column
    const idfElements = screen.getAllByText('0.2877');
    expect(idfElements.length).toBeGreaterThanOrEqual(2);

    // Document scores in Step B
    // Specified result: D1 = D3 = 0.1438 and D2 = 0.1233
    expect(screen.getAllByText(/Score: 0.1438/i)).toHaveLength(2);
    expect(screen.getByText(/Score: 0.1233/i)).toBeInTheDocument();
    expect(screen.getByText(/Score: 0.0000/i)).toBeInTheDocument();

    // Tie indicator badge
    expect(screen.getByText(/Exact Mathematical Tie at Rank #1/i)).toBeInTheDocument();
  });

  it('updates rankings when switching to query "deep learning"', () => {
    render(<TfidfSearchExplorer />);

    const deepLearningBtn = screen.getByRole('button', { name: /“deep learning”/i });
    fireEvent.click(deepLearningBtn);

    // Under "deep learning", D2 is the top ranked document because "deep" is a rare term (IDF ln(4))
    // Score of D2: approx 0.2802
    expect(screen.getByText(/Score: 0.2802/i)).toBeInTheDocument();
  });

  it('updates rankings when switching to query "cooking food"', () => {
    render(<TfidfSearchExplorer />);

    const cookingBtn = screen.getByRole('button', { name: /“cooking food”/i });
    fireEvent.click(cookingBtn);

    // Under "cooking food", D4 scores highest
    // Score = 0.5 * ln(4) approx 0.6931
    expect(screen.getByText(/Score: 0.6931/i)).toBeInTheDocument();
  });
});
