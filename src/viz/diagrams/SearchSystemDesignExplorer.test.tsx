import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import SearchSystemDesignExplorer from './SearchSystemDesignExplorer';

describe('SearchSystemDesignExplorer', () => {
  it('renders default Multi-Stage Latency Budget view with funnel stages', () => {
    render(<SearchSystemDesignExplorer />);

    expect(
      screen.getByRole('group', { name: /Interactive Search & Recommendation System Design Explorer/i })
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/Search & Recommendation System Design/i).length
    ).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/1\. API Gateway & Auth/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Candidate Generation \(Parallel\)/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Heavy Ranking \(ML Scoring\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Within SLA/i)).toBeInTheDocument();
  });

  it('switches to Resilience Fallback Ladder tab and selects degradation levels', () => {
    render(<SearchSystemDesignExplorer />);

    const resilienceTab = screen.getByRole('button', { name: 'Resilience Fallback Ladder' });
    fireEvent.click(resilienceTab);

    expect(
      screen.getAllByText(/Level 1: Full High-Precision Pipeline/i).length
    ).toBeGreaterThanOrEqual(1);

    const lvl3Btn = screen.getByRole('button', { name: 'Level 3' });
    fireEvent.click(lvl3Btn);

    expect(
      screen.getAllByText(/Level 3: Cached Precomputed Recommendations/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Trigger Condition:/i)).toBeInTheDocument();
  });

  it('switches to Scale & Capacity Planner tab and updates node requirements', () => {
    render(<SearchSystemDesignExplorer />);

    const capacityTab = screen.getByRole('button', { name: 'Scale & Capacity Planner' });
    fireEvent.click(capacityTab);

    expect(screen.getByText(/Peak Query Load \(QPS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Compute Cores/i)).toBeInTheDocument();
    expect(screen.getByText(/Serving Nodes \(16-vCPU\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Vector & Catalog RAM/i)).toBeInTheDocument();
  });
});
