import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import RankingMetricsExplorer from './RankingMetricsExplorer';

describe('RankingMetricsExplorer', () => {
  it('shows the beginner explanation, live controls, and hand-checked NDCG', () => {
    render(<RankingMetricsExplorer />);
    expect(screen.getByLabelText(/Interactive Ranking Evaluation Metrics Calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/Measure whether useful results appear early enough/i)).toBeInTheDocument();
    expect(screen.getByText('Current value = 0.9049.')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByLabelText('Relevance grade for A')).toHaveValue(3);
  });

  it('demotes A and keeps Precision@3 fixed while NDCG falls', () => {
    render(<RankingMetricsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /Preset 2: \[D, A, B, C, E\]/i }));
    expect(screen.getByText('Current value = 0.6299.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Precision@k' }));
    expect(screen.getByText('Current value = 0.6667.')).toBeInTheDocument();
  });

  it('reaches NDCG 1 for the ideal grade order', () => {
    render(<RankingMetricsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /Ideal: \[A, B, C, D, E\]/i }));
    expect(screen.getByText('Current value = 1.0000.')).toBeInTheDocument();
  });

  it('recomputes from reordering and free grade input', () => {
    render(<RankingMetricsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: 'Move D up' }));
    expect(screen.getByText('Current value = 0.6299.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Relevance grade for D' }), { target: { value: '3' } });
    expect(screen.getByRole('spinbutton', { name: 'Relevance grade for D' })).toHaveValue(3);
    expect(screen.queryByText('Current value = 0.6299.')).not.toBeInTheDocument();
  });

  it('uses total relevant in AP@1 rather than the cutoff', () => {
    render(<RankingMetricsExplorer />);
    fireEvent.click(screen.getByRole('button', { name: 'First 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Average precision@k' }));
    expect(screen.getByText('Current value = 0.3333.')).toBeInTheDocument();
  });
});
