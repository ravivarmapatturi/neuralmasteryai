import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import LoadAssignmentExplorer from './LoadAssignmentExplorer';
it('distinguishes equal connection counts from equal request counts', () => {
  render(<LoadAssignmentExplorer />);
  expect(screen.getByRole('img')).toHaveAttribute('aria-label','Backend A 101, backend B 2 requests per second');
  fireEvent.click(screen.getByRole('button',{name:'L7 requests'}));
  expect(screen.getByRole('img')).toHaveAttribute('aria-label','Backend A 52, backend B 51 requests per second');
});
