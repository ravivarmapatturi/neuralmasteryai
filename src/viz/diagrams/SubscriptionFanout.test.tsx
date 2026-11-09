import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { SubscriptionFanout } from './RemainingSystemDesignExperiments';
it('checks the effect scope', () => { render(<SubscriptionFanout/>); fireEvent.click(screen.getByRole('button',{name:'Independent subscriptions'})); expect(screen.getByRole('status')).toHaveTextContent('all four events'); });
