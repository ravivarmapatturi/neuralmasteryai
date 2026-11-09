# System design canvas (C8)

The canvas appears while answering any question tagged for the system-design round. Add palette boxes, drag them, rename the selected box, or use arrow keys to move it. Draw arrow selects a source and destination; Enter works on each box. Delete removes a focused box and its incident edges. Escape exits arrow mode. Undo retains the last 50 edits; clear is undoable. Limits are 24 boxes and 48 arrows. There is no automatic sketch grade.

Done freezes the sketch on the attempt before asynchronous transcription and checking. The existing normalized attempt path carries it through local storage, account sync, merge and JSON backup restore. Review revisions retain the captured sketch. Earlier attempts expose a read-only saved sketch. Draft sketches are local React state and are not recovered after a reload before Done.

The answer screen shows the sketch beside a reference at desktop widths and stacks them on phones. Both diagrams remain view-only after answering. For questions outside the 15 reference entries, the screen explicitly says that a diagram is not yet available and points to the model answer. No reference is exposed before answering.

## Reference review

All 15 were authored after reading the entire corresponding model answer. Arrows encode only the request, data, rollout or dependency flow described there. Labels sometimes group steps to keep each view under nine boxes. Each entry stores an exact excerpt and SHA-256 of the full reviewed answer. Tests require a valid graph, the system-design tag, the excerpt and the full-answer hash, so answer edits trigger a review rather than silently leaving stale diagrams.

| Question ID | Diagram check against model answer |
| --- | --- |
| `repo:rag:design-rag-over-company-docs` | Compare retrieval quality weekly and check citations per turn. |
| `repo:system-design:drift-monitoring-design` | Warnings go to a dashboard after persistence and effect-size checks. |
| `repo:system-design:streaming-and-fallback` | Cache and retrieval failures degrade the response path; guardrail blocks return a clear message. |
| `repo:system-design:ab-test-prompt-rollout` | Keep each user on one prompt version while widening exposure. |
| `repo:system-design:batch-vs-online-serving-choice` | Two online replicas beat hourly batch cost under this answer’s stated traffic and freshness assumptions. |
| `repo:system-design:churn-model-system` | Validate lift over the rule, then use shadow and canary rollout. |
| `repo:system-design:feature-store-design` | Timestamped history prevents future values leaking into training. |
| `repo:system-design:public-demo-controls` | Reject cheaply before spending on inference; stable errors include hints and request IDs. |
| `repo:system-design:eval-platform-ship-gate` | Freeze numeric gates before the run and retain report and data hashes for replay. |
| `repo:system-design:batched-inference-api-budget` | Scale async servers behind a load balancer; inspect latency, cache hits, guardrails and request cost. |
| `repo:system-design:finetune-pipeline-design` | Version every stage config and record seeds, hashes, task benchmarks and serving cost. |
| `repo:system-design:fraud-check-100ms` | Use time-split training and monitor outcomes; blocked payments leave a label blind spot. |
| `repo:system-design:rag-service-company-docs` | Drop uncited claims; evaluate cross-repo retrieval, faithfulness and latency. |
| `repo:system-design:pipeline-rollback-plan` | Choose reruns by dependency and cost; replay promises the same headline metrics. |
| `repo:system-design:feedback-loop-clean-data` | Production decisions change future labels; retain uninfluenced data and log the intervention. |

## Verification

- Initial combined delivery + C8 browser run: 2/2 passed in 24.4s. The revised delivery count is 3 on the ten-word audio fixture; timing, long pause and reload/history assertions still pass.
- Final C8 browser run after visual corrections: 1/1 passed, 11.8s case runtime (13.8s including startup). This is test runtime, not product latency. It exercises real pointer dragging, keyboard movement and source/destination activation, clear/undo, hidden reference before Done, saved node/edge counts and reload/history persistence.
- Both themes at 375 and 1440: zero horizontal page overflow and zero node-label overflow, asserted in the browser. Nodes render at 12px with 3px padding, and all editing targets are at least 40px high. Desktop uses two diagram columns; mobile stacks them. Eight final canvas/reference captures were visually inspected in /tmp/nm-c8-browser-final2/. The theme button changes the actual React theme as well as CSS tokens.
- Visual review corrected inherited interview button padding/font size that squeezed labels on mobile, and routed arrows around intervening boxes. No page exceptions or inference-download requests were recorded in the controlled browser case.
- Unit coverage checks all 15 reference graphs against complete answer hashes, graph import validation, old attempts, JSON restore and late review merges, plus adding, renaming, keyboard movement, connections, deleting, undo, clear and read-only rendering.

Browser tests use deterministic inference workers, not model accuracy measurements. No physical microphone claim. Existing account sync uses the same normalized payload; no live signed-in account round-trip was measured. Unsaved drafts do not survive reload. Full final gate results follow below.

Final gates: typecheck, internal links, MDX compilation (2003/2003), criteria (259/259), and full single-worker Vitest (190 files / 911 tests, 254.73s) passed. The final source was unchanged throughout that gate. No banned writing phrases or whitespace errors. Production build preflight: free -g reports 2 GB available, below the hard 5 GB requirement, so no build was started. Heavy jobs ran sequentially with the unchanged 2048 MiB host floor, MemoryHigh=500M, MemoryMax=1800M, MemorySwapMax=6G and a 1536 MiB Node heap. Browser/dev-server jobs exited before the full gate. No push; MockInterviewPage.tsx unchanged.
