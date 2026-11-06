// Speaks text with Kokoro running on the user's device, for questions that have no recorded clip.
// Sentences play back to back as the worker produces them.

type Message =
  | { type: 'progress'; loaded?: number; total?: number }
  | { type: 'chunk'; id: number; samples: Float32Array<ArrayBuffer>; rate: number }
  | { type: 'done'; id: number }
  | { type: 'error'; id: number; message: string };

let worker: Worker | null = null;
let nextId = 0;

function getWorker() {
  if (!worker) worker = new Worker(new URL('../../workers/kokoroWorker.ts', import.meta.url), { type: 'module' });
  return worker;
}

/** Plays `text` aloud. Calls onDone when finished or when the voice cannot run. Returns a cancel function. */
export function speakInBrowser(
  text: string,
  onDone: () => void,
  onProgress?: (fraction: number) => void,
  onStart?: () => void,
): () => void {
  const id = ++nextId;
  const w = getWorker();
  const context = new AudioContext();
  let playAt = 0;
  let pending = 0;
  let generated = false;
  let finished = false;
  let started = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    w.removeEventListener('message', onMessage);
    void context.close().catch(() => undefined);
    onDone();
  };

  const onMessage = (e: MessageEvent<Message>) => {
    const m = e.data;
    if (m.type === 'progress') {
      if (m.total && !started) onProgress?.(Math.min(1, (m.loaded ?? 0) / m.total));
      return;
    }
    if (m.id !== id) return;
    if (m.type === 'error') {
      console.warn('[voice] on-device voice failed:', m.message);
      return finish();
    }
    if (m.type === 'done') {
      generated = true;
      if (pending === 0) finish();
      return;
    }
    const buffer = context.createBuffer(1, m.samples.length, m.rate);
    buffer.copyToChannel(m.samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    playAt = Math.max(playAt, context.currentTime + 0.05);
    if (!started) {
      started = true;
      onStart?.();
    }
    source.start(playAt);
    playAt += buffer.duration;
    pending += 1;
    source.onended = () => {
      pending -= 1;
      if (generated && pending === 0) finish();
    };
  };

  w.addEventListener('message', onMessage);
  w.postMessage({ id, text });
  return () => {
    w.postMessage({ id: ++nextId, cancel: true });
    finished = true;
    w.removeEventListener('message', onMessage);
    void context.close().catch(() => undefined);
  };
}
