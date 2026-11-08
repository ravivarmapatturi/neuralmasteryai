import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ShardHotKeyExplorer from './ShardHotKeyExplorer';
it('keeps the indivisible hot-key load despite extra shard owners', () => {
  render(<ShardHotKeyExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('6,300 operations/s');
  fireEvent.change(screen.getByRole('slider'),{target:{value:'6'}});
  expect(screen.getByRole('status')).toHaveTextContent('6,100 operations/s; total remains 7,100');
});
