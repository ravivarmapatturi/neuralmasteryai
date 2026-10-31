---
name: visual-learning
description: Design Neural Mastery blog visuals, interactive explanations, labs, and interview learning experiences for human readers.
---

# Visual learning at Neural Mastery

Read `src/content/docs/deep-learning/attention-transformers.mdx` and its linked visualizers before substantial educational work. Use that page as a teaching benchmark, not a component quota.

## Start from the learner's question

Choose the misconception or decision the reader should resolve. Explain it in everyday language before introducing notation. Technical fundamentals and coding remain useful; teach people to frame problems, understand mechanisms, inspect AI output, design systems, weigh constraints, run experiments, and verify outcomes.

Write to a person learning, not to an agent executing a benchmark. Introduce a concrete situation, define unfamiliar terms, and explain why a result matters. Keep fixtures, JSON schemas, hidden-test instructions, and grading mechanics inside an explicitly opened implementation exercise. Do not headline with slogans contrasting engineering and syntax.

## Build a visual argument

- Give a post an editorial cover and put explanatory visuals beside the relevant mechanism in its body. A cover is not a substitute for teaching.
- Use labeled inputs, transformations, and outputs. Show direction and one concrete example. Prefer a before/after, trace, matrix, or chart that explains something over a decorative network.
- Add interaction when it resolves a question: step through a request, alter one variable, compare designs, or reveal a failure. Explain the initial state, what the controls change, and what to notice.
- Use `useVizTokens()`, `VisualizationContainer`, and `VisualizationHeader` for diagrams. Keep SVG labels readable on mobile; offer text that conveys the same conclusion. Avoid animation unless useful, and honor reduced motion.
- Distinguish measured results, calculated toy models, assumptions, and qualitative simulations. Never turn invented constants into a production benchmark or a model probability into a verified grade.

## Labs and interviews

A lab needs a situation, constraints, a prediction, an action, observable consequences, and a short decision record. Include a failure case and explain when another design is reasonable. Let readers revise their reasoning. Interview practice needs a clear question, answer space, assessment criteria, one defensible example answer, and a follow-up. Any automatic evaluator must be identified and validated against human-scored examples; show uncertainty and avoid penalizing speaking style.

## Verify

Check the mechanism against primary sources. Exercise controls, keyboard use, mobile width, and both themes. Check that diagrams and prose agree. Run the repository's verification gates. Document real limitations rather than presenting unsupported features as working.
