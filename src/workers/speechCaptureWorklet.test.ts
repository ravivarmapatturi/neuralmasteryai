import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
it('captures ordered 16 kHz packets on the audio thread without missing or duplicating samples', () => {
  let Capture: any;
  const packets: Float32Array[] = [];
  const context = vm.createContext({
    Float32Array,
    AudioWorkletProcessor: class { port = { postMessage: (packet: Float32Array) => packets.push(packet) }; },
    registerProcessor: (_name: string, klass: any) => { Capture = klass; },
  });
  vm.runInContext(readFileSync('src/workers/speechCaptureWorklet.js', 'utf8'), context);
  const processor = new Capture();
  for (let i = 0; i < 64; i++) {
    expect(processor.process([[Float32Array.from({ length: 128 }, (_, j) => i * 128 + j)]])).toBe(true);
  }
  expect(packets).toHaveLength(4);
  expect(packets.flatMap(p => [...p])).toEqual(Array.from({length: 8192}, (_, i) => i));
  expect(processor.process([])).toBe(true);
});
