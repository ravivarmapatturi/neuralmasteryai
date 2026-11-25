import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { FocusMusicProvider } from '../contexts/FocusMusicContext';
import { GamificationProvider } from '../contexts/GamificationContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import PlaygroundToolPage from './PlaygroundToolPage';

function renderToolRoute(initialPath: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <FocusMusicProvider>
                <Routes>
                  <Route path="/playground/:slug" element={<PlaygroundToolPage />} />
                </Routes>
              </FocusMusicProvider>
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('PlaygroundToolPage workbench', () => {
  it('mounts the registered interactive component, 3 try-this checks, and Learn link', async () => {
    renderToolRoute('/playground/bayes-update');

    expect(screen.getByRole('heading', { level: 1, name: 'Bayes Belief Updater' })).toBeInTheDocument();

    const learnLinks = screen.getAllByRole('link', { name: /Probability & Statistics for AI/i });
    expect(learnLinks.length).toBeGreaterThanOrEqual(1);
    expect(learnLinks[0]).toHaveAttribute('href', '/docs/mathematics-for-ai/probability-statistics');

    const tryItems = document.querySelectorAll('.playground-tool__try-item');
    expect(tryItems.length).toBe(3);

    await waitFor(
      () => {
        expect(screen.getByText(/prior belief/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('renders NotFoundPage when the slug does not exist', () => {
    renderToolRoute('/playground/nonexistent-workbench');
    expect(screen.getByRole('heading', { level: 1, name: "This page doesn't exist" })).toBeInTheDocument();
  });
});
