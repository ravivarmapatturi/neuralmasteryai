import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => { const a = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens'); return { ...a, useVizTokens: () => a.LIGHT }; });
import { GraphqlResolverWork } from './RemainingSystemDesignExperiments';
it('exposes the protected outcome', () => { render(<GraphqlResolverWork/>); fireEvent.click(screen.getByRole('button',{name:'Request-scoped batch'})); expect(screen.getByRole('status')).toHaveTextContent('two total backend calls'); });
