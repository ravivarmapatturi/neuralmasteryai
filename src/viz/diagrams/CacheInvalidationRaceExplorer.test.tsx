import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import CacheInvalidationRaceExplorer from './CacheInvalidationRaceExplorer';
it('rejects a delayed old fill only when the invalidation floor survives', () => {
  render(<CacheInvalidationRaceExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('stale version 7');
  fireEvent.click(screen.getByRole('button',{name:'Retain version fence'}));
  expect(screen.getByRole('status')).toHaveTextContent('current fetch is still required');
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('rejects delayed version 7'));
});
