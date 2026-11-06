// Kokoro text-to-speech in a worker, so the page stays responsive while audio is generated.
// Text arrives one request at a time; each sentence is sent back as soon as it is ready.
import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts: Promise<KokoroTTS> | null = null;
let current = 0;

function load() {
  if (!tts) {
    tts = KokoroTTS.from_pretrained(MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p: { status: string; loaded?: number; total?: number }) => {
        if (p.status === 'progress') self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total });
      },
    }).catch((err) => {
      tts = null;
      throw err;
    });
  }
  return tts;
}

self.onmessage = async (e: MessageEvent<{ id: number; text?: string; cancel?: boolean }>) => {
  const { id, text, cancel } = e.data;
  current = id;
  if (cancel || !text) return;
  try {
    const model = await load();
    const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    for (const sentence of sentences) {
      if (current !== id) return;
      const audio = await model.generate(sentence, { voice: 'am_michael', speed: 0.98 });
      if (current !== id) return;
      const samples = audio.audio as Float32Array;
      self.postMessage({ type: 'chunk', id, samples, rate: audio.sampling_rate }, { transfer: [samples.buffer] });
    }
    self.postMessage({ type: 'done', id });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  }
};
