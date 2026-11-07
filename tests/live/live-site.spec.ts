import { expect, test } from '@playwright/test';

// Runs against the deployed site (playwright.live.config.ts), weekly and on demand.
// Checks that the main pages render real content with no console errors.
const PAGES: Array<[string, RegExp]> = [
  ['', /Learn AI by/],
  ['learn', /All topics/i],
  ['labs', /./],
  ['interview/questions', /Explain the choices/],
  ['interview/topics', /Interview questions by topic/],
  ['study-plans', /./],
  ['leaderboard', /Leaderboard/i],
  ['changelog', /Changelog/],
  ['docs/deep-learning/attention-transformers', /Attention/],
  ['blog', /./],
];

for (const [route, heading] of PAGES) {
  test(`/${route} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toHaveText(heading, { timeout: 20_000 });
    expect(errors).toEqual([]);
  });
}
