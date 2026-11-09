import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { StreamReplayWindow } from './RemainingSystemDesignExperiments';
it('makes the failure boundary observable', () => { render(<StreamReplayWindow/>); fireEvent.click(screen.getByRole('button',{name:'Retain from 40'})); expect(screen.getByRole('status')).toHaveTextContent('four missing events'); });
