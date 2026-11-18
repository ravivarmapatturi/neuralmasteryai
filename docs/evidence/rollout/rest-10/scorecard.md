# Rest batch 10 scorecard

| Page | Why / flow | Worksheet or example | Try it | Mistakes / when not | Static |
| --- | --- | --- | --- | --- | --- |
| Data Ownership and Consistency | Pass | Operation mapped to ownership, access, visibility, and invariant chapters | Pass | Pass | Pass |
| Indexing and Query Access Paths | Pass | Customer-first 2 entries vs time-first 6, same two matching rows | Pass | Pass | Pass |
| SQL vs NoSQL | Pass | Profile rename: one authoritative write; duplicated copies require two; historical snapshots remain Alice | Pass | Pass | Pass |
| Transactions and Isolation | Pass | Two independent snapshots leave 0 on call; serialized decision leaves 1 | Pass | Pass | Pass |
| Consistency Models | Pass | Version 7/8 histories with read-your-writes and monotonic-read outcomes | Pass | Pass | Pass |
| CAP and PACELC | Pass | Partition read decision; 2 ms local vs 42 ms remote path from the source's stated inputs | Pass | Pass | Pass |
| Coordination and Distributed Workflows | Pass | Timeout outcome mapped to caller knowledge and reconciliation action | Pass | Pass | Pass |
| Consensus and Leader Election | Pass | Five voters, majority 3, minimum overlap 1, commit index 10 and one unapplied entry | Pass | Pass | Pass |

The six technical pages retain their source RunnableCode. Their printed values were inspected against the worksheet and worked-example text. Existing plain PostgreSQL session transcript is labeled `output`; actual SQL snippets retain their SQL labels. No new numerical outputs were invented for landing pages.

Static checks passed on the combined tree: `check:notebook` (16 changed pages, 0 violations), `check:mdx` (2,019/2,019), `check:math` (1,991 pages), `check:links` (2,147 routes, no broken links/anchors; one existing approximate inline-math heading warning), `typecheck`, `check:tracker`, and `git diff --check`. Full Vitest, browser screenshots, and build were deferred: available RAM is 2 GiB, below the repository's 5 GiB build threshold. No push.
