# AGENTS.md — NeuralMastery Autonomous Agent Operating Contract

> **Scope**: This document defines the mandatory operating contract for all AI agents (Antigravity, Codex, Claude Code, Gemini CLI, Cursor, etc.) working on the `neuralmasteryai` codebase (`platform-vite`).
> **Authority**: Absolute. Every agent turn must satisfy the invariants defined herein.

---

## 0. Mandatory Pre-Flight & Multi-Agent Tracker Protocol

Before modifying ANY file in this repository:
1. **Check `AGENT_TRACKER.md`**:
   Read [`AGENT_TRACKER.md`](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite/AGENT_TRACKER.md) in the root. Verify that no other agent is actively modifying your target files.
2. **Log Your Active Session**:
   Add a new entry with your Agent Name, target files, objective, and set status to `IN_PROGRESS`.
3. **Activate Skill**:
   Consult the mandatory skill at `.agents/skills/agent-tracker/SKILL.md`.
4. **Validate Tracker**:
   Run `npm run check:tracker` to ensure tracker syntax and integrity are valid.
5. **Update on Completion**:
   When all 4 verification layers pass, update your entry to `COMPLETED` with the commit hash and notes.

---

## 1. Identity & Architectural Vision

**NeuralMastery** (`neuralmasteryai.com`) is the premier interactive learning platform for AI Engineering, Deep Learning, and Autonomous Systems.

The codebase is built on:
- **Core Framework**: React 18 + TypeScript + Vite + Tailwind/Custom CSS Tokens.
- **Content System**: MDX (`@mdx-js/react`) with custom React pedagogical components and interactive SVG visualizations.
- **In-Browser Execution**: WebAssembly Pyodide runtime (`RunnableCode`) executing real Python code client-side.
- **Search & Static Generation**: Pagefind headless indexing over 1,800+ prerendered static routes.

---

## 2. The Golden Invariant: Zero Premature Victory

Autonomous models are prone to **Premature Victory**: claiming a task is complete based on an intent to fix rather than empirical verification.

### Mandatory Rules:
1. **Never declare victory without empirical proof**:
   You must NEVER say *"I have completed the task and all tests pass"* unless you have just executed the actual verification commands and observed an exit code of `0`.
2. **Never hide, skip, or weaken tests**:
   Never alter assertions or delete test cases to manufacture an artificial pass. If a test fails, diagnose the root cause and fix the underlying implementation.
3. **The 4-Layer Verification Gate**:
   Before asking for user sign-off or pushing commits, execute:
   - **Layer 1: Typecheck**: `npm run typecheck` (`tsc -b` must exit 0).
   - **Layer 2: Internal Links**: `npm run check:links` (0 broken internal prose or anchor links).
   - **Layer 3: Unit Tests**: `npx vitest run` (or targeted test suites in `src/lib/` or `src/components/`).
   - **Layer 4: Static Build**: `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (dist/ generated with 0 errors).

---

## 3. Voice, Tone & Content Authoring Standards

Content in NeuralMastery is written with **first-party authority**:

### Content Rules:
1. **Direct, Authoritative First-Party Voice**:
   - **DO**: *"We engineer our reference harness in Python 3.12..."*, *"In this chapter, we derive the multi-head attention projection matrices..."*
   - **DON'T**: *"Unlike other tutorials on the internet..."* or *"Early developer tutorials used Node.js, but we decided to use Python..."*
2. **Zero Apologetic / Meta Comparisons**:
   Never write reactive commentary comparing NeuralMastery to competitor websites, YouTube videos, or early blog posts. Teach concepts from first principles, production reality, and research papers (OpenAI, Anthropic, Google DeepMind, Meta).
3. **Explain the "Why" Before Code**:
   Never present code without motivating the underlying systems-level or mathematical trade-off (e.g. why attention variance scales with $\sqrt{d_k}$, why userspace mount namespaces prevent path traversal, why context anxiety emerges at 70% token capacity).

---

## 4. Visual Density: The "Attention & Transformers" Benchmark

The gold standard for educational pages in this repository is [`src/content/docs/deep-learning/attention-transformers.mdx`](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite/src/content/docs/deep-learning/attention-transformers.mdx).

Every major learning chapter must maintain this standard:

| Component | Purpose & Placement |
| :--- | :--- |
| `<ELI5>` | **Mandatory at top of page**: Plain-English intuition before diving into technical derivations. |
| `<PredictFirst>` | **Active Recall Challenge**: Placed before counter-intuitive revelations or surprising failure modes. Forces the reader to predict the outcome before seeing the answer. |
| Dedicated Interactive Visualizers | **Step-Through SVG Diagrams**: Featuring playback buttons, step toggles, or parameter sliders using `useVizTokens()`. Never rely on static ASCII art alone when an interactive diagram can be built. |
| `<RunnableCode>` | **Live In-Browser Python**: Executable Pyodide code snippets allowing learners to run, modify, and inspect actual output in the browser. |
| `<GoDeeper title="...">` | **Advanced Systems / Math Proofs**: Expandable accordions for formal derivations, kernel internals, or asymptotic bounds. |
| `<NotebookCallout color="...">` | **Color-Coded Invariants**: Amber (`color="amber"`) for critical warnings, Blue (`color="blue"`) for core takeaways, Green (`color="green"`) for architectural heuristics. |

---

## 5. UI, Diagram & Token Architecture

All interactive visualizations in `src/viz/` must obey the design token system:

1. **Use Viz Tokens**:
   Always import and use `useVizTokens()` from `src/theme/vizTokens.ts`.
   ```tsx
   import { useVizTokens } from '../../theme/vizTokens';
   const t = useVizTokens();
   // Use t.surface, t.surfaceAlt, t.border, t.textPrimary, t.textSecondary, t.accentPrimary, etc.
   ```
2. **Accessible Contrast & Reduced Motion**:
   - Never hardcode fixed dark/light hex codes (`#000`, `#fff`, `#333`) where theme tokens exist.
   - Respect user preferences using `usePrefersReducedMotion()` from `src/viz/primitives`.
3. **Container Layouts**:
   Wrap interactive diagrams in `<VisualizationContainer footer="...">` and use `<VisualizationHeader>` and `<PillSelect>`.

---

## 6. Memory & Environment Execution Guidelines

1. **Node.js Heap Allocation**:
   The repository contains 1,835+ MDX routes. Running Vite or Rollup without expanded heap will result in `JavaScript heap out of memory` (Exit code 134).
   - **Always prepend**: `NODE_OPTIONS="--max-old-space-size=8192"` to all `npm run build` commands.
2. **Metadata Regeneration**:
   When adding, removing, or renaming MDX files or category JSONs:
   - Run: `node scripts/generate-page-meta.mjs`
   - Check taxonomy in `src/data/sectionMeta.ts` if adding a new track.
3. **Playwright & Container Sandboxing**:
   Playwright tests and Pagefind prerendering rely on Chromium. Ensure no zombie browser instances linger in the background.

---

## 7. Git & Deployment Lifecycle

1. **Production Branch**:
   The `main` branch automatically builds and deploys to production GitHub Pages via `.github/workflows/deploy.yml`.
   - Never push non-passing builds or broken links to `main`.
2. **Atomic Commits**:
   Commit related changes together with descriptive conventional commit messages:
   - `feat(harness-engineering): ...`
   - `fix(viz): ...`
   - `docs(agents): ...`
3. **External Pull Requests**:
   Always inspect external contributor PRs with diligence. If the repository maintainer requests to leave a PR unmerged, leave it untouched.

---

## 8. In-Browser Python Execution & The Indentation Trap

When embedding interactive Python code via `<RunnableCode code={\`...\`} />`, understand the underlying execution architecture:

### The Pyodide Worker Indentation Trap:
1. **The Architecture**:
   `src/workers/pyodideWorker.ts` executes client-side Python in a dedicated Web Worker via Pyodide. To capture `stdout` and isolate execution errors, the worker wraps submitted code inside a Python `try:` block:
   ```ts
   const wrapped = CAPTURE_PREAMBLE + indent(msg.code) + CAPTURE_POSTAMBLE;
   ```
   The `indent()` helper prepends 4 spaces (\`'    ' + line\`) to **every single line** of the code payload before execution.

2. **The Root Cause of \`IndentationError: unexpected indent\`**:
   If a Python snippet defines a multi-line string literal (e.g. \`code_snippet = """class Foo:\\n    pass"""\`) and then passes that variable to \`ast.parse(code_snippet)\` or \`compile(code_snippet)\`:
   - The worker indents all lines inside the multi-line string literal by 4 spaces.
   - When \`ast.parse()\` compiles the string as a standalone module, line 2 begins with unexpected leading whitespace.
   - CPython immediately raises:
     ```
     File "<unknown>", line 2
         class Foo:
     IndentationError: unexpected indent
     ```

3. **The Mandatory Invariant**:
   Whenever Python code inside \`<RunnableCode>\` parses an embedded multi-line string using \`ast.parse()\`, \`compile()\`, or \`exec()\`, **ALWAYS** import \`textwrap\` and clean the code first:
   ```python
   import ast
   import textwrap

   # Strip any leading indent injected by editor or worker wrapper
   clean_code = textwrap.dedent(source_code).strip()
   tree = ast.parse(clean_code)
   ```

4. **RunnableCode Operational Invariants**:
   - Every snippet embedded in \`<RunnableCode>\` MUST be tested to ensure it runs to completion with zero uncaught exceptions in Pyodide.
   - Rely strictly on Python standard library modules (\`ast\`, \`textwrap\`, \`re\`, \`json\`, \`hashlib\`, \`dataclasses\`, \`typing\`) or preloaded Pyodide packages (\`numpy\`).
   - Do not require outbound network calls inside browser Pyodide without explicit fallback handling.

## 9. Human-centered visual learning

For blog, lab, interview, and educational visualization changes, read and apply [the visual learning skill](.agents/skills/visual-learning/SKILL.md). Teach mechanisms with contextual diagrams and experiments; write instructions for human learners. `/labs` is the discovery destination; existing `/practice/...` exercise links remain compatible.
