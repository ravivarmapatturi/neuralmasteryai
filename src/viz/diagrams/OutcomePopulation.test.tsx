import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { OutcomePopulation } from './RemainingSystemDesignExperiments';
it('keeps the outcome population visible', () => { render(<OutcomePopulation/>); fireEvent.click(screen.getByRole('button',{name:'All eligible attempts'})); expect(screen.getByRole('status')).toHaveTextContent('98% success'); });
