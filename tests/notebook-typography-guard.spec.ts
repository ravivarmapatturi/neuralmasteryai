import { test, expect } from '@playwright/test';

const ROUTES = [
  'docs/search-ranking-recommendations/overview',
  'docs/search-ranking-recommendations/tf-idf',
  'docs/search-ranking-recommendations/bm25',
  'docs/search-ranking-recommendations/ranking-evaluation-metrics',
  'docs/harness-engineering/context-and-instruction-design',
  'docs/mlops/overview',
  'docs/mlops/model-serving',
  'docs/machine-learning/linear-regression',
  'docs/machine-learning/logistic-regression',
  'docs/deep-learning/attention-transformers',
  'docs/deep-learning/neural-network-fundamentals',
  'docs/agents/overview',
  'docs/agents/agent-architectures',
  'docs/visual-lab/logistic-regression-studio',
  'blog/e-means-outperforming-kmeans',
  'labs',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

const THEMES = ['pure-white', 'dark'];

const MANDATORY_ROLES = [
  'h1',
  'h2',
  'h3',
  'h4',
  'paragraph',
  'small',
  'th',
  'td',
  'callout-body',
];

test.describe('Cross-Page Notebook Typography & Surface Guard', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`verifies typography scale and ruled line removal at ${viewport.width}px in ${theme} theme`, async ({ page }) => {
        test.setTimeout(120000);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Collect measurements per role across the 16 routes
        const roleRecords: Record<string, Array<{ route: string; tagName: string; styles: Record<string, string> }>> = {};
        for (const role of MANDATORY_ROLES) {
          roleRecords[role] = [];
        }

        for (const route of ROUTES) {
          await page.goto(route);
          await page.waitForLoadState('domcontentloaded');
          // Lazy routes show a loading fallback first; wait for the real page heading.
          await page
            .locator('.nm-doc-main h1, article.prose h1, .nm-post-title, .labs__head h1')
            .first()
            .waitFor({ state: 'visible', timeout: 30000 });

          // Switch theme
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.setAttribute('data-page-theme', t);
          }, theme);

          // Give layout/theme a moment to settle
          await page.waitForTimeout(50);

          // 1. Assert no repeating horizontal rule patterns exist on sheet/surface elements
          const surfaceViolations = await page.evaluate(() => {
            const surfaces = Array.from(document.querySelectorAll('.nm-notebook-sheet, .nb-ruled, .nm-doc-main, .nm-post-main, .labs'));
            const bad = [];
            for (const el of surfaces) {
              const bg = window.getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none' && (bg.includes('repeating-linear-gradient') || /repeating.*linear-gradient/i.test(bg))) {
                bad.push({ className: el.className, bg });
              }
            }
            return bad;
          });

          expect(
            surfaceViolations,
            `Rendered notebook surface on ${route} has repeating ruled pattern: ${JSON.stringify(surfaceViolations)}`
          ).toEqual([]);

          // 2. Extract computed styles for each role present on this route
          const extracted = await page.evaluate(() => {
            const results: Record<string, { tagName: string; styles: Record<string, string> }> = {};

            const roleSelectors: Record<string, string[]> = {
              'h1': ['.nm-doc-main h1', 'article.prose h1', '.nm-post-title', '.labs__head h1', 'main h1'],
              'h2': ['article.prose h2', '.labs__section h2', '.labs__daily h2'],
              'h3': ['article.prose h3', '.labs__card h3'],
              'h4': ['article.prose h4'],
              'paragraph': [
                'article.prose > p:not(.nb-callout-body p):not(blockquote p):not(.nm-callout p)',
                '.nm-post-standfirst',
                '.labs__head p',
                '.labs__lead',
                '.labs__card p',
              ],
              'small': [
                'article.prose small',
                'article.prose figcaption',
                '.nm-post-author small',
                '.labs__meta',
              ],
              'th': ['article.prose table:not(.nm-viz-content table) th', '.labs__table th'],
              'td': ['article.prose table:not(.nm-viz-content table) td', '.labs__table td'],
              'callout-body': ['.nb-callout-body p', '.nb-callout-body'],
            };

            for (const [role, selectors] of Object.entries(roleSelectors)) {
              let el: Element | null = null;
              for (const sel of selectors) {
                const candidates = Array.from(document.querySelectorAll(sel));
                el = candidates.find((c) => {
                  const rect = c.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                }) || null;
                if (el) break;
              }

              if (el) {
                const cs = window.getComputedStyle(el);
                results[role] = {
                  tagName: el.tagName.toLowerCase(),
                  styles: {
                    fontSize: cs.fontSize,
                    lineHeight: cs.lineHeight,
                    fontWeight: cs.fontWeight,
                    color: cs.color,
                    letterSpacing: cs.letterSpacing,
                    marginBottom: cs.marginBottom,
                  },
                };
              }
            }

            return results;
          });

          for (const [role, data] of Object.entries(extracted)) {
            roleRecords[role].push({
              route,
              tagName: data.tagName,
              styles: data.styles,
            });
          }
        }

        // 3. Ensure mandatory role coverage
        for (const role of MANDATORY_ROLES) {
          const instances = roleRecords[role];
          expect(
            instances.length,
            `Suite cannot find representative instances of role "${role}" across the 16 routes at ${viewport.width}px (${theme})`
          ).toBeGreaterThan(0);

          // 4. Cross-page consistency: all instances of the role must have identical computed styles
          const baseline = instances[0];
          for (let i = 1; i < instances.length; i++) {
            const current = instances[i];
            expect(
              current.styles.fontSize,
              `Role "${role}" font-size on "${current.route}" (${current.styles.fontSize}) must match "${baseline.route}" (${baseline.styles.fontSize})`
            ).toBe(baseline.styles.fontSize);

            expect(
              current.styles.lineHeight,
              `Role "${role}" line-height on "${current.route}" (${current.styles.lineHeight}) must match "${baseline.route}" (${baseline.styles.lineHeight})`
            ).toBe(baseline.styles.lineHeight);

            expect(
              current.styles.fontWeight,
              `Role "${role}" font-weight on "${current.route}" (${current.styles.fontWeight}) must match "${baseline.route}" (${baseline.styles.fontWeight})`
            ).toBe(baseline.styles.fontWeight);

            expect(
              current.styles.color,
              `Role "${role}" color on "${current.route}" (${current.styles.color}) must match "${baseline.route}" (${baseline.styles.color})`
            ).toBe(baseline.styles.color);

            expect(
              current.styles.letterSpacing,
              `Role "${role}" letter-spacing on "${current.route}" (${current.styles.letterSpacing}) must match "${baseline.route}" (${baseline.styles.letterSpacing})`
            ).toBe(baseline.styles.letterSpacing);

            // For headings and body, verify margin-bottom rule
            if (['h1', 'h2', 'h3', 'h4', 'paragraph'].includes(role)) {
              expect(
                current.styles.marginBottom,
                `Role "${role}" margin-bottom on "${current.route}" (${current.styles.marginBottom}) must match "${baseline.route}" (${baseline.styles.marginBottom})`
              ).toBe(baseline.styles.marginBottom);
            }
          }
        }
      });
    }
  }
});
