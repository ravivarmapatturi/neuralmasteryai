# Benchmark Audio Source & Reference Text

## Source Audio
- **Base Speech**: LibriSpeech test sample from Hugging Face dataset [`Narsil/asr_dummy`](https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/1.flac).
- **Format**: Converted to 16 kHz mono 16-bit PCM WAV (`speech.wav`, 10.44s duration).
- **Speech with Pauses (`speech_with_pauses.wav`)**:
  - Synthesized by concatenating phrases from `speech.wav` with 3 silent thinking pauses:
    - 0 to 2.4s: Speech phrase 1 ("He hoped there would be stew for dinner")
    - 2.4 to 4.6s: 2.2s silence (Pause 1)
    - 4.6 to 8.2s: Speech phrase 2 ("turnips and carrots and bruised potatoes")
    - 8.2 to 11.4s: 3.2s silence (Pause 2)
    - 11.4 to 15.84s: Speech phrase 3 ("and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.")
    - 15.84 to 22.34s: 6.5s silence (Pause 3)
  - Total duration: 22.34 seconds.

## Ground Truth Reference Text
```text
He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.
```
