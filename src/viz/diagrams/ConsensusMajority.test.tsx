import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { ConsensusMajority } from './RemainingSystemDesignExperiments';
it('preserves the stated coordination boundary', () => { render(<ConsensusMajority/>); fireEvent.click(screen.getByRole('button',{name:'Three-voter side'})); expect(screen.getByRole('status')).toHaveTextContent('majority exists'); });
