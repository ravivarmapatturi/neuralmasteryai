import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import * as F from './HealthcareFigures';

const figures = Object.entries(F).filter(([name]) => name.startsWith('Hc')) as [string, () => ReactElement][];

describe('healthcare figures', () => {
  it('has one figure per post', () => expect(figures).toHaveLength(18));
  it.each(figures)('%s renders an accessible diagram', (_name, Fig) => {
    render(<ThemeProvider><Fig /></ThemeProvider>);
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });
  it('splits a bill by the example plan in the post', () => {
    expect(F.memberShare(1000)).toMatchObject({ member: 1000, plan: 0 });
    expect(F.memberShare(4000)).toMatchObject({ ded: 1500, coins: 500, member: 2000, plan: 2000 });
    expect(F.memberShare(40000).member).toBe(5000);
  });
});
