# sherpa-onnx WebAssembly Assets

This folder hosts the streaming English Zipformer model (`sherpa-onnx-streaming-zipformer-en-20M-2023-02-17` / GigaSpeech) runtime for `/lab/speech-test`.

The large binary assets (`.wasm` ~13 MB, `.data` ~71 MB) are ignored by git to avoid bloating repository history.

To download or refresh these assets, run:
```bash
node scripts/download-sherpa-model.mjs
```

### Source & License
- Model & Runtime: `k2-fsa/sherpa-onnx` (Apache License 2.0)
- Upstream archive: `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-wasm-simd-1.13.2-vad-asr-en-zipformer_gigaspeech.tar.bz2`
