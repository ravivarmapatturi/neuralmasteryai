import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import ScalingBottleneckExplorer from './ScalingBottleneckExplorer';
it('keeps the shared-store ceiling when application capacity doubles', () => {
  render(<ScalingBottleneckExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('3,000 requests/s ceiling');
  fireEvent.click(screen.getByRole('button', { name: '2,000 requests/s' }));
  expect(screen.getByRole('status')).toHaveTextContent('3,000 requests/s ceiling');
  fireEvent.change(screen.getByRole('slider'), {target:{value:'1'}});
  expect(screen.getByRole('status')).toHaveTextContent('2,000 requests/s ceiling · Application limits');
});
