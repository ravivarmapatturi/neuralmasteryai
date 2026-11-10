// Highlights the word being read aloud. The clips carry no word timings, so the position is
// estimated from playback progress, weighting each word by its length plus a pause after punctuation.
import { useEffect, useMemo, useState } from 'react';

const PAUSE = { ',': 4, ';': 5, ':': 5, '.': 8, '?': 8, '!': 8 } as Record<string, number>;

export function wordEnds(text: string): { words: string[]; ends: number[] } {
  const words = text.split(/(\s+)/);
  let total = 0;
  const weights = words.map(w => (/^\s+$/.test(w) || !w ? 0 : w.length + 2 + (PAUSE[w.at(-1) ?? ''] ?? 0)));
  const ends = weights.map(x => (total += x));
  return { words, ends: ends.map(e => e / (total || 1)) };
}

/** Index of the word playing at `fraction` of the clip. */
export function wordAt(ends: number[], fraction: number) {
  const i = ends.findIndex(e => e > fraction);
  return i === -1 ? ends.length - 1 : i;
}

export function SpokenText({ text, audio }: { text: string; audio: HTMLAudioElement | null }) {
  const { words, ends } = useMemo(() => wordEnds(text), [text]);
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    if (!audio) { setCurrent(-1); return; }
    let frame = 0;
    const tick = () => {
      if (audio.duration > 0 && !audio.paused) setCurrent(wordAt(ends, audio.currentTime / audio.duration));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); setCurrent(-1); };
  }, [audio, ends]);
  if (current < 0) return <>{text}</>;
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className={i === current ? 'si-word-now' : i < current ? 'si-word-read' : undefined}>{w}</span>
      ))}
    </>
  );
}
