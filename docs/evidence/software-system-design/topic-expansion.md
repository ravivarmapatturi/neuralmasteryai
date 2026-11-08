# Software system design topic expansion checkpoint

2026-11-09, branch `software-system-design`. No push.

The requested expansion is **not complete**. Foundations and Scaling have been expanded. Data, Communication, Distributed Systems, and Reliability still contain their original survey chapters and need the same treatment next. Existing case studies and the interview bank are preserved.

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

Each topic commit contains one MDX topic, its relevant diagram/test assets, and its route metadata. Scaling's overview is committed with this checkpoint. Both overview URLs and all their former H2 heading IDs remain available.

## Verification actually run

- Typecheck passed after every new TypeScript topic component.
- Internal prose and anchor checks passed at the final 1,937-page state.
- MDX compilation passed: 1,963 files, zero failures.
- Final targeted Vitest run passed: 12 files, 18 tests, covering new topic interactions and existing system-design experiments.
- `python3 scripts/verify-system-design-python.py` passed all 52 current track snippets directly and under the worker indentation wrapper, with matching output.
- Every new topic's two RunnableCode blocks ran through the actual browser Run button in light and dark: 48 successful Pyodide executions across 12 topics.
- Each topic was checked at 375px and 1440px in both themes, with keyboard operation of diagram controls and no page/console errors in the focused audit.
- Foundations and Scaling overviews were checked in both themes at both widths, including presence of every new topic link.
- Banned-phrase scan of all 12 new topics and both overview pages produced zero hits. `git diff --check` passed.
- Real NGINX syntax validation passed. An isolated local container test routed through the example upstream to both backends (`ABABAB`). The gateway header policy replaced the supplied forwarding claim with the observed loopback peer. The limiter accepted work and returned HTTP 429 after exhausting its burst.
- Kubernetes HPA configuration was checked against current primary documentation; it was not applied to a cluster.

Build, Pagefind, full Vitest, and full Playwright were not run, as explicitly excluded by the brief. The focused browser script is `scripts/verify-system-design-topics.mjs`; pass topic slugs as arguments with a dev server on `127.0.0.1:5217`. It verifies direct/wrapped Python, actual Pyodide output, keyboard controls, geometry, and browser errors. Screenshots and temporary outputs were kept under `/tmp/system-design-topics`, not committed.

## Known unrelated issue

Clicking the shared “Mark as understood” control introduces a streak indicator that expands the navbar to approximately 387px at a 375px viewport. The new topic layouts and executed code output fit without that shared-state change. The navbar was not changed in this task. It requires a separate shared-layout fix and a regression check with a nonzero streak.

## Remaining sequence

Continue from Data: SQL vs NoSQL, indexing, replication, sharding, consistent hashing, CAP/PACELC, consistency models, transactions/isolation, caching/invalidation. Then Communication, Distributed Systems, and Reliability topics in brief order. Convert each corresponding original chapter into a short linked overview only after its topic pages exist, preserve old headings, and commit each page separately. Do not push.
