# Agents batch 5 scorecard

Pages: MCP overview, MCP Protocol Deep Dive, A2A overview.

| Page | Real output values used | Minimal implementation section | Static result |
| --- | --- | --- | --- |
| MCP overview | Version `2026-07-28`; `read_note`; standup content; unknown note tool error | Renamed to Try it yourself; added `# Try it:` edit | Passed |
| MCP Protocol Deep Dive | Header mismatch HTTP 400; confirmation required; tampered requestState rejected; valid retry deletes todo | Renamed to Try it yourself; added `# Try it:` edit | Passed |
| A2A overview | FX Agent/convert; INPUT_REQUIRED; same task resumes to 120 USD = 103.20 EUR; later COMPLETED | Working client code used as Try it yourself with `# Try it:` edit | Passed |

Each page has Why, a page-specific PenFlow, a Worksheet from printed output, Worked example, Try it yourself, Common mistakes, and When not to use it. Output blocks are labeled `output`; the Agent Card URL is inline code and protocol trace fences are labeled as output.

Verification: notebook (15 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed on the combined worktree. Full Vitest, browser, and build remain deferred under the low-memory rule.
