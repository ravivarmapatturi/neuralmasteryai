import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ pipeline: vi.fn(), env: { backends: { onnx: { wasm: { numThreads: 0 } } }, allowLocalModels: true } }));
vi.mock('@huggingface/transformers', () => mocks);
let messages: any[];
let scope: { navigator: object; postMessage: (message: any) => void; onmessage: ((event: any) => void) | null };
beforeEach(() => {
  vi.resetModules(); mocks.pipeline.mockReset(); messages = [];
  scope = { navigator: {}, postMessage: message => messages.push(message), onmessage: null };
  vi.stubGlobal('self', scope);
});
afterEach(() => vi.unstubAllGlobals());
const send = (id: number, op: string, payload = {}) => scope.onmessage!({ data: { id, op, payload } });
describe('single-thread speech worker', () => {
  it('checks for an adapter and reports the actual WASM fallback', async () => {
    const pipe = Object.assign(vi.fn(async () => ({ text: 'hello' })), { dispose: vi.fn() });
    mocks.pipeline.mockResolvedValue(pipe);
    await import('./moonshineSingleThreadWorker');
    send(1, 'init', { device: 'webgpu', modelId: 'whisper-base.en' });
    await vi.waitFor(() => expect(messages).toContainEqual(expect.objectContaining({ id: 1, type: 'init_done', device: 'wasm', requestedDevice: 'webgpu' })));
    expect(mocks.pipeline.mock.calls[0][2].device).toBe('wasm');
    expect(mocks.env.backends.onnx.wasm.numThreads).toBe(1);
  });
  it('falls back after a GPU generation error and releases the GPU model first', async () => {
    scope.navigator = { gpu: { requestAdapter: async () => ({}) } };
    const gpu = Object.assign(vi.fn(async () => { throw new Error('GPU kernel unavailable'); }), { dispose: vi.fn() });
    const wasm = Object.assign(vi.fn(async () => ({ text: 'recovered words' })), { dispose: vi.fn() });
    mocks.pipeline.mockResolvedValueOnce(gpu).mockResolvedValueOnce(wasm);
    await import('./moonshineSingleThreadWorker');
    send(1, 'init', { device: 'webgpu' });
    send(2, 'batch', { audio: new Float32Array(16000) });
    await vi.waitFor(() => expect(messages).toContainEqual(expect.objectContaining({ id: 2, text: 'recovered words', device: 'wasm' })));
    expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(mocks.pipeline.mock.calls.map(call => call[2].device)).toEqual(['webgpu', 'wasm']);
  });

  it('serializes interim, commit and batch requests and respects audio offsets', async () => {
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    let active = 0, maxActive = 0;
    const pipe = Object.assign(vi.fn(async (_audio: Float32Array) => {
      active++; maxActive = Math.max(maxActive, active); await barrier; active--; return { text: 'words' };
    }), { dispose: vi.fn() });
    mocks.pipeline.mockResolvedValue(pipe);
    await import('./moonshineSingleThreadWorker');
    send(1, 'init');
    await vi.waitFor(() => expect(messages.some(m => m.id === 1)).toBe(true));
    const samples = new Float32Array([9, 1, 2, 9]);
    for (const [id, op] of [[2, 'transcribe'], [3, 'commit'], [4, 'batch']] as const) send(id, op, { audio: samples.buffer, byteOffset: 4, length: 2 });
    await vi.waitFor(() => expect(pipe).toHaveBeenCalledTimes(1));
    expect([...pipe.mock.calls[0][0] as Float32Array]).toEqual([1, 2]);
    release();
    await vi.waitFor(() => expect(messages.filter(m => m.id >= 2 && m.type !== 'model_ready').map(m => m.id)).toEqual([2, 3, 4]));
    expect(messages.filter(m => m.type === 'model_ready').map(m => m.id)).toEqual([2, 3, 4]);
    expect(maxActive).toBe(1);
  });
  it('recovers from a failed load without an unhandled rejected promise', async () => {
    const pipe = Object.assign(vi.fn(async () => ({ text: 'words' })), { dispose: vi.fn() });
    mocks.pipeline.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(pipe);
    await import('./moonshineSingleThreadWorker');
    send(1, 'init'); send(2, 'init');
    await vi.waitFor(() => expect(messages.map(m => m.type)).toEqual(['error', 'init_done']));
  });
});
