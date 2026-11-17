import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w, theme, reveal] of [[1440, 'light', false], [1440, 'light', true], [375, 'light', false], [1440, 'dark', true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
  const p = await ctx.newPage();
  await p.addInitScript((t) => { try { localStorage.setItem('neural-mastery-theme', t === 'dark' ? 'dark' : 'pure-white'); } catch {} }, theme);
  await p.goto('http://127.0.0.1:5184/docs/search-ranking-recommendations/tf-idf', { waitUntil: 'networkidle', timeout: 120000 });
  await p.locator('.nm-worksheet').waitFor({ timeout: 60000 });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('button[aria-label="Close"]')?.click());
  if (reveal) await p.getByRole('button', { name: /show answers/ }).click();
  await p.waitForTimeout(400);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await p.locator('.nm-worksheet').screenshot({ path: `docs/evidence/pilot-tfidf/worksheet-${w}-${theme}${reveal ? '-answers' : ''}.png` });
  console.log(w, theme, reveal, 'page overflow px:', ov);
  await ctx.close();
}
await b.close();
