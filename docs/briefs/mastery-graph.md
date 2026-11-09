# Mastery graph (plan item C1)

First git fetch and merge origin/main. Follow AGENTS.md and the ui-design skill. Do not push. No npm run build.

On /interview, src/components/interview/InterviewGraph.tsx, make progress visible: as a user completes questions in a topic, that topic's node and its connecting lines become brighter and thicker on a smooth scale from 0 to 100% done. Show the percentage next to the topic label once it is above 0, for example "Transformers 42%". Keep the existing group colours and the mouse and keyboard behaviour. Show group totals if they fit cleanly without clutter.

Requirements: the 0% state stays readable, 100% looks clearly complete but labels stay legible; use theme-aware colours and check contrast in light and dark; no layout shift; works at 375px and 320px with no overlapping labels; reduced motion is respected; the accessible label states the percentage. Use real data from the existing completed awards. Update tests; add a unit test for the scale. Save screenshots with 0%, partial and full states, light and dark, 1440 and 375, in docs/evidence/interview-graph/. Report what you measured.
