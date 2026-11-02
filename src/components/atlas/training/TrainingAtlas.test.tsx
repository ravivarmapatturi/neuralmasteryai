import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import TrainingAtlas from './TrainingAtlas';

describe('TrainingAtlas', () => {
  it('renders chronological foundations and expands an entry', () => {
    render(<ThemeProvider><TrainingAtlas /></ThemeProvider>);
    expect(screen.getByRole('heading', { name: 'Foundations' })).toBeInTheDocument();
    expect(screen.getByText('Stochastic gradient descent')).toBeInTheDocument();
    expect(screen.getByText('AdamW')).toBeInTheDocument();
  });
});
