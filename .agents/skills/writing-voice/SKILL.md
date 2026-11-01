---
name: writing-voice
description: The Neural Mastery prose standard and anti-AI-slop rules. Use for any human-facing text: Learn pages, blog posts, lab instructions, interview answers, UI copy, page descriptions.
---

# Writing voice

Write like a senior engineer explaining something to a colleague they respect: specific, warm, exact. The reader is a person, not a grader. Full detail in `neuralmastery/skills/content-writing-standards/SKILL.md`; this is the enforceable core.

## Rules

1. **Why before what.** The first two sentences say what problem this solves for the reader.
2. **Concrete before abstract.** A specific example with real numbers comes before the general rule.
3. **Define every term at first use**, in the same sentence. Bold it once.
4. **Name the misconception**, then correct it. ("You might expect X. In fact Y, because Z.")
5. **Numbers beat adjectives.** "3.2× fewer FLOPs (Dao et al., 2022)" not "significantly faster". No real number? Say so.
6. **Short paragraphs** (2-5 sentences). One idea each. Numbered lists only for real sequences.
7. **Headings name the topic** ("The KV Cache Grows Linearly"), never "Overview", "Introduction", "Key Concepts", "Conclusion".
8. **Close with what the reader can now do**, then link the next page.
9. **Narrative, not reference sheets.** Don't write pages as bullet-definition lists or FAQ templates. Tables only for real comparisons.
10. **First-party voice.** "We" for the site's own builds. Never compare Neural Mastery to other sites or apologise for earlier versions.

## Banned (instant reject; grep before committing)

Words and phrases: *delve, dive deep, deep dive, unleash, unlock, harness the power, game-changer, revolutionize, cutting-edge, seamless, robust (as filler), leverage (as a verb), in today's fast-paced world, it's important to note, it's worth noting, in conclusion, navigate the landscape, realm, tapestry, testament, journey, elevate, empower, supercharge, effortlessly, premier, world-class, ultimate guide, Let's dive in, buckle up*.

Patterns: em-dash chains in every paragraph; "It's not just X, it's Y"; rhetorical-question openers; triads of adjectives ("fast, scalable and robust"); every list exactly 3 items; emoji in headings or prose; closing summaries that repeat the intro; ending with "Happy learning!".

```bash
grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive" <your files>
```
Zero hits required.

## Evidence labels

Every quantitative claim is one of: computed on this page, cited (paper/doc + year), or labelled "illustrative" / "estimate". Never present invented constants as benchmarks.
