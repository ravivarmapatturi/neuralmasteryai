import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VizVisibleContext } from '../primitives';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

function PlaybackState() {
  const playback = usePlaygroundPlayback(3, 100);
  return <div>{playback.step}</div>;
}

function Harness({ visible }: { visible: boolean }) {
  return (
    <VizVisibleContext.Provider value={visible}>
      <PlaybackState />
    </VizVisibleContext.Provider>
  );
}

describe('usePlaygroundPlayback', () => {
  afterEach(() => vi.useRealTimers());

  it('autoplays and loops while visible, then pauses its timer off screen', () => {
    vi.useFakeTimers();
    const view = render(<Harness visible />);

    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('1')).toBeInTheDocument();

    view.rerender(<Harness visible={false} />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('1')).toBeInTheDocument();

    view.rerender(<Harness visible />);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('2')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
