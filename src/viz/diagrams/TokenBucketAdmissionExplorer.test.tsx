import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import TokenBucketAdmissionExplorer from './TokenBucketAdmissionExplorer';
it('rejects excess burst requests and replenishes only elapsed permission', () => {
  render(<TokenBucketAdmissionExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('Accepted 5 · rejected 2 · tokens 0');
  fireEvent.click(screen.getByRole('button',{name:'Wait 0.5 seconds'}));
  expect(screen.getByRole('status')).toHaveTextContent('tokens 1');
  fireEvent.click(screen.getByRole('button',{name:'Next request'}));
  expect(screen.getByRole('status')).toHaveTextContent('Accepted 6 · rejected 2 · tokens 0');
});
