# Brief: live single-thread Moonshine is losing most of the speech

Branch interview-speech-test. No push, deploy or GPU.

Your batch benchmark gave 6.9% WER, but the live Option 4 run gave WER 65.5% with 30 word revisions and a transcript of only "Button pieces to be ladled out in thick peppered flower fattenedsauce." So the live pipeline, not the model, is dropping earlier speech and rewriting text. Your harness passed anyway: make it fail above 25% WER on this clip.

Fix the live pipeline. Use voice activity to commit finished phrases: at each silence or about every 8 to 10 seconds, the settled segment is frozen and appended; only the current segment is re-transcribed, and it must not cut words at window edges (overlap and align). Keep all audio until it's committed. Then measure WER, lag, update interval, revisions per word, and whether the final text equals a batch pass over the same audio. Run at normal CPU and 4x throttle. Report honest numbers even if worse, and say whether a real streaming model (Moonshine multi-threaded or a streaming ONNX) would be needed.

Also fix: check the real Option 1 and 3 results still load; Option 3's 65.5% WER is the same number as Option 4's, so confirm that's real and not a shared bug. Check ai4bharat/indic-parler-tts for browser feasibility: real size, whether ONNX exists, and access rules, from the primary source; don't build it.

When done, the page must be ready for a real person on `vite dev` at localhost with a laptop mic. Commit and paste results. Do not claim anything you did not run.
