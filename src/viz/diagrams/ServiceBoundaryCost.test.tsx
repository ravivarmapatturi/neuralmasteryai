import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { ServiceBoundaryCost } from './RemainingSystemDesignExperiments';
it('exposes the changed admission or placement boundary', () => { render(<ServiceBoundaryCost/>); fireEvent.click(screen.getByRole('button',{name:'Local modules'})); expect(screen.getByRole('status')).toHaveTextContent('60 ms local'); });
