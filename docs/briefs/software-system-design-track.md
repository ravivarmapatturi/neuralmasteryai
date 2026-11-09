# Brief: complete Software System Design track on /learn

Owner's request: a complete end-to-end software system design track, covering load balancing, horizontal and vertical scaling and everything else a senior engineer needs. First check what exists under src/content/docs (including any ml-system-design and system design pages) and reuse or link it; never duplicate.

Follow AGENTS.md and the learn-page, visualization and writing-voice skills. The bar is src/content/docs/deep-learning/attention-transformers.mdx: plain explanation first, then mechanism, real numbers, an interactive diagram where it teaches something, runnable Python where meaningful, trade-offs and failure modes. Add the track to the taxonomy in src/data/sectionMeta.ts and run node scripts/generate-page-meta.mjs. Use narrative prose, not bullet-definition sheets. No fine print on pages.

Pages, in this order:
1. Foundations: how to approach a design, requirements, back-of-envelope estimation, latency numbers, availability and SLOs.
2. Scaling: vertical vs horizontal, stateless services, load balancing (L4/L7, algorithms, health checks), reverse proxies and API gateways, CDNs, autoscaling, rate limiting.
3. Data: SQL vs NoSQL, indexing, replication, sharding, consistent hashing, CAP and PACELC, consistency models, transactions and isolation, caching strategies and invalidation.
4. Communication: REST, gRPC, GraphQL, WebSockets and SSE, message queues, Kafka and event streaming, pub/sub, idempotency, delivery guarantees.
5. Distributed systems: consensus and leader election, distributed locks, saga and outbox, microservices vs monolith, service discovery, circuit breakers, retries and backoff.
6. Reliability and operations: observability, deployment strategies, disaster recovery, security and authentication, multi-region design.
7. Case studies, each worked end to end with estimates and trade-offs: URL shortener, rate limiter, news feed, chat system, notification system, video streaming, search autocomplete, ride sharing, payment system, distributed file storage.
Also add a track overview with a roadmap, and interview questions for the track in the interview data.

Commit one page per commit, in order. 8 GB laptop: no npm run build, pagefind or full Playwright. Run typecheck, check:links and targeted vitest, and test each RunnableCode snippet in Python. agy is running too. Do NOT push; after each section of the list above, stop committing only long enough to report what is ready, then continue. I review and ship.
