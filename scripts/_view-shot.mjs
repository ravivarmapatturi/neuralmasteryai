import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w, theme, collapse] of [[1920, 'light', false], [1920, 'light', true], [1920, 'dark', false], [375, 'light', false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1080 }, colorScheme: theme });
  const p = await ctx.newPage();
  await p.addInitScript((t) => { try { localStorage.setItem('neural-mastery-theme', t === 'dark' ? 'dark' : 'pure-white'); } catch {} }, theme);
  await p.goto('http://127.0.0.1:5184/docs/search-ranking-recommendations/tf-idf', { waitUntil: 'networkidle', timeout: 120000 });
  await p.locator('article h1').waitFor({ timeout: 60000 });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('button[aria-label="Close"]')?.click());
  if (collapse) { for (const btn of await p.locator('.nm-panel-toggle').all()) { await btn.click().catch(() => {}); } await p.waitForTimeout(600); }
  await p.evaluate(() => window.scrollTo(0, 1100)); await p.waitForTimeout(500);
  await p.screenshot({ path: `docs/evidence/pilot-tfidf/view-${w}-${theme}${collapse ? '-collapsed' : ''}.png` });
  console.log(w, theme, collapse);
  await ctx.close();
}
await b.close();
