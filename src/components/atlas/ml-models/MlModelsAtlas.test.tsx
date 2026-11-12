import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { mlModelsAtlas } from '../../../data/mlModelsAtlas';
import MlModelsAtlas from './MlModelsAtlas';

describe('mlModelsAtlas data integrity', () => {
  it('is strictly ordered chronologically', () => {
    for (let i = 1; i < mlModelsAtlas.length; i++) {
      expect(mlModelsAtlas[i].year).toBeGreaterThanOrEqual(mlModelsAtlas[i - 1].year);
    }
  });

  it('e-means is the last entry in 2026', () => {
    const last = mlModelsAtlas[mlModelsAtlas.length - 1];
    expect(last.id).toBe('e-means');
    expect(last.year).toBe(2026);
  });

  it('every entry has all 7 required sections with complete content', () => {
    expect(mlModelsAtlas).toHaveLength(24);
    for (const entry of mlModelsAtlas) {
      // 1. Problem solved
      expect(entry.problem.trim().length).toBeGreaterThan(30);
      // 2. What came before and what it fixed
      expect(entry.previousLimit.trim().length).toBeGreaterThan(30);
      // 3. The maths
      expect(entry.maths.objective.trim().length).toBeGreaterThan(5);
      expect(entry.maths.updateOrClosedForm.trim().length).toBeGreaterThan(5);
      expect(entry.maths.workedExample.trim().length).toBeGreaterThan(30);
      // 4. Visualisation
      expect(entry.diagram).toBeTruthy();
      // 5. Evaluation metrics
      expect(entry.evaluationMetrics.trim().length).toBeGreaterThan(20);
      // 6. Applications (2-3 real uses)
      expect(entry.applications.length).toBeGreaterThanOrEqual(2);
      for (const app of entry.applications) {
        expect(app.trim().length).toBeGreaterThan(15);
      }
      // 7. Primary source and Learn link
      expect(entry.source.label).toBeTruthy();
      expect(entry.source.url).toMatch(/^https:\/\//);
      expect(entry.learnPath).toMatch(/^\/docs\/machine-learning\//);
    }
  });

  it('every entry has a defined visual', () => {
    for (const entry of mlModelsAtlas) {
      expect(entry.diagram.trim()).toBeTruthy();
    }
  });
});

describe('MlModelsAtlas component', () => {
  it('renders all eras and models by default', () => {
    render(
      <ThemeProvider>
        <MlModelsAtlas />
      </ThemeProvider>
    );

    expect(screen.getByText('Linear Regression (Least Squares)')).toBeInTheDocument();
    expect(screen.getByText('e-means')).toBeInTheDocument();
    expect(screen.getByText('24 models')).toBeInTheDocument();
  });

  it('filters models by category', () => {
    render(
      <ThemeProvider>
        <MlModelsAtlas />
      </ThemeProvider>
    );

    const select = screen.getByLabelText('Category');
    fireEvent.change(select, { target: { value: 'clustering' } });

    // Clustering models must remain visible
    expect(screen.getByText('k-Means (Lloyd)')).toBeInTheDocument();
    expect(screen.getByText('e-means')).toBeInTheDocument();

    // Regression models must be filtered out
    expect(screen.queryByText('Linear Regression (Least Squares)')).not.toBeInTheDocument();
    expect(screen.queryByText('Ridge Regression (L2)')).not.toBeInTheDocument();
  });

  it('filters models by search query', () => {
    render(
      <ThemeProvider>
        <MlModelsAtlas />
      </ThemeProvider>
    );

    const searchInput = screen.getByLabelText('Search models');
    fireEvent.change(searchInput, { target: { value: 'exponential moving average' } });

    expect(screen.getByText('e-means')).toBeInTheDocument();
    expect(screen.queryByText('Linear Regression (Least Squares)')).not.toBeInTheDocument();
  });

  it('expands an entry and displays the 7 sections and visual', () => {
    render(
      <ThemeProvider>
        <MlModelsAtlas />
      </ThemeProvider>
    );

    const details = document.getElementById('linear-regression') as HTMLDetailsElement;
    expect(details).toBeInTheDocument();
    details.open = true;

    const scoped = within(details);
    expect(scoped.getByRole('heading', { name: '1. What problem it was built to solve' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '2. What came before and what it fixed' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '3. How it works — the maths' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '4. Visualisation' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '5. Evaluation metrics' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '6. Applications' })).toBeInTheDocument();
    expect(scoped.getByRole('heading', { name: '7. Primary source and Learn page' })).toBeInTheDocument();
  });
});
