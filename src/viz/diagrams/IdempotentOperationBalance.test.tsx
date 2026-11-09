import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { IdempotentOperationBalance } from './RemainingSystemDesignExperiments';
it('checks the effect scope', () => { render(<IdempotentOperationBalance/>); fireEvent.click(screen.getByRole('button',{name:'Atomic operation identity'})); expect(screen.getByRole('status')).toHaveTextContent('balance remains 90'); });
