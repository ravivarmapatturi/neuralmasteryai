import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { ResourceAuthorization } from './RemainingSystemDesignExperiments';
it('preserves the user-visible reliability boundary', () => { render(<ResourceAuthorization/>); fireEvent.click(screen.getByRole('button',{name:'Enforce resource ownership'})); expect(screen.getByRole('status')).toHaveTextContent('Bob denied'); });
