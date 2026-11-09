import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import StorageOwnershipExplorer from './StorageOwnershipExplorer';
it('reveals the multi-copy update boundary independently of the storage label', () => {
  render(<StorageOwnershipExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('mixed current names');
  fireEvent.click(screen.getByRole('button',{name:'Referenced profile'}));
  expect(screen.getByRole('status')).toHaveTextContent('Both reads agree');
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('1 updates'));
  fireEvent.click(screen.getByRole('button',{name:'Duplicated name'}));
  fireEvent.click(screen.getByRole('button',{name:'All copies updated'}));
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('2 updates'));
});
