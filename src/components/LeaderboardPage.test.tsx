import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import LeaderboardPage from './LeaderboardPage';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { GamificationProvider } from '../contexts/GamificationContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import * as leaderboardModule from '../lib/useLeaderboard';

const mockEntries: leaderboardModule.LeaderboardEntry[] = [
  { uid: 'u1', displayName: 'Ada Lovelace', points: 125000, allTimePoints: 125000 }, // Neural Legend
  { uid: 'u2', displayName: 'Geoffrey Hinton', points: 30000, allTimePoints: 30000 }, // Specialist
  { uid: 'u3', displayName: 'Yann LeCun', points: 8000, allTimePoints: 8000 }, // Practitioner
  { uid: 'u4', displayName: 'Yoshua Bengio', points: 400, allTimePoints: 400 }, // Apprentice
];

function renderLeaderboard() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <LeaderboardPage />
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(leaderboardModule, 'useLeaderboard').mockImplementation((tab: string) => {
      if (tab === 'weekly') {
        return {
          entries: [
            { uid: 'u2', displayName: 'Geoffrey Hinton', points: 1200, allTimePoints: 30000 },
            { uid: 'u1', displayName: 'Ada Lovelace', points: 900, allTimePoints: 125000 },
          ],
          loading: false,
        };
      }
      return {
        entries: mockEntries,
        loading: false,
      };
    });
  });

  it('renders title, timeframe toggle, and top-3 podium', () => {
    renderLeaderboard();
    expect(screen.getByRole('heading', { name: /AI Engineering Leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /All-Time/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /This Week/i })).toBeInTheDocument();

    // Top 3 Podium and Standings
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Geoffrey Hinton').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Yann LeCun').length).toBeGreaterThanOrEqual(1);

    // Medals
    expect(screen.getAllByText('🥇').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🥈').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🥉').length).toBeGreaterThanOrEqual(1);
  });

  it('switches between All-Time and Weekly timeframe dimensions', () => {
    renderLeaderboard();
    const weeklyTab = screen.getByRole('tab', { name: /This Week/i });
    fireEvent.click(weeklyTab);

    // In weekly view, Geoffrey Hinton has 1200 points
    expect(screen.getAllByText(/1200/).length).toBeGreaterThanOrEqual(1);
  });

  it('provides tier segmentation filtering', () => {
    renderLeaderboard();
    const tierSelect = screen.getByLabelText(/Filter Tier/i);
    expect(tierSelect).toBeInTheDocument();

    // Filter to Neural Legend
    fireEvent.change(tierSelect, { target: { value: 'neurallegend' } });

    // Ada Lovelace (Neural Legend) should be in standings
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    // Yoshua Bengio (Apprentice) should be filtered out from standings
    expect(screen.queryByText('Yoshua Bengio')).not.toBeInTheDocument();
  });

  it('displays tier badge and level for entries', () => {
    renderLeaderboard();
    // Check that rank tier labels appear
    expect(screen.getAllByText(/Neural Legend/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Specialist/i).length).toBeGreaterThanOrEqual(1);
  });
});
