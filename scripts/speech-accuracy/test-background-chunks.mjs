import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = path.resolve('scripts/speech-accuracy');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-test-chunks-'));

await build({
  entryPoints: {
    worker: 'src/workers/moonshineSingleThreadWorker.ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: temp,
  logLevel: 'error',
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file;
  if (url.pathname === '/harness') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!DOCTYPE html><html><head><title>Test Chunks</title></head><body><h1>Test</h1></body></html>');
    return;
  }
  if (url.pathname === '/worker.js') file = path.join(temp, 'worker.js');
  else if (url.pathname.startsWith('/audio/') && !url.pathname.includes('..')) file = path.join(root, url.pathname);
  else if (url.pathname.endsWith('.mjs')) file = path.join(process.cwd(), 'node_modules/onnxruntime-web/dist', path.basename(url.pathname));
  else if (url.pathname.endsWith('.wasm')) file = path.join(process.cwd(), 'node_modules/onnxruntime-web/dist', path.basename(url.pathname));
  else {
    res.statusCode = 404;
    res.end();
    return;
  }
  try {
    const ext = path.extname(file);
    const ct = ext === '.wav' ? 'audio/wav' : ext === '.wasm' ? 'application/wasm' : 'text/javascript';
    res.setHeader('Content-Type', ct);
    fs.createReadStream(file).pipe(res);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});

await new Promise((resolve) => server.listen(5196, resolve));

try {
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5196/harness');

  const comparison = await page.evaluate(async () => {
    // 1. Fetch 64s audio
    const ctx = new AudioContext({ sampleRate: 16000 });
    const resp = await fetch('/audio/capture-long-heldout.wav');
    const audioBuffer = await ctx.decodeAudioData(await resp.arrayBuffer());
    const pcm = audioBuffer.getChannelData(0);

    // 2. Load Whisper Base pipeline
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    env.backends.onnx.wasm.numThreads = 1;
    env.allowLocalModels = false;

    console.log('Loading pipeline...');
    const pipe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base.en', {
      dtype: 'q8',
      device: 'wasm',
    });

    // Run baseline full-audio batch
    console.log('Running standard pipeline...');
    const baselineOut = await pipe(pcm, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });

    // Run manual background chunking
    console.log('Running chunked decoding...');
    const sampling_rate = 16000;
    const chunk_length_s = 30;
    const stride_length_s = 5;
    const window = sampling_rate * chunk_length_s;
    const stride = sampling_rate * stride_length_s;
    const jump = window - 2 * stride;
    let offset = 0;

    const chunks = [];
    const hop_length = pipe.processor.feature_extractor.config.hop_length;
    const time_precision = pipe.processor.feature_extractor.config.chunk_length / pipe.model.config.max_source_positions;

    while (true) {
      const offset_end = offset + window;
      const subarr = pcm.subarray(offset, offset_end);
      const feature = await pipe.processor(subarr);
      const is_first = offset === 0;
      const is_last = offset_end >= pcm.length;
      const strideTuple = [subarr.length, is_first ? 0 : stride, is_last ? 0 : stride];

      const generation_config = {
        num_frames: Math.floor(subarr.length / hop_length),
        return_timestamps: true,
      };

      const data = await pipe.model.generate({
        inputs: feature.input_features,
        ...generation_config,
      });

      chunks.push({
        stride: strideTuple.map((x) => x / sampling_rate),
        tokens: data[0].tolist(),
        is_last,
      });

      if (is_last) break;
      offset += jump;
    }

    const [chunkedText] = pipe.tokenizer._decode_asr(chunks, {
      time_precision,
      return_timestamps: true,
      force_full_sequences: true,
    });

    await ctx.close();
    return {
      baseline: (baselineOut.text || '').trim(),
      chunked: (chunkedText || '').trim(),
      isIdentical: (baselineOut.text || '').trim() === (chunkedText || '').trim(),
      numChunks: chunks.length,
    };
  });

  console.log('Comparison result:');
  console.log('Baseline text:', comparison.baseline);
  console.log('Chunked text: ', comparison.chunked);
  console.log('Num chunks:   ', comparison.numChunks);
  console.log('Is identical: ', comparison.isIdentical);

  await browser.close();
} finally {
  server.close();
}
