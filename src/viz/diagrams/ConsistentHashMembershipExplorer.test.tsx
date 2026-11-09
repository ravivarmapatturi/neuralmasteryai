import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ConsistentHashMembershipExplorer from './ConsistentHashMembershipExplorer';
it('limits the illustrated join to the stolen predecessor interval', () => {
  render(<ConsistentHashMembershipExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('key 30, B → D');
  fireEvent.click(screen.getByRole('button',{name:'A, B, C'}));
  expect(screen.getByRole('status')).toHaveTextContent('A: 10,90 · B: 30,45 · C: 60');
});
