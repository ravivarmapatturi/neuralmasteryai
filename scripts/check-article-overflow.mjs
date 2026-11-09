/** Focused dev-server check; does not build or start a server.
 * Run: node scripts/check-article-overflow.mjs [http://127.0.0.1:5173]
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:5173';
const routes = [
  ['/docs/context-engineering/token-budgeting-and-compaction', 'Token Budgeting, Sliding Windows & Compaction Strategies'],
  ['/blog/what-is-changing-in-ai-engineering-and-what-to-learn-next', 'What Is Changing in AI Engineering and What to Learn Next'],
];
const browser = await chromium.launch();
try {
  for (const width of [375, 1440]) {
    for (const theme of ['light', 'dark']) {
      for (const [route, title] of routes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        try {
          await page.addInitScript(mode => localStorage.setItem('neural-mastery-theme', mode), theme);
          await page.goto(new URL(route, baseURL).href);
          await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
          await page.evaluate(() => document.fonts.ready);
          // Visit the whole article so lazy visualizers participate in layout.
          for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 600) {
            await page.evaluate(top => scrollTo(0, top), y);
            await page.waitForTimeout(100);
          }
          await page.waitForTimeout(500);
          const result = await page.evaluate(() => ({
            theme: document.documentElement.dataset.theme,
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
          }));
          console.log(JSON.stringify({ route, ...result }));
          assert.equal(result.theme, theme);
          assert.equal(result.scrollWidth, width, `${route}: document overflow in ${theme}`);
          assert.equal(result.bodyScrollWidth, width, `${route}: body overflow in ${theme}`);
        } finally {
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
