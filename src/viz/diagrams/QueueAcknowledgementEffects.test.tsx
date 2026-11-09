import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { QueueAcknowledgementEffects } from './RemainingSystemDesignExperiments';
it('makes the failure boundary observable', () => { render(<QueueAcknowledgementEffects/>); fireEvent.click(screen.getByRole('button',{name:'Atomic effect guard'})); expect(screen.getByRole('status')).toHaveTextContent('one committed effect'); });
