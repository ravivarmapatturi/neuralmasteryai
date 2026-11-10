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
  let prompted;
  try { prompted = await pipe(audio, options); } finally { model.generate = generate; }
  // On the answer-length test set a prompt made Whisper drop speech after pauses or loop on a phrase.
  // When the prompted transcript looks like that, decode again without the prompt and keep the better one.
  if (!promptedTranscriptLooksWrong(prompted?.text ?? '', audio)) return prompted;
  const plain = await pipe(audio, options);
  return promptedTranscriptLooksWrong(plain?.text ?? '', audio) && wordCount(prompted?.text) >= wordCount(plain?.text) ? prompted : plain;
}

const wordCount = (text?: string) => (text ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Seconds of audio that hold speech, counted in 30 ms frames. */
export function speechSeconds(audio: Float32Array, rate = 16000) {
  const frame = Math.round(rate * 0.03);
  const levels: number[] = [];
  for (let i = 0; i + frame <= audio.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += audio[j] * audio[j];
    levels.push(Math.sqrt(sum / frame));
  }
  if (!levels.length) return 0;
  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const loud = sorted[Math.floor(sorted.length * 0.9)];
  // Above the noise floor, but never above a third of the loud frames (a clip with no pauses has no floor).
  const threshold = Math.max(0.01, Math.min(floor * 3, loud * 0.3));
  return levels.filter(l => l > threshold).length * 0.03;
}

/** Too few words for the speech heard, or the same phrase repeated: the two prompt failures measured. */
export function promptedTranscriptLooksWrong(text: string, audio: Float32Array, rate = 16000) {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const speech = speechSeconds(audio, rate);
  if (speech >= 3 && words.length < speech * 1.2) return true;
  const grams = new Map<string, number>();
  for (let i = 0; i + 3 <= words.length; i++) {
    const g = words.slice(i, i + 3).join(' ');
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return [...grams.values()].some(n => n >= 3);
}
