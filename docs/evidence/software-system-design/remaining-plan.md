# Remaining topic learning decisions

All pages are explanation/tutorial. Each row gives the learner's question, misconception to break, and example shared by prose, diagram, and Python.

| Topic | Question / misconception | Worked example |
| --- | --- | --- |
| REST | How does conditional HTTP mutation prevent a lost update? Idempotence does not mean identical responses. | Two edits start at version 7; only the first may replace it under If-Match. |
| gRPC | How does a deadline cross RPC hops? Fresh per-hop timeouts do not preserve the caller's budget. | 200 ms minus 30 and 50 leaves 120 ms. |
| GraphQL | What bounds resolver work? One network request is not one backend operation. | 10 orders, 10 owner lookups versus 2 distinct owners in a batch. |
| WebSockets/SSE | How does reconnect recover events? A connected socket is not durable history. | Cursor 41, events 42–45, retention floor 40 or 44. |
| Queues | When may a worker acknowledge? Receiving a job is not committing its effect. | Job 7, effect committed, acknowledgement lost, redelivery. |
| Kafka | What does an offset commit mean? Committing an offset does not commit an external effect. | Partition offsets 10–12; effect at 11 and crash before committing next offset 12. |
| Pub/sub | Which consumers receive an event? Worker competition is not independent subscription delivery. | Events 1–4, two workers versus two subscription groups. |
| Idempotency | Which identity survives a retry? Repeated payloads are not necessarily repeated intent. | Operation k7 changes balance 100→90 once across two attempts. |
| Delivery | Which boundary is exactly once? An acknowledgement does not atomically cover every store. | One input, two sends, one or two committed effects. |
| Consensus | What makes a leader's history committed? Election alone does not commit arbitrary entries. | Five voters, quorum three, partitions 3/2. |
| Locks | What stops a paused owner after lease expiry? Expiry does not stop old code. | Tokens 7 and 8; storage must reject late 7. |
| Saga/outbox | How do local commits cross services? Compensation is not physical rollback. | Reserve 30, capture fails, release reservation; order+outbox one local commit. |
| Monolith/services | Which boundary earns a service? More processes do not create domain independence. | Three serial 20 ms calls plus two 5 ms links versus 60 ms local work. |
| Discovery | Who owns endpoint freshness? A registry entry is not proof of readiness. | Three endpoints, stale A, expiry 30 seconds. |
| Circuit breaker | Which calls should be denied? An open breaker does not repair the dependency. | Five failures, open 30 seconds, one half-open probe. |
| Retries | How much extra work can recovery create? Retry policies multiply across layers. | Three layers, three attempts each, worst case 27 calls. |
| Observability | Which measurement explains the user failure? Healthy components do not prove a healthy action. | 1000 requests, 20 failures, histogram and sampled traces. |
| Deployments | What makes rollback safe? Switching code does not undo incompatible data. | 10% canary: 50/1000 errors versus baseline 9/9000. |
| Recovery | What does the restore promise cover? A backup file is not a tested recovery. | 15-minute backup age, 20-minute restore, 10-minute validation. |
| Security/auth | Where does a verified identity get permission? Signature validity is not resource authorization. | Alice owns document 7; Bob's valid token must still be denied. |
| Multi-region | Which region may own a write? Two healthy writers do not create one history. | Local 2 ms, remote round trip 40 ms, acknowledgement path 42 ms. |
