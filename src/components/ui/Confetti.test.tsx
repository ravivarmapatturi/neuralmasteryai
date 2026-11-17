import { render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfettiCanvas, showUnderstoodCoin } from './Confetti';

describe('understood coin celebration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a +10 coin instead of a reward toast or confetti', () => {
    render(<><ConfettiCanvas /><div id="nm-xp-streak-counter" /></>);
    act(() => showUnderstoodCoin());
    expect(screen.getByTestId('understood-coin')).toHaveTextContent('+10');
    expect(screen.queryByText('Page Understood!')).not.toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('understood-coin')).toHaveAttribute('aria-label', '10 experience points earned');
  });
});
