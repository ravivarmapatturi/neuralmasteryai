import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ErrorBudgetExplorer from './ErrorBudgetExplorer';
afterEach(cleanup);
it('converts observed failures to budget exhaustion and handles zero', () => {
  render(<ErrorBudgetExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('36.0 hours');
  fireEvent.change(screen.getByRole('slider'), {target:{value:'0'}});
  expect(screen.getByRole('status')).toHaveTextContent('No budget is consumed');
});
