# Software system design verification

The brief is implemented as seventeen track pages: a roadmap, six core chapters, and ten separate worked designs. Eighteen questions are added through the existing MDX interview-bank exporter, with hand-written criteria, follow-ups, scenario context, and teaching routes. The taxonomy places the track under Systems & Infrastructure.

## Coverage and reuse

| Brief section | Page | Main decision |
| --- | --- | --- |
| Foundations | `foundations.mdx` | Requirements, estimates, latency distributions, SLOs, failure capacity |
| Scaling | `scaling.mdx` | Vertical/horizontal growth, statelessness, L4/L7 routing, gateways, CDN, autoscaling, admission |
| Data | `data.mdx` | Access paths, replication, sharding, consistent hashing, CAP/PACELC, consistency, isolation, invalidation |
| Communication | `communication.mdx` | REST/gRPC/GraphQL, SSE/WebSockets, queues/logs, pub/sub, delivery and idempotency |
| Distributed systems | `distributed-systems.mdx` | Consensus/elections, fencing, outbox, saga, service boundaries, discovery, retries and breakers |
| Reliability | `reliability.mdx` | Outcome telemetry, compatible deployment, restore, identity boundaries, regional ownership |
| Cases | Ten separately committed pages | Short links, limiter, feed, chat, notifications, video, autocomplete, rides, payments, files |

The pages link existing API/protocol, networking, PostgreSQL, database, caching, tracing, and ML design material. ML recommendation ranking remains owned by the existing ML case studies. New prose concentrates on software request paths, durable ownership, and failure behavior.

All workload figures are explicit illustrative inputs, calculated quantities, or named objectives. They are not production benchmarks. The NGINX and SQL excerpts are configuration/query examples checked against the linked documentation; no proxy/database deployment or real provider integration was performed.

## Executed checks

- `npm run typecheck`: exit 0.
- `npm run check:links`: exit 0; 1,925 MDX documents, no broken prose or anchor links. The checker retains its existing advisory about the attention page's math-derived anchor.
- `npm run check:mdx`: exit 0; 1,951 files, zero failures.
- `npm run generate:interviews -- --check`: exit 0; 259 questions, 14 guides.
- `npm run check:criteria`: exit 0; 259 of 259 covered, zero problems.
- Scoped Vitest command below: exit 0; six files and 44 tests passed.
- `python3 scripts/verify-system-design-python.py`: exit 0; all 32 snippets pass directly and under the worker's indentation contract, with identical outputs.
- Real browser Pyodide: 32 snippets in each theme, 64 successful executions. These use the actual Run buttons and worker, without substituting Python output.
- Final browser geometry/control pass: all 17 routes in both themes, at 375px and 1440px. No horizontal overflow, page errors, console errors, or detected sequence-label collisions. Keyboard input exercises the new mode controls and sliders. Case controls switch normal/failure paths; prediction widgets reveal explanations.
- Interview UI: topic filter, scenario context, typed answer, question-specific rubric, teaching link, and topic index passed in both themes. Mobile and desktop captures were taken.
- Banned-phrase search and `git diff --check`: no findings.

```bash
npx vitest run \
  src/viz/diagrams/softwareSystemDesign.test.tsx \
  src/data/sectionMeta.test.ts \
  src/components/InterviewPage.test.tsx \
  src/components/interview/InterviewTopicPages.test.tsx \
  src/lib/contentTree.test.ts \
  src/lib/interviewSearch.test.ts
```

An existing interview test expected thirteen guides. Its count assertion now expects fourteen, and a new test verifies this bank's context, specific criteria, and source route. No existing behavioral assertion was removed.

## Reproduce the browser checks

Start `npx vite --host 127.0.0.1 --port 5217`, then run:

```bash
node scripts/verify-software-system-design.mjs
```

The default run executes all Python blocks, controls, viewport checks, captures, and the interview flow in both themes. `SYSTEM_DESIGN_SKIP_PYTHON=1` reruns layout/controls using previously verified code; `SYSTEM_DESIGN_SKIP_TRACK=1` reruns only the interview flow. `SYSTEM_DESIGN_THEMES=dark` restricts the theme. Output defaults to `/tmp/software-system-design`; screenshots remain outside git.

The first audit locator depended on the Run button's changing label and was corrected to use the stable block container. A later full-page capture timed out; the final audit uses viewport and diagram captures. The final successful records are retained here:

- `python-results.json`: direct CPython output and worker-wrapper exit codes.
- `pyodide-light.json`, `pyodide-dark.json`: real browser outputs; 17 routes and 32 blocks per file.
- `browser-geometry.json`: final controls, geometry, and console pass; 34 route/theme records. Python execution is explicitly false because this pass rechecked layout after diagram refinements.

Primary-source review included Google SRE, PostgreSQL isolation documentation, Kafka delivery semantics, the Raft paper, and Stripe's idempotency contract. Publisher access blocks were handled with author-hosted papers or project documentation where available; the Netflix article was accessible through browser search despite a direct HTTP-client block.

No build, pagefind, full Vitest suite, or full Playwright suite was run, as directed by the brief's laptop limits. These records establish the scoped checks above, not production deployment or load-test results. The task dev server and audit browsers were stopped. No push or deployment was performed.

## Page commits

| Page | Commit |
| --- | --- |
| Foundations | `6c01bc43` |
| Scaling | `cab2549e` |
| Data | `48b046af` |
| Communication | `b20b44cf` |
| Distributed systems | `1dd1ceb3` |
| Reliability | `a04a4d12` |
| URL shortener | `71f6fe7b` |
| Rate limiter | `0f74cdb4` |
| News feed | `27505331` |
| Chat | `13c6bf10` |
| Notifications | `78b6a552` |
| Video | `7d1ec13d` |
| Autocomplete | `8f3ecebd` |
| Rides | `be915ebb` |
| Payments | `24ca18c9` |
| File storage | `19f2c4bd` |
| Roadmap and metadata | `9144cfaa` |
| Interview bank | `3f91ab46` |
