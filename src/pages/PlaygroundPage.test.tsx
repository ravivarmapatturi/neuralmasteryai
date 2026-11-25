import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { FocusMusicProvider } from '../contexts/FocusMusicContext';
import { GamificationProvider } from '../contexts/GamificationContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import {
  COMING_SOON_TOOLS,
  PLAYGROUND_TOOLS,
  resolvePlaygroundComponent,
} from '../data/playgroundCatalog';
import { ThemeProvider } from '../theme/ThemeProvider';
import PlaygroundPage from './PlaygroundPage';

function renderPlayground() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/playground']}>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <FocusMusicProvider>
                <PlaygroundPage />
              </FocusMusicProvider>
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('PlaygroundPage hub', () => {
  it('renders every hub card link with a slug that resolves to a component', () => {
    renderPlayground();

    expect(screen.getByRole('heading', { level: 1, name: 'Interactive Playground' })).toBeInTheDocument();

    const cardLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a.playground__entry-link'));
    expect(cardLinks.length).toBe(PLAYGROUND_TOOLS.length);

    for (const link of cardLinks) {
      const href = link.getAttribute('href') || '';
      expect(href.startsWith('/playground/')).toBe(true);
      const slug = href.replace('/playground/', '');
      expect(resolvePlaygroundComponent(slug), `Unresolved hub slug: ${slug}`).toBeTypeOf('function');
    }
  });

  it('lists NEW tools only as plain Coming soon cards with no clickable links or buttons', () => {
    renderPlayground();

    const soonCards = Array.from(document.querySelectorAll<HTMLLIElement>('.playground__entry--soon'));
    expect(soonCards.length).toBe(COMING_SOON_TOOLS.length);

    for (const card of soonCards) {
      expect(within(card).getByText('Coming soon')).toBeInTheDocument();
      expect(within(card).queryByRole('link')).toBeNull();
      expect(within(card).queryByRole('button')).toBeNull();
    }
  });

  it('filters cards by search text, track buttons, and section select', () => {
    renderPlayground();

    const search = screen.getByRole('searchbox', { name: /Search tools/i });
    fireEvent.change(search, { target: { value: 'Roofline' } });

    const filteredLinks = document.querySelectorAll('a.playground__entry-link');
    expect(filteredLinks.length).toBe(1);
    expect(filteredLinks[0]).toHaveTextContent('GPU Roofline Model Visualizer');

    fireEvent.change(search, { target: { value: '' } });

    const sectionSelect = screen.getByRole('combobox', { name: /Filter by section/i });
    fireEvent.change(sectionSelect, { target: { value: 'harness-engineering' } });

    const harnessLinks = document.querySelectorAll('a.playground__entry-link');
    expect(harnessLinks.length).toBe(4);
  });
});
