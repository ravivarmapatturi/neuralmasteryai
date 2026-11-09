import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { KafkaOffsetBoundary } from './RemainingSystemDesignExperiments';
it('makes the failure boundary observable', () => { render(<KafkaOffsetBoundary/>); fireEvent.click(screen.getByRole('button',{name:'Offset before effect'})); expect(screen.getByRole('status')).toHaveTextContent('lose effect 11'); });
