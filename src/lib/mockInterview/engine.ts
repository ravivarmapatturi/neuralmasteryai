// Main-thread client for the on-device mock interview worker, plus audio capture.
type Progress = { task: string; loaded: number; total: number; file: string };
let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
const listeners = new Set<(p: Progress) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../../workers/mockInterviewWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = e => {
      const d = e.data;
      if (d.type === 'progress') { listeners.forEach(l => l(d)); return; }
      const w = waiting.get(d.id); if (!w) return;
      waiting.delete(d.id);
      if (d.ok) w.resolve(d.result); else w.reject(new Error(d.error));
    };
  }
  return worker;
}
function call<T>(op: string, payload?: unknown, transfer: Transferable[] = []): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => { waiting.set(id, { resolve, reject }); getWorker().postMessage({ id, op, payload }, transfer); });
}

export const onProgress = (l: (p: Progress) => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const initEngine = () => call<boolean>('init');
export const transcribe = (audio: Float32Array) => call<string>('transcribe', { audio }, [audio.buffer]);
export const embed = (texts: string[]) => call<number[][]>('embed', { texts });

/** Record from the microphone; resolves with 16 kHz mono PCM and the duration in seconds. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported?.(t)) ?? '';
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  const started = performance.now();
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start(1000);
  return {
    stop: () => new Promise<{ audio: Float32Array; seconds: number }>((resolve, reject) => {
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        try {
          const ctx = new AudioContext({ sampleRate: 16000 });
          const decoded = await ctx.decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer());
          const audio = new Float32Array(decoded.getChannelData(0));
          await ctx.close();
          resolve({ audio, seconds: (performance.now() - started) / 1000 });
        } catch (err) { reject(err as Error); }
      };
      rec.stop();
    }),
    cancel: () => { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(t => t.stop()); },
  };
}

/** Read a question aloud with the browser's built-in voice (free, no network for most voices). */
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.lang = 'en-US';
  speechSynthesis.speak(u);
}
export const stopSpeaking = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
