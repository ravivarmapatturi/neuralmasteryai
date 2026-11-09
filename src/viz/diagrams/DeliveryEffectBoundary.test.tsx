import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { DeliveryEffectBoundary } from './RemainingSystemDesignExperiments';
it('checks the effect scope', () => { render(<DeliveryEffectBoundary/>); fireEvent.click(screen.getByRole('button',{name:'Atomic identity and effect'})); expect(screen.getByRole('status')).toHaveTextContent('one effect'); });
