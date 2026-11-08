import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import DesignDecisionExplorer from './DesignDecisionExplorer';
it('distinguishes eventual expiry from satisfying the revocation deadline', () => {
  render(<DesignDecisionExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('incorrect');
  fireEvent.click(screen.getByRole('button', { name: '300 seconds' }));
  expect(screen.getByRole('status')).toHaveTextContent('does not satisfy a shorter deadline');
  fireEvent.click(screen.getByRole('button', { name: '0 seconds' }));
  expect(screen.getByRole('status')).toHaveTextContent('does not clear remote caches');
});
