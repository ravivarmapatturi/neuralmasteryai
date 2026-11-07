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
6. done - Filter questions by round (screen, depth, system design) and by role.
7. done - "Next unsolved question" button.
8. done - Show follow-up questions and wrong answers from the repo after the model answer.
9. done - Daily interview question on the home page.
10. done - Progress ring per topic node in the graph.
11. done - Resume where you left off.
12. done - Keyboard shortcuts: space to answer, N for next.
13. done - Share a completed topic.
14. done - Interview leaderboard view.
15. done - Mobile pass on the answer screen.

### Problems and labs (16-35)
16. done - One Problems hub with filters: topic, difficulty, framework, solved.
17. done - Consistent problem page: description, theory, hints, examples, requirements.
18. done - Two-pane layout with test cases and results.
19. done - Per-problem notes saved locally.
20. done - Show solution after a solve or an explicit reveal.
21. done - Points by difficulty shown on every problem.
22. done - Daily problem.
23. done - Solved and unsolved filter.
24. done - Related problems at the end of each problem.
25. done - Problem count and solved count on the hub.
26. done - NumPy sheet (8 problems).
27. blocked - PyTorch sheet. The in-browser judge runs Pyodide, which cannot load PyTorch, so these problems could not be checked by real tests. Needs a server-side judge first.
28. done - Build Micrograd: a scalar autograd engine in 6 stages.
29. done - Attention From Scratch: 6 problems (masking, multi-head, KV cache, GQA, ALiBi).
30. done - Build a Tokenizer: 6 problems, characters to BPE with byte fallback.
31. done - Optimizers: 6 problems (clipping, RMSProp, Nesterov, Lion, warmup-cosine, SGD vs momentum).
32. done - Loss Functions: 6 problems (Huber, triplet, label smoothing, focal, distillation, InfoNCE).
33. done - Evaluation Metrics: 6 problems (MRR, macro/micro F1, nDCG, ECE, average precision, BLEU).
34. done - RAG Pieces: 6 problems (terms, BM25, near-duplicates, hybrid fusion, context assembly, citation checks).
35. done - Agent loop set: covered by the existing 12-stage Build an Agent project (parse, dispatch, loop, recovery, guardrails, memory, planning, evals). No second set, to avoid duplicate problems.

### Study plans, research and projects (36-55)
36. done - Study Plans page (/study-plans) with named plans and practice sheets, each with problem, reading and passed counts.
37. done - "Build Micrograd from Scratch" plan (needs new problems: a Value class and backward(), from task 28).
38. done - "Build a Transformer from Scratch" plan (needs new problems: BPE training, full multi-head attention, one transformer block, from tasks 29-30).
39. done - "RAG from Scratch" plan (needs new problems: cross-encoder re-rank and an end-to-end capstone, from task 34).
40. done - "Agents from Scratch" plan (complete: the 12 Build an Agent problems plus readings).
41. done - Research tracks (/research): Attention Is All You Need in 8 steps.
42. done - Research track diagram that highlights the part the current step builds and ticks finished parts.
43-48. done - Tracks for ResNet, GPT-2, LoRA, DPO, ViT, Word2Vec (LoRA, DPO, ViT and Word2Vec list steps whose problems are not written yet).
49. done - Project sheets page (/projects) by field.
50-55. done - Projects: RAG app, agent with tools, eval harness, fine-tune with LoRA, serving with batching, voice assistant.

### Learn content (56-70)
56. done - ML math hub with modules (statistics, probability, linear algebra, calculus, optimisation).
57. done - LLM internals hub linking our deepest pages.
58. done - Guides page: interview prep, which optimizer, etc.
59. done - Deepened Multimodal and Generative Models (image tokens, CLIP loss, diffusion forward process).
60. done - Deepened Calling the LLM API (sampling worked example, retry jitter simulation, prompt-caching cost, current SDK calls).
61. done - Deepened Audio Fundamentals (aliasing worked example, Whisper's 80 x 3000 front end, problems, sources).
62. done - Deepened Vision Tasks and Models (IoU association worked example, stereo depth error, Hungarian vs greedy, sources).
63. done - Deepened Classical NLP (runnable Viterbi where greedy fails, BIO span F1, log-space, CRFs, sources).
64. done - Deepened Alignment and RLHF (KL-regularised optimum on four answers, over-optimisation, rare-failure statistics, DPO derivation).
65. done - Deepened Vision Fundamentals (Sobel worked example, mask opening, channel order and normalisation pitfalls, augmentation validity).
66. done - Deepened Speech and Audio Tasks (CTC collapse, WER with insertions, EER from simulated scores, CTC loss DP, sources).
67. done - Deepened Prompt Engineering (self-consistency binomial, measuring a prompt change with a paired bootstrap, injection defences, sources).
68-70. planned - Close depth gaps found by the existing audits, one page each. Picked from docs/learning-page-inventory.md: the lowest-word core chapters.

### Atlas and visuals (71-80)
71. done - Atlas shows one label, for the selected entry, so labels no longer overlap.
72. done - Atlas year filter and zoom: All years, 2000 on, 2015 on, 2020 on; the chosen range fills the width.
73. done - Deep links to each atlas entry: /atlas#t-lora on the timeline, /docs/atlas/training#lora on each field atlas (opens and scrolls to the row).
74. done - Reviewed all 63 timeline links (68 now) against each entry's came-before and led-to text: removed 3 the text does not state (ReAct to Reflexion, ReAct to Plan-and-Solve, LangGraph to long-running harnesses) and added 8 it does.
75. done - Reduced motion: the producer-queue diagram, the one diagram that animated on load, now waits for play when reduced motion is set.
76. done - Theme colours: 14 diagrams used a fixed red or black/white text on accent fills, which failed contrast in one theme; they now use theme tokens.
77. done - 42 fixed-width diagram SVGs get a viewBox and scale to fit at 375px instead of scrolling inside their card.
78. done - src/viz/diagramAudit.test.ts fails the build if 76 or 77 regress.
79. done - Accessible names checked: VisualizationContainer already labels every diagram (title and footer), so no per-SVG change was needed.
80. planned - Arrow crossings and arrows through labels need a by-eye review of each diagram with connecting lines; not done in this pass.

### Platform and growth (81-100)
81. done - The site tour closes when you navigate away from it.
82. done - Home page: show the product working in the first screen.
83. done - Real numbers on the home page (questions, problems, pages, study plans).
84. done - Changelog page from git history.
85. done - Leaderboard: weekly and all-time.
86. skipped - Community solutions (needs sign-in and moderation; left for a later batch with a moderation queue).
87. done - Product menu regrouped like Products and Resources.
88. done - Dark mode check on every new page.
89. done - 375px overflow audit after each release (smoke test covers the main product pages).
90. done - Faster first load: the practice problem bank (about 7 MB) now loads only on practice routes.
91. done - Search covers interview questions.
92. planned - SEO pages for each interview topic.
93. planned - Certificates for completed study plans.
94. planned - Email-free progress export.
95. planned - Accessibility pass: focus, labels, contrast.
96. planned - Error tracking on the client.
97. planned - Weekly CI smoke run on the live site.
98. planned - Analytics on which topics people use.
99. planned - Credit page for all open-source content we use.
100. planned - Quarterly review against TensorTonic and others.
