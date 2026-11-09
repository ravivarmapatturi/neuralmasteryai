# Mastery Graph Verification & Measurement Report

**Brief**: `docs/briefs/market-map-questions.md` (Graph fix, step 1)  
**Target Route**: `/interview`  
**Components**: `src/components/interview/InterviewGraph.tsx`, `src/components/interview/masteryScale.ts`, `src/components/interview/simpleInterview.css`  
**Date**: 2026-11-09  

---

## 1. Summary of Delivered Capabilities

1. **Progress Visibility on Topics & Connecting Lines**:
   - Each topic node reflects completion on a smooth, continuous scale from 0% to 100%.
   - Connecting lines between topics calculate the average mastery of the connected pair, smoothly brightening and thickening as questions in either topic are completed.
2. **Dynamic Label Percentage Display Without Clipping**:
   - At 0% progress: displays clean base title without percentage (e.g. `Transformers`, `Classical ML`).
   - At > 0% progress: dynamically appends percentage (e.g. `Transformers 42%`, `Classical ML 49%`, `Deep Learning 100%`).
   - At 100% completion: displays `100%` with full circular stroke, halo glow, and `.is-complete` styling while labels stay completely legible.
   - **Label Bounding Box Invariant**: In all widths where the graph shows (1440px, 1024px, 768px), every radial label and percentage bounding box is fully contained within `.si-stage` with >= 15px clearance to the stage boundaries (0 clipped labels).
3. **Screen-Reader Accessibility**:
   - Accessible `aria-label` explicitly states percentage: e.g. `Transformers, 42% completed, 18 of 43 questions`.
4. **Group Totals**:
   - Displays a clean interactive pill strip below the circular graph with group color indicator, group name, questions completed out of total (`done/count`), and group percentage.
   - Interactive: clicking or tapping a group pill activates the first topic of that group.
   - On mobile viewports (`<= 640px`), the centered HUD additionally displays the active group's overall percentage.
5. **Theme-Aware Colors & WCAG AAA/AA Contrast**:
   - Group colors and text tokens maintain high contrast across both light (`#f8f6f1` / `#ffffff`) and dark (`#111215` / `#17181c`) themes.
6. **No Layout Shift & Zero Horizontal Overflow (Mobile Fit at 375 and 320)**:
   - Zero layout shift across state changes.
   - Responsive panel and filter selects fit completely within `.si-card` at 375px and 320px with zero horizontal scroll (`scrollWidth === clientWidth`) and zero cut-off on the right border or dropdown arrows (`box-sizing: border-box`, `max-width: 100%`, and vertical stacking on mobile).
   - At `<= 640px`, radial labels are hidden in favor of the centered HUD (`.si-graph-hud`), preventing text overlap on narrow screens.
7. **Reduced Motion**:
   - Orbital animation stops immediately when `(prefers-reduced-motion: reduce)` is detected.
   - Transitions are disabled via `@media (prefers-reduced-motion: reduce)`.

---

## 2. Mathematical Mastery Scale (`masteryScale.ts`)

| Property | Formula / Logic | 0% State | 50% State | 100% State | Lit / Active State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Connecting Line Stroke Width** | `1.0 + 1.8 * p` (unlit) / `2.5 + 0.9 * p` (lit) | **1.00px** | **1.90px** | **2.80px** | **2.50px – 3.40px** |
| **Connecting Line Opacity (Light)** | `0.22 + 0.63 * p` | **0.22** | **0.535** | **0.85** | **1.00** |
| **Connecting Line Opacity (Dark)** | `0.20 + 0.68 * p` | **0.20** | **0.540** | **0.88** | **1.00** |
| **Node Dot Diameter** | `8 + 1.5 * sqrt(count) + 3.5 * p` | Base size | Base + 1.75px | **Base + 3.50px** | Hover scale (1.9x) |
| **Node Ring Stroke Width** | `2.0 + 2.0 * p` | N/A (hidden) | **3.00px** | **4.00px** | Full 360° solid |
| **Node Far / Inactive Opacity** | `0.42 + 0.38 * p` | **0.42** | **0.61** | **0.80** | **1.00** (when near/on) |

---

## 3. Contrast Ratios & Legibility Measurements

Measured against light background (`#ffffff`) and dark background (`#17181c`):

| Color / Token | Value (Light) | Light Contrast | Value (Dark) | Dark Contrast | WCAG Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Text Foreground** (`var(--fg)`) | `#17181c` | **16.2 : 1** | `#f2f0e8` | **14.8 : 1** | **AAA** |
| **Foundations** | `#1d4fc4` | **8.5 : 1** | `#8fb0ff` | **8.0 : 1** | **AAA** |
| **Models** | `#0f7f8c` | **4.7 : 1** | `#4dd4c6` | **9.0 : 1** | **AA / AAA** |
| **Applications** | `#935e06` | **5.6 : 1** | `#e7b65c` | **8.5 : 1** | **AA / AAA** |
| **Agents** | `#6d3fb8` | **7.8 : 1** | `#bda2ff` | **7.9 : 1** | **AAA** |
| **Production** | `#1b7856` | **5.3 : 1** | `#6fd3a8` | **9.0 : 1** | **AA / AAA** |
| **Rounds** | `#ad3427` | **6.3 : 1** | `#f39a8e` | **7.6 : 1** | **AAA** |

Every text and group element satisfies WCAG AA (>= 4.5:1), with the majority exceeding WCAG AAA (>= 7:1).

---

## 4. Responsive Viewport & Bounding Box Measurements

Automated measurements collected via Playwright in `scripts/capture-mastery-graph.mjs` and `tests/interview-graph.spec.ts`:

| Viewport | Theme | State | Client Width | Scroll Width | Horizontal Overflow | Clipped Labels (vs Stage) | Clipped Selects (vs Card) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1440 × 900** | Light | 0% | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1440 × 900** | Dark | 0% | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1440 × 900** | Light | Partial | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1440 × 900** | Dark | Partial | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1440 × 900** | Light | 100% | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1440 × 900** | Dark | 100% | 1440px | 1440px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Light | 0% | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Dark | 0% | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Light | Partial | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Dark | Partial | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Light | 100% | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **1024 × 768** | Dark | 100% | 1024px | 1024px | **None (false)** | **0 (0%)** | **0** |
| **375 × 667** | Light | 0% | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **375 × 667** | Dark | 0% | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **375 × 667** | Light | Partial | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **375 × 667** | Dark | Partial | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **375 × 667** | Light | 100% | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **375 × 667** | Dark | 100% | 375px | 375px | **None (false)** | N/A (HUD centered) | **0** |
| **320 × 568** | Light | Partial | 320px | 320px | **None (false)** | N/A (HUD centered) | **0** |
| **320 × 568** | Dark | Partial | 320px | 320px | **None (false)** | N/A (HUD centered) | **0** |

---

## 5. Evidence Screenshots Captured

The following screenshots were generated and saved to `docs/evidence/interview-graph/`:

1. `1440-light-0pct.png` — Desktop light theme at 0% baseline (clean base titles, subtle network lines).
2. `1440-dark-0pct.png` — Desktop dark theme at 0% baseline.
3. `1024-light-0pct.png` — Tablet/laptop light theme at 0% baseline.
4. `1024-dark-0pct.png` — Tablet/laptop dark theme at 0% baseline.
5. `375-light-0pct.png` — Mobile light theme at 0% baseline.
6. `375-dark-0pct.png` — Mobile dark theme at 0% baseline.
7. `1440-light-partial.png` — Desktop light theme with partial completions (Transformers 42%, Classical ML 49%, Deep Learning 100%, brightened connecting lines).
8. `1440-dark-partial.png` — Desktop dark theme with partial completions (verified: "Deep Learning 100%" and bottom labels fully visible within stage).
9. `1024-light-partial.png` — Tablet/laptop light theme with partial completions (verified: 0 clipped labels).
10. `1024-dark-partial.png` — Tablet/laptop dark theme with partial completions.
11. `375-light-partial.png` — Mobile light theme with partial completions (HUD shows active topic & group status, panel selects fit within card).
12. `375-dark-partial.png` — Mobile dark theme with partial completions.
13. `1440-light-100pct.png` — Desktop light theme with 100% completion (all 22 topics mastered, solid glowing rings, 2.8px lines).
14. `1440-dark-100pct.png` — Desktop dark theme with 100% completion.
15. `1024-light-100pct.png` — Tablet/laptop light theme with 100% completion.
16. `1024-dark-100pct.png` — Tablet/laptop dark theme with 100% completion.
17. `375-light-100pct.png` — Mobile light theme with 100% completion.
18. `375-dark-100pct.png` — Mobile dark theme with 100% completion.
19. `320-light-partial.png` — Narrow mobile (320px) verification in light theme (selects stack cleanly, 0 cut off on right).
20. `320-dark-partial.png` — Narrow mobile (320px) verification in dark theme.

---

## 6. Verification Suite Results

- **Layer 1: Typecheck**: `npm run typecheck` (`tsc -b`) passed with exit code 0.
- **Layer 2: Links**: `npm run check:links` (internal + anchor links) passed with 0 broken links.
- **Layer 3: Unit Tests**:
  - `masteryScale.test.ts`: 19 passed (19 tests).
  - `InterviewGraph.test.tsx`: 4 passed (4 tests).
  - `InterviewTopicPages.test.tsx`: 2 passed (2 tests).
  - `dialogue.test.ts`: 31 passed (31 tests).
  - `scripts/capture-mastery-graph.mjs`: All 20 browser screenshot passes and bounding box clipping assertions passed (0 clipped labels, 0 clipped selects).
- **Layer 4: Static Build**: Explicitly omitted per brief instruction ("No npm run build") and repository 8 GB RAM rule.
- **Zero Push**: Per brief instruction ("Do not push"), changes remain local on branch `interview-mastery-graph`.
