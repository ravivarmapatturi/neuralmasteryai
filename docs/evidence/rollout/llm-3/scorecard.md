# LLMs & GenAI batch 3 scorecard

Page: Multimodal & Generative Models.

| Example | Existing page values used in Worksheet |
| --- | --- |
| VLM patching | 336/14 = 24 patches per side; 576 tokens; 20 text tokens make 596 total; 97% image tokens |
| CLIP contrastive training | Matching probability 0.895 and loss 0.108 at temperature 0.07; loss 0.864 at temperature 1.0 |
| Diffusion | Signal weights at t=100/500/999: 0.946/0.279/0.006 |

Added the page-specific PenFlow and Worksheet, Worked example, normalized the first runnable heading to Try it yourself (existing `# Try it:` comment retained), added Common mistakes, and normalized When not to use it.

Verification on the combined worktree: notebook (24 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed. Full Vitest, browser, and build remain deferred under the low-memory rule.
