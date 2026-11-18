# LLMs & GenAI batch 2 scorecard

Pages: Calling the LLM API in Practice, LLM Evaluation and Serving, Foundation Model & Transformer Internals, Retrieval & Reranking Architectures.

| Page | Existing values used | Static result |
| --- | --- | --- |
| Calling the LLM API | Token probabilities at temperatures 0.3/1.0/1.5 and top-p 0.8 | Passed |
| Evaluation and Serving | Paired evaluation results (n=50/1000); KV cache 128 KiB/token and 119 sequences in 64 GB; flattened speculative-decoding fraction in Remember table | Passed |
| Foundation Internals | Temperature limits (0 and infinity), top-p 0.9, token path from existing page content | Passed |
| Retrieval and Reranking | Cited MS MARCO: MRR@10 36.0 vs 34.9; latency 10,700 vs 61 ms; FLOPs 97T vs 7B; MaxSim token example retained in narrative | Passed |

All pages contain Why, page-specific PenFlow and Worksheet, Worked example, Try it yourself with a `# Try it:` edit, Common mistakes, and When not to use it. Output fences are named `output` and retained. The foundation token flow remains as readable Markdown; the evaluation table fraction is written as a flat ratio.

Verification: notebook (23 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed on the combined worktree. Full Vitest, browser, and build remain deferred under the low-memory rule.
