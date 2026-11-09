import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import PartitionDecisionExplorer from './PartitionDecisionExplorer';
it('keeps the missing information visible under both partition policies', () => {
  render(<PartitionDecisionExplorer />);
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('B returns 7'));
  fireEvent.click(screen.getByRole('button',{name:'Require linearizable read'}));
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('cannot complete'));
});
