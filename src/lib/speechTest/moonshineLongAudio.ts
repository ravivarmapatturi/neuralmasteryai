/** Moonshine has no timestamp-based long-audio merger. Bound decoder state to live-sized windows. */
export async function transcribeMoonshineLongAudio(pipe: any, audio: Float32Array): Promise<{text:string}> {
  const windowSamples = 136000;
  const overlapSamples = 20000;
  let text = '';
  for (let offset = 0; offset < audio.length; offset += windowSamples - overlapSamples) {
    const part = audio.subarray(offset, Math.min(audio.length, offset + windowSamples));
    const next = String((await pipe(part))?.text ?? '').trim();
    const previousWords = text.split(/\s+/).filter(Boolean);
    const nextWords = next.split(/\s+/).filter(Boolean);
    const clean = (word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matched = 0;
    if (offset > 0) {
      for (let n = Math.min(8, previousWords.length, nextWords.length); n > 0; n--) {
        if (previousWords.slice(-n).map(clean).join(' ') === nextWords.slice(0,n).map(clean).join(' ')) {matched = n;break;}
      }
    }
    text = [text, nextWords.slice(matched).join(' ')].filter(Boolean).join(' ');
    if (offset + windowSamples >= audio.length) break;
  }
  return {text};
}
