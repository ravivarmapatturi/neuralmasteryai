import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ProxyTrustExplorer from './ProxyTrustExplorer';
it('replaces the forged claim with an observed address at the ingress', () => {
  render(<ProxyTrustExplorer />);
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('198.51.100.7; forged'));
  fireEvent.click(screen.getByRole('button',{name:'Replace untrusted header'}));
  expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('203.0.113.9; observed'));
});
