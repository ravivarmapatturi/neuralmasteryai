import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import SemanticHybridSearchDiagram from './SemanticHybridSearchDiagram';

describe('SemanticHybridSearchDiagram', () => {
  it('renders initial view with Equal weights and k=60 where D2 is rank #1', () => {
    render(<SemanticHybridSearchDiagram />);

    expect(
      screen.getByRole('group', { name: /Reciprocal Rank Fusion Hybrid Search Explorer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Reciprocal Rank Fusion \(RRF\) Interactive Simulator/i)
    ).toBeInTheDocument();

    // With Equal weights (1.0 : 1.0) and k=60:
    // D2 total score is ~0.03252
    expect(screen.getByText('0.03252')).toBeInTheDocument();
    // D1 total score is ~0.03227
    expect(screen.getByText('0.03227')).toBeInTheDocument();

    // Check top fused item shows #1 D2
    expect(screen.getByText('#1 D2')).toBeInTheDocument();
    expect(screen.getByText('#2 D1')).toBeInTheDocument();
  });

  it('flips top document to D1 when switching to Lexical Biased preset', () => {
    render(<SemanticHybridSearchDiagram />);

    const lexicalBtn = screen.getByRole('button', { name: /Lexical Biased \(2\.0 : 0\.5\)/i });
    fireEvent.click(lexicalBtn);

    // D1 jumps to rank #1 with score ~0.04072
    expect(screen.getByText('#1 D1')).toBeInTheDocument();
    expect(screen.getByText('#2 D2')).toBeInTheDocument();
    expect(screen.getByText('0.04072')).toBeInTheDocument();
    expect(screen.getByText('0.04045')).toBeInTheDocument();
  });

  it('updates scores when switching damping constant k to 20', () => {
    render(<SemanticHybridSearchDiagram />);

    const k20Btn = screen.getByRole('button', { name: /k = 20 \(Responsive\)/i });
    fireEvent.click(k20Btn);

    // With k=20, scores increase significantly
    // D2: 1/(20+2) + 1/(20+1) = 1/22 + 1/21 = 0.04545 + 0.04762 = 0.09307
    expect(screen.getByText('0.09307')).toBeInTheDocument();
  });
});
