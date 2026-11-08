import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import RequirementBoundaryExplorer from './RequirementBoundaryExplorer';
it('changes the objective decision when eligibility changes', () => {
  render(<RequirementBoundaryExplorer />);
  expect(screen.getByRole('status')).toHaveTextContent('9990/10000 = 99.900% · Meets');
  fireEvent.click(screen.getByRole('button', { name: 'Valid actions' }));
  expect(screen.getByRole('status')).toHaveTextContent('9490/9500 = 99.895% · Misses');
});
