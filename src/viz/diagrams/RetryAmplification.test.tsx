import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { RetryAmplification } from './RemainingSystemDesignExperiments';
it('caps the nested attempt count with one retry owner',()=>{render(<RetryAmplification/>);fireEvent.click(screen.getByRole('button',{name:'One retry owner'}));expect(screen.getByRole('status')).toHaveTextContent('at most three attempts');});
