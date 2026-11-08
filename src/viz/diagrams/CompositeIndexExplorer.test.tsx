import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import CompositeIndexExplorer from './CompositeIndexExplorer';
it('keeps the same result while changing the modeled scan work', () => {
  render(<CompositeIndexExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('Scan 6 entries');
  fireEvent.click(screen.getByRole('button',{name:'Customer, newest time'}));
  expect(screen.getByRole('status')).toHaveTextContent('read 2 entries');
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('customer 2 times 3 and 2'));
});
