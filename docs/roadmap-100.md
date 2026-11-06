# Neural Mastery: 100 tasks to a solid, free learning platform

Benchmark: TensorTonic (studied 2026-11-07: home, problems, a problem page, research, projects, study plans, ML system design, ML math, LLM internals, leaderboard, changelog, guides). Our edge stays the same: everything free, visual, and runs in the browser.

## What TensorTonic does well
- One clear promise on the home page ("Learn ML through code") with a live, interactive example and real numbers (problems, learners, submissions).
- A product menu that is easy to scan: Problems, Research, Projects, Study Plans, ML System Design; then Guides, ML math, LLM internals, Leaderboard, Changelog.
- Problem pages are a two-pane IDE: description, theory, solution, submissions, notes on the left; code, test cases and results on the right. Formulas, examples, hints and requirements are all on one page.
- Research tracks turn a paper into 5 to 10 small steps with difficulty, and a live architecture diagram that lights up the part you are building.
- Study plans group problems into named sheets ("Build Micrograd from Scratch", "PyTorch Sheet") with counts.
- ML system design follows a fixed framework (framing, data, features, models, serving) with real company case studies.
- Leaderboard, changelog with a release heatmap, community solutions with votes, and a daily problem keep people coming back.
- Dark, quiet visual style with one accent colour.

## Our drawbacks today
- The home page does not show the product working in the first screen.
- No single "Problems" hub with filters for topic, difficulty, framework and solved status.
- Problem pages lack per-problem theory, hints and examples in a consistent layout.
- No paper-to-code tracks, project sheets or named study plans.
- No changelog, no daily problem, no community solutions.
- The site tour card follows you onto every page until dismissed.
- On /interview, a question without recorded audio can sit on "The interviewer is asking".
- Atlas labels overlap in crowded years.

## The 100 tasks (status: done / next / planned)

### Interview (1-15)
1. done - Mark a question complete for 10 points, with completed ticks and counts.
2. done - Move on to answering when a clip is missing or has not started within 4 seconds.
3. done - On-device Kokoro voice for questions and answers without a recording (desktop only; first load downloads the model).
4. done - Check the spoken answer against the model answer and show covered and missed points.
5. done - Import the "frequent and must-know" repo questions first: rank by roles and rounds in the repo metadata.
6. planned - Filter questions by round (screen, depth, system design) and by role.
7. done - "Next unsolved question" button.
8. done - Show follow-up questions and wrong answers from the repo after the model answer.
9. planned - Daily interview question on the home page.
10. planned - Progress ring per topic node in the graph.
11. planned - Resume where you left off.
12. planned - Keyboard shortcuts: space to answer, N for next.
13. planned - Share a completed topic.
14. planned - Interview leaderboard view.
15. planned - Mobile pass on the answer screen.

### Problems and labs (16-35)
16. planned - One Problems hub with filters: topic, difficulty, framework, solved.
17. planned - Consistent problem page: description, theory, hints, examples, requirements.
18. planned - Two-pane layout with test cases and results.
19. planned - Per-problem notes saved locally.
20. planned - Show solution after a solve or an explicit reveal.
21. planned - Points by difficulty shown on every problem.
22. planned - Daily problem.
23. planned - Solved and unsolved filter.
24. planned - Related problems at the end of each problem.
25. planned - Problem count and solved count on the hub.
26-35. planned - Add problem sets: NumPy sheet, PyTorch sheet, autograd (micrograd) series, attention from scratch, tokenizer, optimizers, losses, metrics, RAG pieces, agent loop.

### Study plans, research and projects (36-55)
36. planned - Study Plans page with named sheets and counts.
37. planned - "Build Micrograd from Scratch" plan.
38. planned - "Build a Transformer from Scratch" plan.
39. planned - "RAG from Scratch" plan.
40. planned - "Agents from Scratch" plan.
41. planned - Research tracks: Attention Is All You Need in 8 steps.
42. planned - Research track diagram that highlights the current step.
43-48. planned - Tracks for ResNet, GPT-2, LoRA, DPO, ViT, Word2Vec.
49. planned - Project sheets page by field.
50-55. planned - Projects: RAG app, agent with tools, eval harness, fine-tune with LoRA, serving with batching, voice assistant.

### Learn content (56-70)
56. planned - ML math hub with modules (statistics, probability, linear algebra, calculus, optimisation).
57. planned - LLM internals hub linking our deepest pages.
58. planned - Guides page: interview prep, which optimizer, etc.
59-70. planned - Close depth gaps found by the existing audits, one page each.

### Atlas and visuals (71-80)
71. done - Atlas shows one label, for the selected entry, so labels no longer overlap.
72. planned - Atlas year filter and zoom.
73. planned - Deep links to each atlas entry.
74. planned - Review every Atlas link against its source text.
75-80. planned - Diagram quality audit items from feedback_visualization_zero_tolerance.md.

### Platform and growth (81-100)
81. done - The site tour closes when you navigate away from it.
82. planned - Home page: show the product working in the first screen.
83. planned - Real numbers on the home page (questions, problems, pages).
84. planned - Changelog page from git history.
85. planned - Leaderboard: weekly and all-time.
86. planned - Community solutions (needs sign-in and moderation).
87. planned - Product menu regrouped like Products and Resources.
88. planned - Dark mode check on every new page.
89. planned - 375px overflow audit after each release.
90. planned - Faster first load: split the largest data files.
91. planned - Search covers interview questions.
92. planned - SEO pages for each interview topic.
93. planned - Certificates for completed study plans.
94. planned - Email-free progress export.
95. planned - Accessibility pass: focus, labels, contrast.
96. planned - Error tracking on the client.
97. planned - Weekly CI smoke run on the live site.
98. planned - Analytics on which topics people use.
99. planned - Credit page for all open-source content we use.
100. planned - Quarterly review against TensorTonic and others.
