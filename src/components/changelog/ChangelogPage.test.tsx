import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ChangelogPage from './ChangelogPage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthProvider } from '../../contexts/AuthContext';
import { GamificationProvider } from '../../contexts/GamificationContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import data from '../../data/changelog.generated.json';

describe('ChangelogPage', () => {
  it('lists dated entries from git history and a heatmap of commit days', () => {
    render(<ThemeProvider><MemoryRouter><AuthProvider><ProgressProvider><GamificationProvider><ChangelogPage /></GamificationProvider></ProgressProvider></AuthProvider></MemoryRouter></ThemeProvider>);
    expect(screen.getByRole('heading', { level: 1, name: 'Changelog' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /commits in the last 26 weeks/ })).toBeInTheDocument();
    expect(data.entries.length).toBeGreaterThan(0);
    expect(screen.getByText(data.entries[0].text)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
  });
});
