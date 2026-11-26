import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../theme/vizTokens')>('../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import DecisionBoundaryPlayground from './DecisionBoundaryPlayground';
import LinearRegressionStudio from './LinearRegressionStudio';
import LogisticRegressionStudio from './LogisticRegressionStudio';
import TwoPointersSlidingWindowExplorer from './TwoPointersSlidingWindowExplorer';
import RankingMetricsExplorer from './diagrams/RankingMetricsExplorer';

afterEach(cleanup);

describe('C17 real playground embeds', () => {
  it('renders the two-pointers tool with free inputs and transport controls', () => {
    render(<TwoPointersSlidingWindowExplorer />);
    expect(screen.getByLabelText('Two pointers and sliding window playground')).toBeInTheDocument();
    expect(screen.getByLabelText('Sorted numbers')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('preserves DecisionBoundaryPlayground defaultMode and editable query inputs', () => {
    render(<DecisionBoundaryPlayground defaultMode="tree" />);
    expect(screen.getByLabelText('Decision boundary playground')).toBeInTheDocument();
    expect(screen.getByLabelText('Query x coordinate')).toBeInTheDocument();
    expect(screen.getByLabelText('Tree: choose purer groups')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the ranking metrics tool at its existing default export', () => {
    render(<RankingMetricsExplorer />);
    expect(screen.getByLabelText('Interactive Ranking Evaluation Metrics Calculator')).toBeInTheDocument();
    expect(screen.getByLabelText('Known relevant results')).toHaveValue(3);
  });

  it('renders both regression studios with real training controls', () => {
    render(<LinearRegressionStudio />);
    expect(screen.getByLabelText('Linear regression studio')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting slope')).toHaveValue(0);
    cleanup();
    render(<LogisticRegressionStudio />);
    expect(screen.getByLabelText('Logistic regression studio')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting logistic slope')).toHaveValue(-1.5);
  });

  it('supports compact mode without the full control surface', () => {
    render(<LinearRegressionStudio compact />);
    expect(screen.getByLabelText('Linear regression studio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Starting slope')).not.toBeInTheDocument();
    expect(screen.getByText('Prediction line')).toBeInTheDocument();
  });
});
