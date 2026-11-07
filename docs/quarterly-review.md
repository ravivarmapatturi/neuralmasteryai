# Quarterly review against TensorTonic and others

Every quarter, compare Neural Mastery with the strongest similar sites and turn the gaps into roadmap tasks. Next review due: **7 February 2027**.

## How to run it (about two hours)

1. Open the comparison sites in a clean browser, signed out: TensorTonic, and one or two others people mention to us (for example Deep-ML or a new entrant).
2. For each, look at: home page first screen, problem hub and one problem page, study plans or tracks, interview prep, leaderboard, changelog, search, mobile at 375px.
3. Do the same on neuralmasteryai.com, signed out, with the same steps.
4. Fill in the table below for this quarter: what they do better, what we do better, and the task it becomes.
5. Read the last 30 days of numbers: topic views (`GET https://visit-stats.ravivarmapatturi.workers.dev/topics`), client errors (query in `workers/visit-stats/worker.js`), and GA4. Note the top topics and any recurring error.
6. Add new tasks to `docs/roadmap-100.md` (or its successor) and link this review from the commit.

## 2026 Q4 (7 November 2026)

Baseline from the TensorTonic study at the top of `docs/roadmap-100.md`, after tasks 1-100.

| Area | Where we stood | Now |
| --- | --- | --- |
| Home page | Did not show the product working | Live computation in the first screen, real counts for pages, problems, interview questions, study plans |
| Problems | No single hub | Hub with topic, difficulty, framework and solved filters; daily problem; points |
| Study plans | None | Named plans with counts and a certificate on completion |
| Changelog | None | `/changelog` built from git history, with a release heatmap |
| Leaderboard | All-time only in practice | Weekly (resets Monday), all-time and interview views |
| Menu | Flat row | Products and Resources groups, reachable at every width |
| Search | Pages only | Pages plus interview questions, which open directly |
| Interview SEO | Guides only | One indexable page per topic listing every question |

Open gaps carried forward:

- Community solutions with votes (task 86): needs sign-in and a moderation queue.
- PyTorch sheet (task 27): needs a server-side judge; Pyodide cannot load PyTorch.
- Diagram arrow review (task 80).
- Stats Worker update (tasks 96 and 98) needs `npx wrangler@4 d1 execute visit-stats --remote --file schema.sql` and `npx wrangler@4 deploy` from `workers/visit-stats/`.
