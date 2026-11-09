import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import CdnOriginLoadExplorer from './CdnOriginLoadExplorer';
it('exposes a tenfold origin increase without more client traffic', () => {
  render(<CdnOriginLoadExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('300 requests/s');
  fireEvent.change(screen.getByRole('slider'),{target:{value:'50'}});
  expect(screen.getByRole('status')).toHaveTextContent('3,000 requests/s');
  fireEvent.change(screen.getByRole('slider'),{target:{value:'0'}});
  expect(screen.getByRole('status')).toHaveTextContent('6,000 requests/s');
});
