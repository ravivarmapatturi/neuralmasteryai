import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { SagaReservationRecovery } from './RemainingSystemDesignExperiments';
it('preserves the stated coordination boundary', () => { render(<SagaReservationRecovery/>); fireEvent.click(screen.getByRole('button',{name:'Release committed'})); expect(screen.getByRole('status')).toHaveTextContent('returns to 100'); });
