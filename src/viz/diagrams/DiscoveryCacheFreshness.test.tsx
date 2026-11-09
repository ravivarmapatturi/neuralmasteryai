import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { DiscoveryCacheFreshness } from './RemainingSystemDesignExperiments';
it('exposes the changed admission or placement boundary', () => { render(<DiscoveryCacheFreshness/>); fireEvent.click(screen.getByRole('button',{name:'Refresh at 30'})); expect(screen.getByRole('status')).toHaveTextContent('A is absent'); });
