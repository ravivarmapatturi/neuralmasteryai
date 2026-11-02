import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import SiteTour from './SiteTour';

const show = (url = '/') => render(<MemoryRouter initialEntries={[url]}><SiteTour /></MemoryRouter>);

describe('SiteTour', () => {
  beforeEach(() => localStorage.clear());

  it('shows on a first visit and steps through to the end', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Labs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Labs/ })).toHaveAttribute('href', '/labs');
  });

  it('stays closed after being skipped', () => {
    const { unmount } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    show();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('replays from the footer link even after being seen', () => {
    localStorage.setItem('nm-site-tour-seen', '1');
    show('/?tour=1');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
