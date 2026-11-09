import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import StatelessSessionExplorer from './StatelessSessionExplorer';
it('recovers a rerouted session only from its explicit authoritative owner', () => {
  render(<StatelessSessionExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('missing');
  fireEvent.click(screen.getByRole('button', {name:'Replica A'}));
  expect(screen.getByRole('status')).toHaveTextContent('survives');
  fireEvent.click(screen.getByRole('button', {name:'Restart A'}));
  expect(screen.getByRole('status')).toHaveTextContent('missing');
  fireEvent.click(screen.getByRole('button', {name:'Shared store'}));
  expect(screen.getByRole('status')).toHaveTextContent('survives');
});
