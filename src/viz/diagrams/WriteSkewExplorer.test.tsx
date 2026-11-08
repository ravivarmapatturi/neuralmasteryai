import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import WriteSkewExplorer from './WriteSkewExplorer';
it('distinguishes atomic disjoint updates from an invariant-preserving history', () => {
  render(<WriteSkewExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('invariant fails');
  fireEvent.click(screen.getByRole('button',{name:'Serial decision order'}));
  expect(screen.getByRole('status')).toHaveTextContent('one clinician remains');
});
