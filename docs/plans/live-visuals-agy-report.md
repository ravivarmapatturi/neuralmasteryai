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

## Batch 2: MCP, Multi-Agent & Orchestration Patterns

Pages covered:
- `src/content/docs/agents/mcp/overview.mdx`
- `src/content/docs/agents/mcp/protocol-deep-dive.mdx`
- `src/content/docs/agents/multi-agent-systems.mdx`
- `src/content/docs/agents/no-code-automation.mdx`
- `src/content/docs/agents/overview.mdx`
- `src/content/docs/agents/plan-and-execute.mdx`
- `src/content/docs/agents/reflection-self-critique.mdx`
- `src/content/docs/agents/routing-and-supervisor.mdx`

### Motion Rationales:
1. `McpArchitectureDiagram`: Autocycles through connected MCP servers (filesystem, GitHub, database); `FlowDots` stream along the active client-server RPC line and `PulseRect` highlights the active server card.
2. `McpCapabilityTypesDiagram`: Autocycles through Tools, Resources, and Prompts, highlighting the active capability type, description, and concrete production example.
3. `McpInAgentLoopDiagram`: Auto-advances through the 3 phases of an MCP-integrated loop (Agent reason -> MCP standardized tool call -> Result feedback into loop) with step transitions.
4. `McpLocalVsRemoteDiagram`: Autocycles between Local stdio subprocess and Remote Streamable HTTP server, emphasizing single-process vs multi-client network access.
5. `MxNIntegrationProblemDiagram`: In Custom mode, displays the messy $M \times N$ matrix of point-to-point connections; in Via MCP mode, `PulseRect` highlights the central MCP hub and parallel `FlowDots` stream simultaneously from apps into MCP and from MCP into downstream tools.
6. `TransportComparisonDiagram`: Cycles between stdio and Streamable HTTP, highlighting transport framing constraints and protocol requirements.
7. `OAuthAuthorizationFlowDiagram`: Steps sequentially down the 7-step RFC 8414 & PKCE authorization flow from initial 401 challenge through metadata discovery and token exchange to authenticated API requests.
8. `TokenAudienceBindingDiagram`: Cycles between forbidden token passthrough (confused deputy vulnerability) and separate audience-bound upstream token exchange with visual status glow.
9. `ToolCallFlowDiagram`: Cycles through the 5-step lifecycle (`tools/list` -> `LLM select` -> `tools/call` -> `server result` -> `client process`), tracking message flow.
10. `ToolErrorTypesDiagram`: Toggles between protocol-level JSON-RPC error format (-32602) and application-level tool execution failure (`isError: true` payload).
11. `ParallelAgentSpeedupDiagram`: Autocycles through 1 to 8 concurrent worker slots, animating the dynamic shrinkage of the greedy bin-packing makespan bar and calculating real wall-clock speedup.
12. `ClusterNodeAssemblyDiagram`: Autocycles through n8n AI Agent sub-node assembly combinations, transitioning from unrunnable root node to fully validated runnable agent when Chat Model and Tool sub-nodes attach.
13. `AgentFailureModesDiagram`: Steps through the 4 distinct agent failure modes (Tool misuse, Runaway loops, Context bloat, Coordination conflicts), mapping each to its specific root architecture layer.
14. `ArchitectureSpectrumDiagram`: Autocycles through ReAct, Plan-and-Execute, and Reflection; renders a breathing `Pulse` ring on the active 2D coordinate node (cost vs reliability).
15. `AutonomySpectrumDiagram`: Autocycles the autonomy slider from Read-only (0) through Full Autonomy (3); tracks slider head with a breathing `Pulse` on the spectrum line.
16. `PerceiveReasonActLoopDiagram`: Autocycles clockwise through Perceive, Reason, and Act; `FlowDots` travel smoothly along the quadratic bezier transition arcs while `Pulse` highlights the active loop stage.
17. `PlanExecuteReplanDiagram`: Steps through the 6-stage execution trace, highlighting plan generation, execution of steps 1-2, 404 failure detection, replanning insertion, substitute step execution, and successful completion.
18. `ReflexionLoopDiagram`: Advances through ALFWorld trial 1 failure and trial 2 success; streams `FlowDots` along active edge vectors between Actor, Evaluator, and Episodic Memory, pulsing the active node.
19. `RouterVsSupervisorDiagram`: Autocycles through Router pattern (single dispatch, unhandled question) then switches to Supervisor pattern (multi-turn inspection loop, full synthesis), showing step-by-step actor invocation and decision trace.

### Verification:
- Layer 1 (`tsc -b`): Clean (exit code 0).
- Layer 2 (`vitest run src/viz`): 84 files, 324 passed.
- Layer 3 (`check:notebook`): 0 violations.
- Layer 4 (Playwright screenshots): All 19 captured cleanly with 0 console/page errors in `docs/evidence/live-visuals/agy/batch-2/`.
