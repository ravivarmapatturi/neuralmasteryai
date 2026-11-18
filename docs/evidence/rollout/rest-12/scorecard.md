# Rest batch 12 scorecard

| Page | Why / flow | Worksheet and example | Try it | Mistakes / when not | Static |
| --- | --- | --- | --- | --- | --- |
| Communication and Delivery Guarantees | Pass | Protocol-to-delivery learning map; no synthetic numeric values | Pass | Pass | Pass |
| REST and Conditional Resource Updates | Pass | Stale If-Match receives 412 and preserves price 12; unguarded replacement resets it to 10 | Pass | Pass | Pass |
| gRPC Contracts, Deadlines, and Flow Control | Pass | Deadline remaining 170/120 ms, fresh nested 280 ms; 10-second queue +400 | Pass | Pass | Pass |
| GraphQL Execution and Bounded Resolver Work | Pass | 10 requests, 2 distinct owners, 11 naive / 2 batched / 3 memoized calls | Pass | Pass | Pass |
| WebSockets, SSE, and Reconnect Recovery | Pass | Cursor 41: floor 40 replays 42–45; floor 44 misses 42–43 and needs snapshot | Pass | Pass | Pass |
| Message Queues and Worker Acknowledgements | Pass | Two unguarded effects vs one guarded; prefetch 6; backlog 400, drain 10 s at 140/s | Pass | Pass | Pass |
| Publish/Subscribe and Independent Consumer Progress | Pass | Four events: 4 competing deliveries vs 8 subscription deliveries; 5,000/s and 2.5 MB/s | Pass | Pass | Pass |
| Kafka Logs, Offsets, and Processing Boundaries | Pass | Restart replays 11/12 and duplicates effect 11; contiguous next 11; payload 43.2 GB/day, 129.6 GB for 3 copies | Pass | Pass | Pass |

Executed all 14 source `RunnableCode` blocks in Python 3 during this session. All completed without exceptions; their printed values were checked against the worksheets. This is CPython evidence; no browser/Pyodide run was performed.

Static checks passed on the combined worktree: notebook (32 changed pages/0 violations), MDX (2,019/2,019), math (1,991 pages), links (2,147 routes/no broken links or anchors; one existing approximate inline-math warning), typecheck, tracker, and diff check. Full Vitest, browser four-view review, and build were deferred; available RAM remains 2 GiB, below the repository's 5 GiB build threshold. No push.
