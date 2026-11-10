# agy round 2 (same worktree platform-vite-themes, branch agy-themes). Commit per item. Do not push.

## Fix 1: pure white theme is not pure white
Screenshot docs/evidence/themes/interview-pure-white-1280px.png: the big interview card is light grey (#f8f9fa-like) and headings are black.
- Every surface in the pure-white theme must be #ffffff: page, cards, navbar, inputs. Find which token paints the card (`grep -rn "background" src/components/interview/simpleInterview.css | head -40`, then check which `--` variable it uses) and set it to #ffffff for `[data-page-theme='pure-white']`.
- Separate cards with thin coloured borders instead of grey fills (for example 1px #c7d2fe).
- Colourful text: h1/h2/h3 indigo #3730a3, links teal #0f766e, level/topic badges magenta #a21caf, primary buttons indigo background with white text, highlights orange #c2410c. Body text #1a1a2e.
- Re-run the contrast test and retake the pure-white screenshots. Look at them.

## Fix 2: three empty white buttons in the room header
Screenshot docs/evidence/interview-width/1920-3-answer.png: next to "1 / 130" at the top right there are three blank white square buttons. They are probably bookmark / read-aloud / settings icon buttons whose icon is invisible (icon colour equals background, or SVG missing). Find them in src/components/interview/SimpleInterviewPage.tsx near the "/ {total}" counter, make the icons visible in all five themes, give each an aria-label, and screenshot again.

## Fix 3: prove the heat map
Set some completion in localStorage before the screenshot (look at how src/lib/interviewLearning.ts stores completion records, key starts with nm-interview) so topics show 0%, ~50% and 100%. Screenshot the graph in light, dark and pure-white. The colour difference must be obvious.

## Then report
List commits, and anything you could not do, at the end of this file.
