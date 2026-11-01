---
name: blog-post
description: Rules for writing a Neural Mastery blog post (src/content/blog/*.mdx): news explainers, series parts, opinion/analysis. Use whenever creating or editing a blog post.
---

# Writing a blog post

Blog posts are timely, opinionated explainers: "Something happened / exists; here is what it actually is, how it works, and what it means for you." Reference example: `src/content/blog/agent-skills-explained.mdx`.

Also load: `writing-voice`, `visualization`, `ship-gate`.

## Frontmatter

```yaml
---
title: "Specific Claim or Question, Not a Label"   # ≤70 chars ideal
description: "1-2 sentences with the concrete hook (a date, a number, a decision)."
date: YYYY-MM-DD                                   # publish date; real
tags: [3-5 existing tags]                          # reuse tags; check BlogTags.tsx / other posts before inventing
---
```

## Structure

1. **Lead (1 paragraph):** the news or problem with a date, a number and a primary-source link. No throat-clearing.
2. **Promise (1 paragraph):** what the reader will understand by the end.
3. **Numbered H2 sections** (`## 1. The problem X solves`), 4-8 of them, each one step of the argument.
4. **At least one mechanism visual in the body**, placed next to the section it explains (`BlogMechanism` or a `src/viz/diagrams` component). The cover image is not a teaching visual.
5. **A concrete artifact**: a real snippet, config, command, or worked number the reader can reuse.
6. **"Where it breaks" section**: limits, costs, open questions. Honest, specific.
7. **Summary**: 3-5 sentences of synthesis (not a repeat of the intro).
8. **Further reading**: primary sources + 1-2 links to the matching Learn pages (`/docs/...`). Blog posts must link into Learn.

## Rules

- Every fact about an event (dates, counts, quotes) links to the primary source. Verify the link opens. If a figure comes from a vendor, say so.
- Quotes: under 15 words, attributed. Summarise, don't reproduce.
- Series posts: same series name in frontmatter/`BlogSeriesBox`, "Part N" in the title, previous/next links.
- No AI-news filler ("This changes everything"). If it doesn't change anything for the reader, say what it does change.
- 1,200-3,000 words.

## Done when

`writing-voice` grep is clean, every link opens, visual verified in both themes at 375px, `ship-gate` passed.
