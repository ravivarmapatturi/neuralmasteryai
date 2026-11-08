/** Transformers.js 4.3.2 does not implement prompt_ids. Condition through the
 * decoder prefix and strip that prefix BEFORE the pipeline scores/decodes output.
 * Never prepend vocabulary to the returned transcript. */
export async function transcribeWithPrompt(pipe: any, audio: Float32Array, options: any, prompt: string) {
  if (!prompt) return pipe(audio, options);
  const prefix = [
    ...pipe.tokenizer.encode('<|startofprev|>', { add_special_tokens: false }),
    ...pipe.tokenizer.encode(' ' + prompt, { add_special_tokens: false }).slice(-64),
  ];
  const model = pipe.model;
  const generate = model.generate;
  model.generate = async function (args: any) {
    const config = this._prepare_generation_config(args.generation_config, args);
    const initial = this._retrieve_init_tokens(config);
    const result = await generate.call(this, { ...args, decoder_input_ids: [...prefix, ...initial] });
    // This worker requests segment timestamps, never word timestamp dictionaries.
    return result.slice(null, [prefix.length, result.dims[1]]);
  };
  try { return await pipe(audio, options); } finally { model.generate = generate; }
}
