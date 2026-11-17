import { test, expect } from '@playwright/test';

// Owner rule (17 Nov 2026): no label in a pen diagram may touch another label
// or stick out of its picture. Checks every SVG <text> inside the article.
const ROUTES = [
  'docs/search-ranking-recommendations/tf-idf',
  'docs/search-ranking-recommendations/bm25',
  'docs/search-ranking-recommendations/recommendation-foundations',
  'docs/search-ranking-recommendations/ranking-fundamentals',
];
const WIDTHS = [1440, 768, 375];

for (const width of WIDTHS) {
  test(`pen diagram labels do not overlap or clip at ${width}px`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 900 });
    const problems: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await page.locator('article svg').first().waitFor({ state: 'attached', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const out: string[] = [];
        for (const svg of Array.from(document.querySelectorAll('article svg'))) {
          const sr = svg.getBoundingClientRect();
          if (sr.width < 100) continue;
          const name = (svg.getAttribute('aria-label') || '').slice(0, 40);
          const ts = Array.from(svg.querySelectorAll('text'))
            .filter((t) => t.textContent?.trim())
            .map((t) => ({ t: t.textContent!.trim(), r: t.getBoundingClientRect() }))
            .filter((o) => o.r.width > 0);
          for (let i = 0; i < ts.length; i++) {
            const a = ts[i].r;
            if (a.left < sr.left - 1 || a.right > sr.right + 1 || a.top + a.height * 0.2 < sr.top - 1 || a.bottom - a.height * 0.2 > sr.bottom + 1) {
              out.push(`clipped in "${name}": ${ts[i].t}`);
            }
            for (let j = i + 1; j < ts.length; j++) {
              const b = ts[j].r;
              // Text boxes include the font's line gap (Kalam's is large), so
              // compare the inner 60% of each box height: the ink, not the gap.
              const ia = a.height * 0.2, ib = b.height * 0.2;
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom - ia, b.bottom - ib) - Math.max(a.top + ia, b.top + ib);
              if (ox > 1 && oy > 1) out.push(`overlap in "${name}": "${ts[i].t}" / "${ts[j].t}"`);
            }
          }
        }
        return out;
      });
      problems.push(...found.map((f) => `${route}: ${f}`));
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
