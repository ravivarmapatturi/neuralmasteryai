# LLMs & GenAI batch 1 scorecard

Pages: LLMs and Generative AI overview, LLM Internals Hub, LLMs & GenAI roadmap, Training Pipeline.

| Page | Existing output or stated numerical facts used | Static result |
| --- | --- | --- |
| Overview | 8B model; 0.16T Chinchilla tokens/7.7e+21 FLOPs; 15T Llama 3 tokens/7.2e+23 FLOPs; 45T serving break-even | Passed |
| Internals Hub | Existing linked token path and chapter/build references, no printed numeric output | Passed |
| Roadmap | Existing chapter links mapped to system questions, no printed numeric output | Passed |
| Training Pipeline | 2N forward + 4N backward = 6N FLOPs/token; C ≈ 6ND; about 20 training tokens per parameter | Passed |

Each page has Why, PenFlow, Worksheet, Worked example, Try it yourself with `# Try it:`, Common mistakes, and When not to use it. Existing training flow was retained as readable Markdown, not a fake code fence. Overview output stays in a named `output` fence.

Verification: notebook (19 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed on the combined worktree. Full Vitest, browser, and build remain deferred under low-memory constraints.
