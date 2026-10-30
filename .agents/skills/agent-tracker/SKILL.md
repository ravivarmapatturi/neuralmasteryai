---
name: agent-tracker
description: >-
  Mandatory pre-flight and task-tracking protocol for any AI agent working on the
  neuralmasteryai codebase. Requires reading and logging active work in AGENT_TRACKER.md,
  verifying file locks, executing the 4-layer verification gate, and recording hand-off notes.
---

# NeuralMastery Agent Tracker & Hand-off Skill

This skill defines the mandatory protocol for multi-agent coordination, hand-offs, and verification in the `neuralmasteryai` platform repository.

Any AI agent (Antigravity, Claude Code, Codex, Gemini CLI, Cursor, etc.) operating in this codebase must execute this procedure before and after modifying files.

---

## 1. Mandatory Pre-Flight Check (Phase 1)

Before you edit, create, or delete any files:

1. **Read `AGENT_TRACKER.md`**:
   Read `/AGENT_TRACKER.md` in the root of the repository.
2. **Check for Active Collisions**:
   Inspect the active task board. If another agent is actively modifying your target files with status `IN_PROGRESS` or `CLAIMED`, do not overwrite their work without coordination.
3. **Register Your Task**:
   Append a new entry to the active table in `AGENT_TRACKER.md`:
   - **Timestamp**: Current local timestamp (ISO format, e.g. `2026-10-30T10:40:00+05:30`)
   - **Agent Name**: Your agent identifier (`Antigravity`, `Claude-Code`, `Codex`, `Gemini-CLI`, etc.)
   - **Session ID / Branch**: Current working branch (e.g. `main` or working branch)
   - **Target Files / Feature Area**: Paths of files you will modify
   - **Task Objective**: Concrete 1-sentence goal of the session
   - **Status**: Set to `IN_PROGRESS`
   - **Verification Gate**: Set to `Pending verification`
   - **Summary & Notes**: Initial plan or scope notes
4. **Run Tracker Validation**:
   ```bash
   node scripts/check-agent-tracker.mjs
   ```

---

## 2. In-Flight Execution (Phase 2)

1. **Follow `AGENTS.md` Invariants**:
   - Write strictly in direct, authoritative first-party voice ("we", zero apologetic or competitor comparisons).
   - Meet the "Attention & Transformers" benchmark: `<ELI5>`, `<PredictFirst>`, `<RunnableCode>`, interactive diagrams using `useVizTokens()`.
   - Prevent Pyodide indentation traps: always wrap multi-line strings passed to `ast.parse` with `textwrap.dedent(code).strip()`.
2. **If Blocked**:
   If you hit an environmental or requirements blocker, update your status in `AGENT_TRACKER.md` to `BLOCKED` with detailed diagnostic notes explaining what is needed.

---

## 3. Post-Flight Verification & Hand-off (Phase 3)

Never claim completion without executing the 4-layer verification gate:

1. **Execute Verification Commands**:
   ```bash
   # Layer 1: Typecheck
   npm run typecheck

   # Layer 2: Link Integrity
   npm run check:links

   # Layer 3: Unit Tests
   npx vitest run src/lib/contentTree.test.ts

   # Layer 4: Static Build (Memory Cap 8192)
   NODE_OPTIONS="--max-old-space-size=8192" npm run build
   ```
2. **Update Tracker Entry to `COMPLETED`**:
   Once all layers pass, edit your row in `AGENT_TRACKER.md`:
   - Change `Status` from `IN_PROGRESS` to `COMPLETED`.
   - Update `Verification Gate` to `Typecheck, Links, Tests, Build (Passed)`.
   - Add the git commit SHA and high-level summary to `Summary & Notes`.
3. **Run Final Sanity Check**:
   ```bash
   node scripts/check-agent-tracker.mjs
   ```
