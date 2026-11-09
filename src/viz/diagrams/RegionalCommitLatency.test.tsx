import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { RegionalCommitLatency } from './RemainingSystemDesignExperiments';
it('preserves the user-visible reliability boundary', () => { render(<RegionalCommitLatency/>); fireEvent.click(screen.getByRole('button',{name:'Wait remote acknowledgement'})); expect(screen.getByRole('status')).toHaveTextContent('42 ms'); });
