import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import SiteTour from './SiteTour';

const Where = () => <output>{useLocation().pathname}</output>;
const show = (url = '/') => render(<MemoryRouter initialEntries={[url]}><Where /><SiteTour /></MemoryRouter>);

describe('SiteTour', () => {
  beforeEach(() => sessionStorage.clear());

  it('opens each page as the visitor presses Next and Back', () => {
    show();
    expect(screen.getByRole('heading', { name: /Welcome/ })).toBeInTheDocument();
    for (const [name, path] of [['Learn', '/learn'], ['Labs', '/labs'], ['Interview', '/interview'], ['Blog', '/blog'], ['Progress', '/progress']]) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(path);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('status')).toHaveTextContent('/blog');
  });

  it('does not interrupt a visitor landing on a lesson', () => {
    show('/docs/agents/overview');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    sessionStorage.setItem('nm-site-tour-seen', '1');
    show('/?tour=1');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
