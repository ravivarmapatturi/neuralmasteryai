import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navbar from './Navbar';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthProvider } from '../../contexts/AuthContext';
import { GamificationProvider } from '../../contexts/GamificationContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { FocusMusicProvider } from '../../contexts/FocusMusicContext';

describe('Navbar menu', () => {
  it('groups every destination under Products and Resources', () => {
    render(<ThemeProvider><MemoryRouter><AuthProvider><ProgressProvider><GamificationProvider><FocusMusicProvider><Navbar /></FocusMusicProvider></GamificationProvider></ProgressProvider></AuthProvider></MemoryRouter></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const products = screen.getByRole('region', { name: 'Products' });
    const resources = screen.getByRole('region', { name: 'Resources' });
    for (const name of ['Learn', 'Labs', 'Interview', 'Study plans', 'Research', 'Projects', 'Atlas']) expect(within(products).getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    for (const name of ['Blog', 'Glossary', 'Leaderboard', 'Progress', 'Changelog', 'About', 'Credits']) expect(within(resources).getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
  });
});
