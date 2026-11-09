import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ConsistencyHistoryExplorer from './ConsistencyHistoryExplorer';
it('distinguishes session properties and cross-client real-time order', () => {
  render(<ConsistencyHistoryExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('violates');
  fireEvent.click(screen.getByRole('button',{name:'Read your writes'}));
  expect(screen.getByRole('status')).toHaveTextContent('Not ruled out');
  fireEvent.click(screen.getByRole('button',{name:'Own write'}));
  expect(screen.getByRole('status')).toHaveTextContent('violates');
  fireEvent.click(screen.getByRole('button',{name:'Other client'}));
  expect(screen.getByRole('status')).toHaveTextContent('Not ruled out');
  fireEvent.click(screen.getByRole('button',{name:'Linearizable'}));
  expect(screen.getByRole('status')).toHaveTextContent('violates');
});
