// Records the interviewer voice for every question and model answer that has no clip yet.
// Same voice as the existing clips: Kokoro-82M, am_michael, speed 0.98, Opus mono.
// Usage: node scripts/interview-voice/generate-clips.mjs [--shard=0 --shards=1] [--list]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const shard = Number(args.shard ?? 0);
const shards = Number(args.shards ?? 1);
const dir = 'public/audio/interview-voice';
const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf8'));
const questions = (practice.topics ?? practice).flatMap(t => t.questions);

// Spoken text matches what the page passes to the on-device fallback.
const clean = text => text.replace(/\*+/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
const jobs = questions.flatMap(q => {
  const base = q.id.replaceAll(':', '__');
  return [
    { file: `${base}_q.opus`, text: clean(q.title + (q.options ? ` The options are: ${q.options.join('. ')}` : '')) },
    { file: `${base}_a.opus`, text: clean(q.answer ?? '') },
  ];
}).filter(job => job.text && !fs.existsSync(`${dir}/${job.file}`));
const mine = jobs.filter((_, i) => i % shards === shard);
console.log(`${jobs.length} clips missing, shard ${shard}/${shards} records ${mine.length}`);
if ('list' in args) process.exit(0);

const { KokoroTTS } = await import('kokoro-js');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const tmp = fs.mkdtempSync('/tmp/voice-');
for (const [n, job] of mine.entries()) {
  // Sentence by sentence, as in the browser, so long answers never hit the model's token limit.
  const sentences = job.text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [job.text];
  const parts = [];
  let rate = 24000;
  for (const sentence of sentences) {
    const audio = await tts.generate(sentence, { voice: 'am_michael', speed: 0.98 });
    rate = audio.sampling_rate;
    parts.push(audio.audio, new Float32Array(Math.round(rate * 0.15)));
  }
  const samples = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  parts.reduce((at, p) => (samples.set(p, at), at + p.length), 0);
  const raw = `${tmp}/clip.f32`;
  fs.writeFileSync(raw, Buffer.from(samples.buffer));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', raw, '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip', `${dir}/${job.file}`]);
  console.log(`${n + 1}/${mine.length} ${job.file}`);
}
