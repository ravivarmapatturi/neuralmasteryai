# Rest batch 11 scorecard

| Page | Why / flow | Worksheet and example | Try it | Mistakes / when not | Static |
| --- | --- | --- | --- | --- | --- |
| Replication, Acknowledgement, and Failover | Pass | Source output: primary/replica versions 8/7 then 8/8; recovery candidates at durable 7 and 8 | Pass | Pass | Pass |
| Sharding and Data Ownership | Pass | Source output: 3-shard hot owner 6,300/s; 6-shard hot owner 6,100/s; total 7,100/s | Pass | Pass | Pass |
| Consistent Hashing and Membership Changes | Pass | Source output: key 30 moves B→D; 1 of 5 keys moves | Pass | Pass | Pass |
| Caching Strategies and Invalidation Races | Pass | Source output: version 7 refills after invalidation; fence rejects it; averages 4.5 and 27.0 ms | Pass | Pass | Pass |
| Distributed Locks, Leases, and Fencing Tokens | Pass | Source output: token 7 overwrites B without fencing and is rejected with fencing; late A release is false | Pass | Pass | Pass |
| Sagas, Compensation, and Transactional Outbox | Pass | Source output: rollback leaves both records empty; reservation 100→70→100 after repeated release | Pass | Pass | Pass |
| Microservices and Modular Monolith Boundaries | Pass | Source output: 60 ms local vs 70 ms separated; joint availability 0.997003; 2/4 changes cross capabilities | Pass | Pass | Pass |
| Service Discovery and Endpoint Freshness | Pass | Source output: A remains stale at second 20; refresh at 30 selects B,C; cached/refreshed six-route sequences | Pass | Pass | Pass |

All 16 `RunnableCode` blocks were executed from the checked-in page source with Python 3 in this session; all completed without exceptions. Their printed values were compared with worksheet and worked-example values. This verifies the plain Python examples in CPython; no browser/Pyodide run was performed.

Static checks passed on the combined worktree: notebook (24 changed pages/0 violations), MDX (2,019/2,019), math (1,991 pages), links (2,147 routes/no broken links or anchors; one existing approximate inline-math warning), typecheck, tracker, and diff check. Full Vitest, browser four-view review, and production build were deferred. Available RAM was 2 GiB, below the repository's 5 GiB build threshold. No push.
