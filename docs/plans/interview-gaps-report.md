# Interview gaps plan: implementation report

**For:** Claude, plan owner  
**Plan:** `docs/plans/interview-gaps-2026-11.md`  
**Branch:** `interview-gaps` in `platform-vite-gaps`  
**Status:** Ready for Claude review; not pushed

## Shipped

Batch 1 adds 25 senior scenario questions to the `/interview` practice bank: distributed training (6), agent actions and permissions (6), GPU capacity and fairness (5), governance and audit (4), and agent termination and loop prevention (4). The records use the established dictionary schema in `src/data/interviewSeniorQuestions.json`, with hand-authored `keyPoints`, follow-ups, wrong answers, trade-offs, and Learn links. The practice projection and count are regenerated to 942 questions.

The plan's seven named runnable coding questions already existed and were verified without duplication or edits. They remain mapped to their existing practice problems and worker test cases.

During review, three follow-up passes corrected an extra numeric key on the new records, unsupported numeric claims and technical overstatements, answer lengths at or above 200 words, and the count test's tuple-only assumptions. The count test now supports legacy tuple and new dictionary records while retaining its coverage. The last pass made the 3D-parallelism answer determinate by stating the required pipeline degree in the scenario and removed an uncited hash algorithm detail.

## Commits on this branch

| Commit | Change |
| --- | --- |
| `dfb7f16f` | Plan review and Batch 1 implementation brief |
| `63336de2` | Initial 25 senior scenario questions and Learn links |
| `acff6dfb` | Review fixes to schema and technical claims |
| `ed8f5ac5` | Mixed-shape count test support and answer-length fixes |
| `1de1261e` | Final 3D mapping and lineage precision fixes |

No changes were pushed. The worktree was clean after the last implementation commit; this report is the remaining documentation change.

## Verification

All reported commands completed with the shown result. Agy ran potentially heavy checks sequentially through `flock /tmp/nm-heavy.lock`.

- `python3 -I scripts/practice/sets/build.py --check` — passed; all 9 problem sets verified.
- `npm run check:criteria` — passed; 259/259 catalog questions, 0 problems.
- `npm run generate:interviews -- --check` — passed; MDX interview catalog was current.
- `python3 -I scripts/interview/build_practice_data.py` — passed; generated 942 practice questions and matching count.
- `npm run typecheck` — passed.
- `npm run check:links` — passed; 1,978 MDX files scanned, no broken prose or anchor links.
- `npx vitest run src/data/interviewCounts.test.ts` — passed after the test was updated for both source shapes; 2/2 tests.
- `npx vitest run src/components/interview/` — passed; 9 suites, 55 tests.
- `npm run check:tracker` — passed.
- Final independent data check — passed; 25 unique records in the specified allocation, allowed schema keys only, 3–5 key points per record, every answer under 200 words, 25 existing Learn mappings, all linked MDX routes present, and generated practice/count totals both 942.
- `git diff --check` — passed.

The full production build was not run. The laptop had about 2 GB available, below the repository's 5 GB minimum for `npm run build`; this data-only batch's typecheck, focused tests, and links checks passed.

## Open decisions for Claude

1. The GPU quota/fairness questions link to the closest existing AI cost and production reliability Learn pages. The governance/audit questions link to existing governance and observability pages. The repository has no dedicated Learn page for either topic. Decide whether to commission those pages separately.
2. The plan's second batch lists eleven thin themes without target counts or acceptance criteria. This work did not add those themes. Set the scope in a separate plan before assigning that batch.

No unresolved implementation or test failures remain in Batch 1.
