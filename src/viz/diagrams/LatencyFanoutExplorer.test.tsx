import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import RequestLatencyBudget from './RequestLatencyBudget';
import LatencyFanoutExplorer from './LatencyFanoutExplorer';
afterEach(cleanup);
it('exposes the probability cost of requiring many independent calls', () => {
  render(<LatencyFanoutExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('63.4%');
  fireEvent.change(screen.getByRole('slider'), {target:{value:'1'}});
  expect(screen.getByRole('status')).toHaveTextContent('1.0%');
});

it('consumes margin before exceeding the request deadline', () => {
  render(<RequestLatencyBudget />);
  expect(screen.getByRole('status')).toHaveTextContent('40 ms remains');
  fireEvent.change(screen.getByRole('slider'), {target:{value:'160'}});
  expect(screen.getByRole('status')).toHaveTextContent('exceeded by 40 ms');
});
