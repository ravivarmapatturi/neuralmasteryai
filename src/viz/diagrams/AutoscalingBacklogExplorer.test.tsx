import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import AutoscalingBacklogExplorer from './AutoscalingBacklogExplorer';
it('accounts for the queue created before useful capacity arrives', () => {
  render(<AutoscalingBacklogExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('backlog 180,000 · drain 90s · recovered at 180s');
  fireEvent.change(screen.getByRole('slider'),{target:{value:'30'}});
  expect(screen.getByRole('status')).toHaveTextContent('backlog 60,000 · drain 30s · recovered at 60s');
});
