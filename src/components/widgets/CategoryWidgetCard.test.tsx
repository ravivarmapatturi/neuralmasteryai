import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CategoryWidgetCard } from './CategoryWidgetCard';
import { CategoryVisual } from './CategoryVisual';
import { ThemeProvider } from '../../theme/ThemeProvider';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('CategoryWidgetCard', () => {
  it('renders card title, summary, level and count', () => {
    renderWithProviders(
      <CategoryWidgetCard
        title="Build a Transformer from Scratch"
        to="/study-plans/transformer-from-scratch"
        summary="Go from text to next-token predictions."
        level="Intermediate"
        countText="12 problems · 2 readings"
        totalCount={12}
        passedCount={0}
        topic="transformer-from-scratch"
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Build a Transformer from Scratch' })).toBeInTheDocument();
    expect(screen.getByText('Go from text to next-token predictions.')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('12 problems · 2 readings')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders real progress bar and passed badge when passedCount > 0', () => {
    renderWithProviders(
      <CategoryWidgetCard
        title="RAG from Scratch"
        to="/study-plans/rag-from-scratch"
        summary="Build retrieval-augmented generation piece by piece."
        level="Intermediate"
        countText="14 problems · 2 readings · 4 passed"
        totalCount={14}
        passedCount={4}
        topic="rag-from-scratch"
      />
    );

    expect(screen.getByText('✓ 4 passed')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('aria-valuenow', '29');
  });

  it('renders specific visuals for different topic keys', () => {
    const topics = [
      'micrograd-from-scratch',
      'transformer-from-scratch',
      'rag-from-scratch',
      'agents-from-scratch',
      'numpy-sheet',
      'optimizers',
      'loss-functions',
      'evaluation-metrics',
    ];

    for (const topic of topics) {
      const { container } = renderWithProviders(<CategoryVisual topic={topic} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 56 40');
    }
  });
});
