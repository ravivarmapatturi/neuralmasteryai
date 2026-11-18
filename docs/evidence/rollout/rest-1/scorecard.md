# Rest batch 1 scorecard

Pages: Search & Recommendation overview; Harness Engineering overview and roadmap; MLOps overview and roadmap; AI Evaluation overview and roadmap; Evaluation Fundamentals.

| Page | Existing numbers or route data used | Static result |
| --- | --- | --- |
| Search & Recommendation overview | Millions/billions catalog; hundreds to thousands after retrieval; 5–20 served items | Passed |
| Harness overview | AST map output; 14%→92% task completion; 32k instruction budget; 120k→8k compaction | Passed |
| Harness roadmap | 14%→92%, 32k tokens, 120k→8k, three verification layers | Passed |
| MLOps overview/roadmap | Existing lifecycle diagrams and chapter order | Passed |
| AI Evaluation overview/roadmap | Existing three chapter groupings and evaluation route | Passed |
| Evaluation Fundamentals | Diagram defaults 62% true capability and 15% contamination; computed 67.7% reported score and 5.7-point inflation | Passed |

Every page has Why, The big picture, Worked example, Try it yourself with `# Try it:`, Common mistakes, and When not to use it. Pages with existing flow PenFlows reuse those as their big-picture path; number-bearing pages include Worksheets.

Verification: notebook (8 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 valid routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed. Full Vitest, browser, and build remain deferred under low-memory constraints.
