# Brief: sitewide 375px overflow audit

Read AGENTS.md. Work only in this worktree, branch overflow-audit-2026-11. No push or deploy. 8 GB RAM: check free -g, avoid full builds, and use NODE_OPTIONS=--max-old-space-size=3000 if you need one.

The two earlier open pages now measure clean on the live site (scrollWidth 375), so this is a wider check. Add a Playwright script that loads at least 60 evenly sampled live pages from https://neuralmasteryai.com at 375x812, across docs, blog, atlas, labs, glossary and interview, chosen from the route data. It records scrollWidth against clientWidth and the widest element, and exits non-zero on overflow. Also check pages known for wide diagrams, tables, and code.

Fix causes in shared components or CSS. Wide tables, diagrams and code scroll inside their own container. Do not change content or diagram meaning. Give before and after numbers, and check desktop width for regressions. If nothing overflows, say so and commit only the script.

Run typecheck and related tests. Commit on the branch and report. Do not claim anything you did not run.
