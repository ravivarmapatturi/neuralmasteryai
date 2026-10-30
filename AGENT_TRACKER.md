# NeuralMastery Agent Work Tracker & Dispatch Sheet

> **MANDATORY INVARIANT FOR ALL AGENTS**:
> Before starting ANY work in this repository, you **MUST**:
> 1. Read this tracker sheet (`AGENT_TRACKER.md`) and check active work to avoid collisions.
> 2. Register your agent name, your session timestamp, the exact task you are executing, and set status to `IN_PROGRESS`.
> 3. Verify that no other agent is actively modifying the same files or features.
> 4. Once your work passes the 4-layer verification gate (`npm run typecheck`, `npm run check:links`, `vitest`, `build`), update your row with `COMPLETED`, execution duration, and summary comments.
> 5. Never leave stale or untracked work in this codebase.

---

## Active & Historical Task Board

| Timestamp (ISO) | Agent Name | Session ID / Branch | Target Files / Feature Area | Task Objective | Status | Verification Gate | Summary & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-10-29T23:03:39+05:30` | `Antigravity` | `main` | `src/content/docs/harness-engineering/`, `src/viz/` | Build new Python Harness Engineering track with OpenAI/Anthropic patterns | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | 6 deep-dive chapters + 4 interactive diagrams committed in `8a376fe8`. |
| `2026-10-29T23:44:30+05:30` | `Antigravity` | `main` | `src/viz/diagrams/`, `src/content/docs/harness-engineering/` | Elevate Harness Engineering visual density to Attention & Transformers benchmark | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | Added SubprocessSandbox, InstructionBudget, AnthropicTriad, and OpenAIEntropy visualizers (`488887b0`). |
| `2026-10-29T23:49:31+05:30` | `Antigravity` | `main` | `AGENTS.md`, `src/content/docs/harness-engineering/` | Create root AGENTS.md contract and enforce first-party authoring standards | `COMPLETED` | Typecheck, Links (Passed) | Established repository-wide operating invariants and purged meta-commentary (`005c6316`). |
| `2026-10-30T00:18:04+05:30` | `Antigravity` | `main` | `AGENTS.md`, `overview.mdx`, `context-and-instruction-design.mdx` | Fix Pyodide worker multi-line string IndentationError with textwrap.dedent | `COMPLETED` | Typecheck, Links, Vitest (Passed) | Documented Section 8 in AGENTS.md; tested in Pyodide WASM runtime (`4137fedf`). |
| `2026-10-30T10:38:00+05:30` | `Antigravity` | `main` | `AGENT_TRACKER.md`, `.agent/skills/`, `scripts/` | Create automated agent tracker harness, validation CLI, and mandatory check skill | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | Established repository-wide agent tracker sheet, validation script, and .agents skill. |

---

## Status Definitions

- `CLAIMED`: Agent has reserved the task; preparing environment and inspecting files.
- `IN_PROGRESS`: Agent is actively writing code, tests, or content.
- `VERIFYING`: Agent is executing the 4-layer verification gate (`npm run typecheck`, `npm run check:links`, `vitest`, `build`).
- `BLOCKED`: Task encountered an obstacle (e.g. missing dependency or user question).
- `COMPLETED`: 100% of verification gates passed, changes committed, and summary logged.
- `ABORTED`: Task cancelled or rolled back.

---

## Agent Pre-Flight Checklist

Before writing any code or making edits:
- [ ] Read `AGENT_TRACKER.md` to ensure your target feature is not locked by another agent.
- [ ] Add your entry to the table above with status `IN_PROGRESS`.
- [ ] Read `AGENTS.md` to ensure full compliance with coding and content invariants.
- [ ] Run `node scripts/check-agent-tracker.mjs` to validate tracker format integrity.
