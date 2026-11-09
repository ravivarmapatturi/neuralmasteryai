import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleThreadASREngine } from './engines';

class FakeWorker extends EventTarget {
  static latest: FakeWorker;
  static deferInit = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  sent: any[] = [];
  terminate = vi.fn();
  constructor() { super(); FakeWorker.latest = this; }
  postMessage(message: any) {
    this.sent.push(message);
    if (message.op === 'init' && !FakeWorker.deferInit) queueMicrotask(() => this.reply({ id: message.id, type: 'init_done', device: 'wasm' }));
  }
  reply(data: any) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.(event);
    this.dispatchEvent(event);
  }
}
class FakeAudio {
  sampleRate = 16000;
  state = 'running';
  static latest: FakeAudio;
  processor = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null as ((event: any) => void) | null };
  constructor() { FakeAudio.latest = this; }
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);
  createMediaStreamSource() { return { connect: vi.fn() }; }
  createScriptProcessor() { return this.processor; }
  createGain() { return { gain: { value: 1 }, connect: vi.fn() }; }
  feed(amplitude: number, count = 1) {
    for (let i = 0; i < count; i++) this.processor.onaudioprocess?.({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(amplitude) } });
  }
}
beforeEach(() => { FakeWorker.deferInit = false; vi.stubGlobal('Worker', FakeWorker); vi.stubGlobal('AudioContext', FakeAudio); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('speech finalization and cancellation', () => {
  it('coalesces load calls, aggregates file progress, and cancels a pending load on destroy', async () => {
    FakeWorker.deferInit = true;
    const engine = new SingleThreadASREngine({ downloadBytes: 100 });
    const first = engine.load();
    const second = engine.load();
    const worker = FakeWorker.latest;
    expect(worker.sent.filter(m => m.op === 'init')).toHaveLength(1);
    worker.reply({type: 'progress', file: 'encoder', loaded: 50, total: 100});
    const before = engine.getMetrics().downloadProgressPct;
    worker.reply({type: 'progress', file: 'decoder', loaded: 10, total: 100});
    expect(engine.getMetrics().downloadProgressPct).toBeGreaterThanOrEqual(before);
    engine.destroy();
    await expect(first).rejects.toThrow('disposed');
    await expect(second).rejects.toThrow('disposed');
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('waits for its own tail commit, preserves repeated words after a pause, and keeps live text if final decoding fails', async () => {
    const engine = new SingleThreadASREngine({ finalModelId: 'whisper-base.en' });
    await engine.load(); await engine.start({} as MediaStream);
    const worker = FakeWorker.latest;
    FakeAudio.latest.feed(0.1, 4); FakeAudio.latest.feed(0, 3);
    const first = worker.sent.find(message => message.op === 'commit');
    expect(first).toBeDefined();
    FakeAudio.latest.feed(0.1, 4);
    const captured = vi.fn();
    const stopping = engine.stop(captured);
    await vi.waitFor(() => expect(worker.sent.filter(message => message.op === 'commit')).toHaveLength(2));
    const tail = worker.sent.filter(message => message.op === 'commit')[1];
    worker.reply({ id: first.id, type: 'commit_result', text: 'It is very' });
    expect(worker.sent.some(message => message.op === 'batch')).toBe(false);
    worker.reply({ id: tail.id, type: 'commit_result', text: 'very important' });
    await vi.waitFor(() => expect(worker.sent.some(message => message.op === 'batch')).toBe(true));
    const batch = worker.sent.find(message => message.op === 'batch');
    expect(captured).toHaveBeenCalledTimes(1);
    expect(batch.payload.modelId).toBe('whisper-base.en');
    worker.reply({ id: batch.id, type: 'error', error: 'offline' });
    await stopping;
    expect(engine.getMetrics().finalText).toBe('It is very very important');
    expect(engine.getMetrics().batchTranscript).toBeUndefined();
    engine.destroy();
  });

  it('drains the final 256 ms capture block before closing the microphone', async () => {
    vi.useFakeTimers();
    const engine = new SingleThreadASREngine({ captureDrainMs: 300 });
    await engine.load(); await engine.start({} as MediaStream);
    FakeAudio.latest.feed(0.1, 4);
    const captured = vi.fn();
    const stopping = engine.stop(captured);
    expect(captured).not.toHaveBeenCalled();
    FakeAudio.latest.feed(0.1);
    await vi.advanceTimersByTimeAsync(300);
    expect(captured).toHaveBeenCalledOnce();
    const worker = FakeWorker.latest;
    const tail = worker.sent.find(message => message.op === 'commit');
    expect(new Float32Array(tail.payload.audio)).toHaveLength(5 * 4096);
    worker.reply({ id: tail.id, type: 'commit_result', text: 'last word retained' });
    await vi.advanceTimersByTimeAsync(0);
    const batch = worker.sent.find(message => message.op === 'batch');
    worker.reply({ id: batch.id, type: 'batch_result', text: 'last word retained' });
    await stopping;
    engine.destroy();
  });

  it('ignores a late final result after cancellation and destroy never starts a final pass', async () => {
    const engine = new SingleThreadASREngine();
    await engine.load(); await engine.start({} as MediaStream);
    FakeAudio.latest.feed(0.1, 4);
    const worker = FakeWorker.latest;
    const stopping = engine.stop();
    await vi.waitFor(() => expect(worker.sent.some(message => message.op === 'commit')).toBe(true));
    const tail = worker.sent.find(message => message.op === 'commit');
    worker.reply({ id: tail.id, type: 'commit_result', text: 'original answer' });
    await vi.waitFor(() => expect(worker.sent.some(message => message.op === 'batch')).toBe(true));
    const batch = worker.sent.find(message => message.op === 'batch');
    engine.cancel();
    worker.reply({ id: batch.id, type: 'batch_result', text: 'stale answer' });
    await stopping;
    expect(engine.getMetrics().finalText).not.toContain('stale');
    const before = worker.sent.length;
    engine.destroy();
    expect(worker.sent).toHaveLength(before);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('runs the final decoder even when live decoding was slow, including on the next answer', async () => {
    const engine = new SingleThreadASREngine({ finalModelId: 'whisper-base.en' });
    for (let answer = 0; answer < 2; answer++) {
      await engine.start({} as MediaStream);
      FakeAudio.latest.feed(0.1, 4);
      const worker = FakeWorker.latest;
      const stopping = engine.stop();
      await vi.waitFor(() => expect(worker.sent.some(m => m.op === 'commit')).toBe(true));
      const commit = worker.sent.filter(m => m.op === 'commit').at(-1);
      worker.reply({ id: commit.id, type: 'commit_result', text: 'inaccurate live words', inferMs: 2000, sampleCount: 16384 });
      await vi.waitFor(() => expect(worker.sent.some(m => m.op === 'batch')).toBe(true));
      const batch = worker.sent.filter(m => m.op === 'batch').at(-1);
      worker.reply({ id: batch.id, type: 'batch_result', text: 'accurate final words' });
      await stopping;
      expect(engine.getMetrics()).toMatchObject({ finalText: 'accurate final words', refinementDecision: 'accepted' });
    }
    engine.destroy();
  });

  it('commits a quiet microphone after a real pause', async () => {
    const engine = new SingleThreadASREngine({ normalizeAudio: true });
    await engine.start({} as MediaStream);
    FakeAudio.latest.feed(0.002, 4);
    FakeAudio.latest.feed(0, 3);
    expect(FakeWorker.latest.sent.some(m => m.op === 'commit')).toBe(true);
    engine.destroy();
  });

  it('aborts slow Whisper after model readiness, retains live text and can reload the live model', async () => {
    vi.useFakeTimers();
    const engine = new SingleThreadASREngine({ finalModelId: 'whisper-base.en' });
    await engine.load(); await engine.start({} as MediaStream);
    engine.setQuestionPrompt('LoRA.');
    FakeAudio.latest.feed(0.1, 4);
    const worker = FakeWorker.latest;
    const stopping = engine.stop();
    await vi.advanceTimersByTimeAsync(0);
    const commit = worker.sent.find(m => m.op === 'commit');
    worker.reply({ id: commit.id, type: 'commit_result', text: 'the actual live answer', inferMs: 100, sampleCount: 16384 });
    await vi.advanceTimersByTimeAsync(0);
    const batch = worker.sent.find(m => m.op === 'batch');
    expect(batch.payload.initialPrompt).toBe('LoRA.');
    // Download time must not consume the decode budget.
    await vi.advanceTimersByTimeAsync(10000);
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.reply({ id: batch.id, type: 'model_ready', device: 'wasm' });
    await vi.advanceTimersByTimeAsync(30001);
    await stopping;
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(engine.getMetrics()).toMatchObject({ finalText: 'the actual live answer', refinementDecision: 'aborted-slow' });
    worker.reply({ id: batch.id, type: 'batch_result', text: 'late vocabulary injection' });
    expect(engine.getMetrics().finalText).toBe('the actual live answer');
    await engine.prepareForListening();
    expect(FakeWorker.latest).not.toBe(worker);
    engine.destroy();
  });

});

it('a cancelled capture drain cannot close the next question microphone',async()=>{
  vi.useFakeTimers();
  const engine=new SingleThreadASREngine({captureDrainMs:300});
  await engine.start({} as MediaStream);
  FakeAudio.latest.feed(0.1);
  const oldStopped=vi.fn();
  const firstStop=engine.stop(oldStopped);
  expect(engine.stop()).toBe(firstStop);
  engine.cancel();
  await engine.start({} as MediaStream);
  const current=FakeAudio.latest;
  await vi.advanceTimersByTimeAsync(300);
  await firstStop;
  expect(current.close).not.toHaveBeenCalled();
  expect(oldStopped).not.toHaveBeenCalled();
  engine.destroy();
});

it('uses existing capture samples and RMS for delivery, then resets the next recording', async () => {
  const engine = new SingleThreadASREngine({ captureDrainMs:0 });
  await engine.load(); await engine.start({} as MediaStream);
  const worker = FakeWorker.latest;
  const originalPost = worker.postMessage.bind(worker);
  vi.spyOn(worker, 'postMessage').mockImplementation(message => {
    originalPost(message);
    if (['commit','batch'].includes(message.op)) queueMicrotask(() => worker.reply({id:message.id,type:`${message.op}_result`,text:'um I like testing'}));
  });
  FakeAudio.latest.feed(0, 16); // Leading silence is not a pause.
  FakeAudio.latest.feed(0.1, 4);
  FakeAudio.latest.feed(0, 16); // One silence run >3s.
  FakeAudio.latest.feed(0.1, 4);
  await engine.stop();
  const timing = engine.getMetrics().deliveryTiming!;
  expect(timing.durationSeconds).toBeCloseTo(40 * 4096 / 16000);
  expect(timing.speakingSeconds).toBeCloseTo(8 * 4096 / 16000);
  expect(timing.longPauses).toBe(1);
  engine.reset();
  expect(engine.getMetrics().deliveryTiming).toBeUndefined();
  await engine.start({} as MediaStream);
  const nextStop = engine.stop();
  await nextStop;
  expect(engine.getMetrics().deliveryTiming).toEqual({durationSeconds:0,speakingSeconds:0,longPauses:0});
  engine.destroy();
});
