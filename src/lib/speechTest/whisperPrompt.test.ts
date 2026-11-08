import { it, expect, vi } from 'vitest';
import { transcribeWithPrompt } from './whisperPrompt';
it('conditions decoding but removes prompt tokens before transcript decoding, including repeated chunk calls', async () => {
  const generate = vi.fn(async (_args: any) => ({ dims: [1, 6], slice: vi.fn((_: null, bounds: number[]) => { expect(bounds).toEqual([3, 6]); return 'generated-only'; }) }));
  const model = { generate, _prepare_generation_config: () => ({}), _retrieve_init_tokens: () => [50, 51] };
  const pipe = Object.assign(vi.fn(async () => ({ text: await model.generate({}), second: await model.generate({}) })), { model, tokenizer: { encode: (s: string) => s.includes('startofprev') ? [49] : [1, 2] } });
  expect(await transcribeWithPrompt(pipe, new Float32Array(16000), {}, 'LoRA.')).toEqual({ text: 'generated-only', second: 'generated-only' });
  expect(generate.mock.calls[0][0]).toEqual({ decoder_input_ids: [49, 1, 2, 50, 51] });
  expect(model.generate).toBe(generate);
});
it('restores generation after errors so context cannot leak into the next question', async () => {
  const generate = vi.fn();
  const pipe = Object.assign(vi.fn(async () => { throw Error('failed'); }), { model: { generate }, tokenizer: { encode: () => [1] } });
  await expect(transcribeWithPrompt(pipe, new Float32Array(16000), {}, 'RAG.')).rejects.toThrow('failed');
  expect(pipe.model.generate).toBe(generate);
});
