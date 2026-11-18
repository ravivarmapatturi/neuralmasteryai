# Live Visuals Rollout — agy Lane Report

Tracking motion rationale and verification notes for each diagram in `docs/plans/live-visuals-agy.md`.

## Batch 1: Agents Foundations & Core

Pages covered:
- `src/content/docs/agents/a2a/overview.mdx`
- `src/content/docs/agents/agent-architectures.mdx`
- `src/content/docs/agents/agent-fundamentals.mdx`
- `src/content/docs/agents/agentic-coding-assistants.mdx`
- `src/content/docs/agents/browser-automation.mdx`
- `src/content/docs/agents/computer-use.mdx`
- `src/content/docs/agents/context-engineering.mdx`
- `src/content/docs/agents/loops-and-graphs.mdx`

### Motion Rationales:
1. `AgentCardDiagram`: Autocycles through manifest schema fields (capabilities, auth, endpoints) highlighting active card section and details.
2. `CrossOrgInteropDiagram`: `FlowDots` stream outbound across the trust boundary during request, and return on response; `PulseRect` highlights the active security gate / verification proxy.
3. `DelegationSequenceDiagram`: `FlowDots` travel down the active message exchange lifeline between client, orchestrator, and specialist agent; step cycle auto-advances.
4. `McpVsA2aScopeDiagram`: Left pane animates linear tool calls to local MCP server; right pane animates agent-to-agent negotiation across organizations.
5. `TaskLifecycleDiagram`: `FlowDots` transition along state edges (`submitted` -> `working` -> `completed`/`failed`); `PulseRect` marks active task status.
6. `AgentEvolutionDiagram`: `FlowDots` traverse progression from simple prompt wrapper to autonomous multi-agent hierarchy; `PulseRect` tracks selected architectural era.
7. `CoordinationPatternsDiagram`: In Hierarchical, pulses cascade down from manager to workers simultaneously; in Peer-to-peer, pulses cycle bidirectionally between mesh nodes; in Blackboard, worker pulses converge on the central shared state.
8. `HumanInTheLoopDiagram`: Auto-advances across HITL approval modes (passive monitor, active approval, post-hoc review) demonstrating human intervention gates.
9. `MemoryAsRetrievalDiagram`: `FlowDots` write user turn to vector store on ingestion, then stream top-k retrieved documents back to system prompt on query.
10. `ShortTermVsLongTermMemoryDiagram`: `FlowDots` stream down into long-term episodic store, and rise back into immediate working context on semantic retrieval.
11. `AgentLoopDiagram`: `FlowDots` circulate around the decision -> tool call -> tool result -> decision loop, branching to final answer when done.
12. `ArgumentSchemaValidationDiagram`: Steps through strict vs flexible JSON schema validation passes, highlighting type mismatches and coercion.
13. `ChatbotVsAgentDiagram`: Chatbot demonstrates simple linear input-to-output path; Agent demonstrates continuous circular execution loop with tool invocation and observation feedback.
14. `ContextWindowBudgetDiagram`: Autocycles conversation turns slider, visualizing progressive token accumulation, tool payload overhead, and system prompt compaction.
15. `ToolCallAnatomyDiagram`: Autocycles between tool function declaration, JSON argument payload, and environment execution response.
16. `ToolCallTraceDiagram`: Advances through execution trace frames, highlighting active tool execution and latency telemetry.
17. `AgenticCodingLoopDiagram`: `FlowDots` traverse loop from spec -> code edit -> unit test execution -> lint/error analysis -> fix iteration.
18. `CodingAgentSafetyModelDiagram`: `FlowDots` flow safely through containment sandbox and checkpoint rollback barriers before applying filesystem changes.
19. `OversightSpectrumDiagram`: `Pulse` glides along the spectrum from full manual control through supervised autonomy to unsupervised background worker.
20. `VerificationLayersDiagram`: Steps downward through progressive verification gates (typecheck -> unit tests -> integration tests -> security audit).
21. `BrowserAgentActionDiagram`: Auto-advances loop through DOM tree extraction, interactive element identification, synthesized keyboard/mouse event dispatch, and DOM delta observation.
22. `ComputerUseLoopDiagram`: Cycles through screen capture, OCR/coordinate inference, OS input dispatch, with a deliberate pause on high-consequence system actions.
23. `ContextEngineeringStrategiesDiagram`: Cycles through 4 prompt compression & context engineering strategies (scratchpad, summarization, pruning, selective retrieval).
24. `LoopGraphAnatomyDiagram`: Parallel `FlowDots` dispatch from graph router to parallel worker nodes simultaneously, then converge into aggregation evaluator node.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 24 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-1/`.
