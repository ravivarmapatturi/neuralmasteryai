---
name: ui-design
description: Product UI standard for Neural Mastery pages and components (home, Learn shell, labs, blog list, interview, profile). Use before designing or changing any page layout, component, navigation or styling. Prevents generic AI-generated look.
---

# UI design standard

Neural Mastery looks like **a well-kept engineering notebook**: warm paper surfaces, hand-drawn (Kalam) accents for diagrams and labels, crisp sans text for reading, one confident accent. The interface gets out of the way of the content. It should be recognisably *ours*, not a template.

## Principles

1. **Content is the hero.** Reading column 65-75 characters (`max-width: ~720px` for prose). Diagrams may go wider.
2. **One primary action per screen.** Everything else is secondary styling.
3. **Hierarchy through type and spacing**, not boxes, borders and badges. Use the spacing scale; don't stack cards inside cards.
4. **Every element earns its place.** If removing it loses nothing, remove it. Deletion is usually the best design move.
5. **Show progress and state**: where am I (breadcrumb/sidebar), what's next (next link), what I've done (progress).
6. **Fast**: no layout shift, no blocking fonts beyond what's preloaded, lazy-load heavy viz and Pyodide.

## Tokens (never hardcode)

- CSS: `var(--nm-*)` from `src/styles/theme.css` (surfaces, text, border, accent). JS/SVG: `useVizTokens()`.
- New colour → add a token in both places and in light + dark. Never raw hex in components.
- Fonts: body/UI sans (`--font-sans`), code mono, Kalam only for hand-drawn notebook accents (diagram labels, nav highlights). Never Kalam for body paragraphs.

## AI-slop tells: banned

- Purple-to-blue (or any) gradient backgrounds, gradient text, glows, glassmorphism.
- Emoji as icons or section markers. Use the icon set in `src/components/icons` or none.
- The "3 cards with an icon, a bold title and a line of text" grid as a default section. Use it only for 3 genuinely parallel items, with real content.
- Bento grids, floating blobs, decorative particles, auto-playing carousels.
- Badges/pills on everything ("NEW", "AI-powered", "🔥"). A `NEW` badge expires after 30 days.
- Marketing copy: "Unlock your potential", "Master AI today", superlatives. Copy states concretely what the page offers.
- Animation on scroll for its own sake; scroll-jacking.
- Fake numbers (learner counts, ratings) or placeholder testimonials.

## Layout and responsiveness

- Mobile-first. At 375px: no horizontal scroll (the smoke test enforces this), tap targets ≥ 40px, navbar fits one row (secondary items go into the menu, which must list every destination hidden from the row). Inline `style={{display}}` beats CSS media queries; put display rules in CSS classes, not inline.
- Breakpoints in use: 560, 800, 900, 1050. Reuse them.
- Both themes are first-class. Check contrast ≥ 4.5:1 for text in both.

## Accessibility

Semantic HTML (`nav`, `main`, `article`, `button`); visible focus rings; every icon button has `aria-label`; `prefers-reduced-motion` respected; images have alt text that conveys meaning.

## Review method (do this, don't skip)

1. Screenshot your page at 375px and 1440px, light and dark.
2. Ask: "Would this section look identical on any AI startup landing page?" If yes, redesign it around our actual content.
3. Ask: "What is the one thing the user should do here, and is it the most visible thing?"
4. Run Lighthouse (Accessibility ≥ 95) on changed routes when feasible.
