# Communication, Distributed Systems, and Reliability verification

2026-11-09, branch `software-system-design`. No push. `git fetch origin` and `git merge origin/main` ran; main was already current.

## Delivered pages

Communication: REST; gRPC; GraphQL; WebSockets and SSE; message queues; Kafka and event streaming; publish/subscribe; idempotency; delivery guarantees.

Distributed Systems: consensus and leader election; distributed locks; sagas and outbox; microservices versus monolith; service discovery; circuit breakers; retries and backoff.

Reliability: observability; deployment strategies; disaster recovery; security and authentication; multi-region design.

Each of these 21 topic pages has over 2,000 words after removing frontmatter, imports, runnable/fenced code, and sources; the count includes narrative tables. Each contains ELI5, a topic-specific interactive calculation, two runnable Python experiments with Try-it edits, a prediction challenge, an advanced explanation, operational commands/configuration where relevant, failure analysis, trade-off tables, and primary references. Additional prose traces each topic's specific recovery/authority boundary. Descriptions are populated in frontmatter and generated route metadata.

The three old section URLs are short overviews. Their original titles and every original H2 remain, preserving heading anchors. Each links to every corresponding new topic. The overall track now has 42 expanded topic pages across all six sections.

## Checks observed passing

- `npm run typecheck`: exit 0.
- `npm run check:links`: 1,967 docs, 2,120 valid routes; no broken prose or anchor links. The checker retains its existing advisory about approximate math-heading IDs on the attention page.
- `npm run check:mdx`: 1,993 MDX files compiled, zero failures.
- Final targeted Vitest: 22 files, 27 tests passed, covering all 21 new topic experiments and the existing software-system-design suite.
- `python3 scripts/verify-system-design-python.py`: all 104 current track snippets passed directly and under the worker indentation wrapper, with matching output.
- `node scripts/verify-system-design-topics.mjs <topic slugs>` ran in sequential batches for all 21 topics. Both Run buttons were pressed in the real browser in both themes: 84 successful Pyodide executions. The browser checks also exercised keyboard controls, 375px and 1440px geometry, and console/page errors. All batches passed before the final prose-only additions; no Python or diagram code changed afterward.
- The final three topics' browser batch covered disaster recovery, authentication/authorization, and multi-region design in both themes and widths. Their six actual snippets produced the expected output with no traceback.
- `node scripts/verify-system-design-overviews.mjs communication distributed-systems reliability`: all topic links, preserved H2 headings, both themes and both widths passed. One initial run inspected a lazy route before its headings arrived; a complete unchanged rerun passed all six route/theme combinations.
- All 21 mobile light-theme diagram screenshots were visually reviewed in contact sheets; representative dark desktop and light mobile diagrams were also opened individually. Labels and numeric axes were legible.
- Writing-voice banned-phrase scan: zero hits in all 21 topics and three overviews. `git diff --check` passed.

Build, Pagefind, full Vitest, and full Playwright were intentionally not run under the brief's 8 GB machine restriction. The check set is scoped accordingly; no claim of a full production build is made. Operational etcd/Kubernetes/provider examples were not deployed to a real cluster or account. The executable learning experiments were tested as described above.

The earlier unrelated shared navbar streak overflow remains recorded in topic-expansion.md; no shared navigation code changed here. Temporary screenshots and browser outputs are under `/tmp/system-design-topics`, outside Git. The focused scripts and overview manifest are retained in the repository for repeatability.

## Page commits

Initial topics were committed in brief order, with one learning page per commit. Final depth/description corrections also use one page per commit. The Reliability overview and this evidence are recorded in the closing commit.

```text
18970c33 docs(system-design): teach REST conditional updates
c262ed90 docs(system-design): propagate gRPC deadlines and bounded streams
41d880d5 docs(system-design): bound GraphQL resolver work
8d3848c8 docs(system-design): recover WebSocket and SSE streams
6581d443 docs(system-design): define queue acknowledgement boundaries
1e3b3bfa docs(system-design): trace Kafka offset and effect commits
e743b96c docs(system-design): distinguish subscriptions from workers
3549d19e docs(system-design): bind durable identity to effects
9ccf1f08 docs(system-design): scope delivery and exactly-once effects
b32cad40 docs(system-design): retain communication as a linked overview
0e355ceb docs(system-design): separate election from consensus commitment
a8999413 docs(system-design): fence stale distributed lock owners
234fa100 docs(system-design): persist saga recovery and outbox intent
62c06cda docs(system-design): choose modular and service boundaries
be603ec2 docs(system-design): trace stale service discovery
3f2e4ca4 docs(system-design): bound breaker admission and recovery probes
362d77b5 docs(system-design): bound retries backoff and amplification
11d723d2 docs(system-design): retain coordination as a linked overview
26e2b277 docs(system-design): connect observability to user outcomes
9d5fd22d docs(system-design): test release cohorts and reversible state
7cd6cd18 docs(system-design): verify disaster recovery boundaries
dd12edee docs(system-design): explain authentication and resource authorization
e01e1f5e docs(system-design): develop multi-region ownership and recovery
68490783 docs(system-design): deepen rest recovery mechanisms
0598bfec docs(system-design): deepen grpc recovery mechanisms
56978334 docs(system-design): deepen graphql recovery mechanisms
9bdc7952 docs(system-design): deepen websockets-and-sse recovery mechanisms
b7ec81e8 docs(system-design): deepen message-queues recovery mechanisms
dfc8f350 docs(system-design): deepen kafka-and-event-streaming recovery mechanisms
0121fda9 docs(system-design): deepen publish-subscribe recovery mechanisms
381d7898 docs(system-design): deepen idempotency recovery mechanisms
fcf9dec7 docs(system-design): deepen delivery-guarantees recovery mechanisms
86fe7535 docs(system-design): deepen consensus-and-leader-election recovery mechanisms
7ce5dfc7 docs(system-design): deepen distributed-locks recovery mechanisms
57ad4efb docs(system-design): deepen sagas-and-outbox recovery mechanisms
2339766f docs(system-design): deepen microservices-vs-monolith recovery mechanisms
168b67a0 docs(system-design): deepen service-discovery recovery mechanisms
13c6c9e5 docs(system-design): deepen circuit-breakers recovery mechanisms
278996b1 docs(system-design): deepen retries-and-backoff recovery mechanisms
5c0c2f37 docs(system-design): deepen observability recovery mechanisms
28a404b5 docs(system-design): deepen deployment-strategies recovery mechanisms
02e4a43d docs(system-design): deepen disaster-recovery recovery mechanisms
5d9370c0 docs(system-design): deepen security-and-authentication recovery mechanisms
5e697a61 docs(system-design): deepen multi-region-design recovery mechanisms
```
