# Agents batch 1 scorecard

Pages: Agent Fundamentals, Agent Architectures, ReAct Agents in Production, Loops and Graphs.

| Page | Printed output / page values used | Standard sections | Static result |
| --- | --- | --- | --- |
| Agent Fundamentals | Rejected `1001`; accepted `A-1001`; shipped via UPS; ETA `2026-10-25` | Why, PenFlow, order trace Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| Agent Architectures | Pattern selection is qualitative; no numeric output was invented | Why, PenFlow, architecture-choice Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| ReAct Agents in Production | 10 iterations, 2,000-token prompt, 500 tokens/step; total 42,500 tokens | Why, PenFlow, arithmetic Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| Loops and Graphs | Recorded worker calls: overview 1, pricing 2, risks 1; total 4 | Why, PenFlow, worker-trace Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |

Verification on the combined worktree: `npm run check:notebook` (22 changed pages, 0 violations), `npm run check:math` (1991 MDX files), `npm run check:mdx` (2019 files, 0 failures), `npm run check:links` (2147 valid routes, no broken prose or anchors), `npm run typecheck`, `npm run check:tracker`, and `git diff --check` passed. Build, full Vitest, and browser checks are deferred because available RAM is below the repository's 5 GiB threshold; no printed outputs were changed.
