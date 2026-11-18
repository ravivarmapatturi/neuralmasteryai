# Agents batch 3 scorecard

Pages: Context Engineering, No-Code and Low-Code Agent Builders, AI Agents: The Big Picture, and Agents Roadmap.

| Page | Recorded output and worksheet values | Static result |
| --- | --- | --- |
| Context Engineering | 3,317 all-instructions tokens; 98 startup; 1,098 after selection; 50-skill scaling 55,283 vs about 1,633 | Passed |
| No-Code Automation | Invoice to #billing; error 500 to bug ticket; thank-you unmatched; prompt diff adds refund only | Passed |
| Agents Overview | 1/10/50/100 steps: 6,000/127,500/2,137,500/8,025,000 uncached input tokens, with printed costs | Passed |
| Agents Roadmap | Existing links mapped to learner questions; qualitative route, no invented metric | Passed |

All four pages contain Why, a page-specific PenFlow, Worksheet, Worked example, Try it yourself with a `# Try it:` edit, Common mistakes, and When not to use it. Existing output traces are retained and labeled `output`.

Verification on the combined worktree: notebook (8 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed. Full Vitest, browser, and build remain deferred under the low-memory rule.
