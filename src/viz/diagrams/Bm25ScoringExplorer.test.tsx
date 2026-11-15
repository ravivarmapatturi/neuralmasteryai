import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import Bm25ScoringExplorer from './Bm25ScoringExplorer';

describe('Bm25ScoringExplorer', () => {
  it('renders default scores for toy corpus documents', () => {
    render(<Bm25ScoringExplorer />);

    expect(screen.getByRole('group', { name: /Interactive BM25 Parameter Explorer/i })).toBeInTheDocument();
    expect(screen.getByText(/BM25 Scoring: TF Saturation & Document Length Normalization/i)).toBeInTheDocument();
    // Default k1=1.5, b=0.75 computed scores
    expect(screen.getByText(/Score: 1.1829/i)).toBeInTheDocument(); // Doc 1
    expect(screen.getByText(/Score: 1.4079/i)).toBeInTheDocument(); // Doc 2
    expect(screen.getByText(/Score: 0.3567/i)).toBeInTheDocument(); // Doc 3
    expect(screen.getByText(/Score: 0.0000/i)).toBeInTheDocument(); // Doc 4
  });

  it('updates document scores when k1 parameter is changed', () => {
    render(<Bm25ScoringExplorer />);

    const sliders = screen.getAllByRole('slider');
    const k1Slider = sliders[0]; // first slider is k1

    // Change k1 from 1.5 to 1.2 (matches toy corpus table with k1=1.2, b=0.75)
    fireEvent.change(k1Slider, { target: { value: '1.2' } });

    // With k1=1.2, b=0.75:
    expect(screen.getByText(/Score: 1.1694/i)).toBeInTheDocument(); // Doc 1
    expect(screen.getByText(/Score: 1.3574/i)).toBeInTheDocument(); // Doc 2
  });

  it('updates document scores when b length-normalization parameter is changed', () => {
    render(<Bm25ScoringExplorer />);

    const sliders = screen.getAllByRole('slider');
    const bSlider = sliders[1]; // second slider is b

    // Change b from 0.75 to 0 (disabling length normalization)
    fireEvent.change(bSlider, { target: { value: '0' } });

    // When b=0, length penalty on Doc 2 is removed, so its score changes
    expect(screen.queryByText(/Score: 1.4079/i)).not.toBeInTheDocument();
  });

  it('allows clicking documents to inspect term breakdowns', () => {
    render(<Bm25ScoringExplorer />);

    // Click Doc 2
    const doc2Button = screen.getByRole('button', { name: /Doc 2 \(Verbose & Repeated\)/i });
    fireEvent.click(doc2Button);

    // Should inspect Doc 2
    expect(screen.getByText(/Worked Derivation for Doc 2 \(Verbose & Repeated\)/i)).toBeInTheDocument();
  });
});
