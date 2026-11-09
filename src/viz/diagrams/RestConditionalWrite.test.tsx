import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { RestConditionalWrite } from './RemainingSystemDesignExperiments';
it('exposes the protected outcome', () => { render(<RestConditionalWrite/>); fireEvent.click(screen.getByRole('button',{name:'If-Match version 7'})); expect(screen.getByRole('status')).toHaveTextContent('412'); });
