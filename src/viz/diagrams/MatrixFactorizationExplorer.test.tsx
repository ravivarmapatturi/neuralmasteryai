import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import MatrixFactorizationExplorer from './MatrixFactorizationExplorer';

describe('MatrixFactorizationExplorer', () => {
  it('renders default reconstruction view with predicted ratings and observed MSE', () => {
    render(<MatrixFactorizationExplorer />);

    expect(
      screen.getByRole('group', { name: /Matrix Factorization & Latent Factor Explorer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore Matrix Factorization, ALS & Rotational Invariance/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Predicted Matrix R̂ = U · Vᵀ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Observed MSE:/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Rotational Invariance Verification:/i)).toBeInTheDocument();
  });

  it('switches to Latent Factors tab', () => {
    render(<MatrixFactorizationExplorer />);

    const factorsTab = screen.getByRole('button', { name: /Latent Factors U & V/i });
    fireEvent.click(factorsTab);

    expect(screen.getByText(/User Factor Matrix U \(4 × 2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Item Factor Matrix V \(4 × 2\)/i)).toBeInTheDocument();
  });

  it('switches to Observed Residuals tab', () => {
    render(<MatrixFactorizationExplorer />);

    const residualsTab = screen.getByRole('button', { name: /Observed Residuals/i });
    fireEvent.click(residualsTab);

    expect(screen.getByText(/Observed Rating Residuals \(r_ui - r̂_ui\)/i)).toBeInTheDocument();
  });
});
