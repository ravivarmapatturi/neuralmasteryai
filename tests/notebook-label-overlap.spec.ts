import { test, expect } from '@playwright/test';

// Owner rule (17 Nov 2026): labels in each SVG diagram may not touch another
// label or stick out of their picture. Separate SVG plots are independent.
const ROUTES = [
  'docs/search-ranking-recommendations/bm25',
  'docs/search-ranking-recommendations/deep-recommenders',
  'docs/search-ranking-recommendations/exploration-feedback-loops',
  'docs/search-ranking-recommendations/learning-to-rank',
  'docs/search-ranking-recommendations/matrix-factorization-embeddings',
  'docs/search-ranking-recommendations/ranking-evaluation-metrics',
  'docs/search-ranking-recommendations/semantic-and-hybrid-search',
  'docs/search-ranking-recommendations/search-recommendation-system-design',
  'docs/search-ranking-recommendations/text-search-bm25',
  'docs/harness-engineering/autonomous-loops-and-supervisors',
  'docs/harness-engineering/context-and-instruction-design',
  'docs/harness-engineering/harness-architecture',
  'docs/harness-engineering/state-continuity-and-memory',
  'docs/harness-engineering/verification-loops',
  'docs/search-ranking-recommendations/recommendation-foundations',
  'docs/search-ranking-recommendations/ranking-fundamentals',
  'docs/deep-learning/attention-transformers',
  'docs/deep-learning/neural-network-fundamentals',
  'docs/llms-genai/prompt-engineering',
  'docs/llms-genai/rag',
  'docs/mlops/llm-inference-optimization',
  // Keep the already-approved pilot last so the Vite dev server has warmed its
  // route modules before this large lazy-loaded page is checked.
  'docs/search-ranking-recommendations/tf-idf',
];
const WIDTHS = [1440, 768, 375];

for (const route of ROUTES) {
  test(`pen diagram labels do not overlap or clip on ${route}`, async ({ page }) => {
    test.setTimeout(180000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('neural-mastery-theme', 'pure-white');
        localStorage.setItem('nm_signin_nudge_dismissed', '1');
      } catch {}
    });
    await page.setViewportSize({ width: WIDTHS[0], height: 900 });
    await page.goto(`/${route}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('article.prose h1').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForFunction(() => (document.querySelector('article.prose')?.innerText.length ?? 0) > 150, { timeout: 60000 });
    await page.locator('article svg').first().waitFor({ state: 'attached', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const problems: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      const found = await page.evaluate((width) => {
        const out: string[] = [];
        for (const svg of Array.from(document.querySelectorAll('article svg'))) {
          const sr = svg.getBoundingClientRect();
          if (sr.width < 100) continue;
          const name = (svg.getAttribute('aria-label') || '').slice(0, 40);
          // This guard targets labeled process diagrams. Dense scatter plots
          // intentionally place a label at every point and need their own
          // collision strategy; checking all point-label pairs reports
          // unrelated categories as collisions.
          if (svg.querySelector('circle')) continue;
          const ts = Array.from(svg.querySelectorAll('text'))
            .filter((t) => t.textContent?.trim())
            .map((t) => ({ t: t.textContent!.trim(), r: t.getBoundingClientRect() }))
            .filter((o) => o.r.width > 0);
          for (let i = 0; i < ts.length; i++) {
            const a = ts[i].r;
            if (a.left < sr.left - 1 || a.right > sr.right + 1 || a.top + a.height * 0.2 < sr.top - 1 || a.bottom - a.height * 0.2 > sr.bottom + 1) {
              out.push(`${width}px: clipped in "${name}": ${ts[i].t}`);
            }
            for (let j = i + 1; j < ts.length; j++) {
              const b = ts[j].r;
              // Text boxes include the font's line gap (Kalam's is large), so
              // compare the inner 60% of each box height: the ink, not the gap.
              const ia = a.height * 0.2, ib = b.height * 0.2;
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom - ia, b.bottom - ib) - Math.max(a.top + ia, b.top + ib);
              if (ox > 1 && oy > 1) out.push(`${width}px: overlap in "${name}": "${ts[i].t}" / "${ts[j].t}"`);
            }
          }
        }
        return out;
      }, width);
      problems.push(...found);
    }
    expect(problems, `${route}:\n${problems.join('\n')}`).toEqual([]);
  });
}
