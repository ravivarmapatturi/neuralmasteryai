# Software system design topic expansion

2026-11-09, branch `software-system-design`. No push.

The six-section expansion is complete: 42 topic pages and six short linked section overviews. Foundations, Scaling, and Data were delivered at the earlier checkpoint below. Communication, Distributed Systems, and Reliability are now complete; see [remaining-section verification](remaining-verification.md) for their checks and commits. Existing case studies and the interview bank are preserved.

`git fetch origin` and `git merge origin/main` ran successfully; the merge reported already up to date.

## Topic commits

| Section | Topic | Commit |
| --- | --- | --- |
| Foundations | Design approach | `30948251` |
| Foundations | Requirements | `612405eb` |
| Foundations | Capacity estimation | `3925a0e6` |
| Foundations | Latency | `2b6371ee` |
| Foundations | Availability and SLOs | `7a789a14` |
| Foundations | Linked overview retaining old headings | `10ea6829` |
| Scaling | Vertical vs horizontal | `534b41dd` |
| Scaling | Stateless services | `436029ed` |
| Scaling | Load balancing | `945fa3a7` |
| Scaling | Reverse proxies and gateways | `a3aa1416` |
| Scaling | CDNs | `0b31c047` |
| Scaling | Autoscaling | `1ed30ded` |
| Scaling | Rate limiting | `47d50cb5` |
| Data | SQL vs NoSQL | `3774d1df` |
| Data | Indexing | `6af0abda` |
| Data | Replication | `92e0235b` |
| Data | Sharding | `432f4cb5` |
| Data | Consistent hashing | `52bf325f` |
| Data | CAP/PACELC | `7631fd34` |
| Data | Consistency models | `1ea6af49` |
| Data | Transactions and isolation | `5856ca4b` |
| Data | Caching and invalidation | `36527dbd` |

Each topic commit contains one MDX topic, its relevant diagram/test assets, and its route metadata. The Foundations and Scaling overview commits are 10ea6829 and 7219bbbc; Data's overview is committed with this checkpoint. All three overview URLs and all their former H2 heading IDs remain available. Replication reuses the existing topic-specific version explorer rather than duplicating it.

## Earlier Foundations, Scaling, and Data verification

- Typecheck passed after every new TypeScript topic component.
- Internal prose and anchor checks passed at the final 1,946-page state.
- MDX compilation passed: 1,972 files, zero failures.
- Final targeted Vitest run passed: 20 files, 26 tests, covering new topic interactions and existing system-design experiments.
- `python3 scripts/verify-system-design-python.py` passed all 68 current track snippets directly and under the worker indentation wrapper, with matching output.
- Every new topic's two RunnableCode blocks ran through the actual browser Run button in light and dark: 84 successful Pyodide executions across 21 topics.
- Each topic was checked at 375px and 1440px in both themes, with keyboard operation of diagram controls and no page/console errors in the focused audit.
- Foundations, Scaling, and Data overviews were checked in both themes at both widths, including presence of every new topic link.
- Banned-phrase scan of all 21 new topics and all three overview pages produced zero hits. `git diff --check` passed.
- Real NGINX syntax validation passed. An isolated local container test routed through the example upstream to both backends (`ABABAB`). The gateway header policy replaced the supplied forwarding claim with the observed loopback peer. The limiter accepted work and returned HTTP 429 after exhausting its burst.
- A real isolated PostgreSQL 18 test reproduced the two-session write skew: Repeatable Read committed both and left zero on call; Serializable aborted one with SQLSTATE 40001 and left one on call. Redis SET/GET/TTL/DEL commands ran successfully in an isolated container. Containers were removed after testing.
- Kubernetes HPA configuration was checked against current primary documentation; it was not applied to a cluster.

Build, Pagefind, full Vitest, and full Playwright were not run, as explicitly excluded by the brief. The focused browser script is `scripts/verify-system-design-topics.mjs`; pass topic slugs as arguments with a dev server on `127.0.0.1:5217`. It verifies direct/wrapped Python, actual Pyodide output, keyboard controls, geometry, and browser errors. Screenshots and temporary outputs were kept under `/tmp/system-design-topics`, not committed.

## Known unrelated issue

Clicking the shared “Mark as understood” control introduces a streak indicator that expands the navbar to approximately 387px at a 375px viewport. The new topic layouts and executed code output fit without that shared-state change. The navbar was not changed in this task. It requires a separate shared-layout fix and a regression check with a nonzero streak.

## Final continuation

Communication now has nine topic pages, Distributed Systems seven, and Reliability five. All three original URLs retain their original titles and H2 headings and link to the full-depth topics. Each topic has its own interactive experiment and two runnable examples. The final continuation and its per-page deepening changes are committed individually; no commit bundles two learning pages. See remaining-verification.md for the exact final scope and the intentionally excluded heavy checks.
