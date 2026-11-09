import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { GrpcDeadlineBudget } from './RemainingSystemDesignExperiments';
it('exposes the protected outcome', () => { render(<GrpcDeadlineBudget/>); fireEvent.click(screen.getByRole('button',{name:'Remaining deadline'})); expect(screen.getByRole('status')).toHaveTextContent('120 ms remains'); });
