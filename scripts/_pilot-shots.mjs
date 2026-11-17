import { chromium } from 'playwright';
const out = process.argv[2];
const url = 'http://127.0.0.1:5184/docs/search-ranking-recommendations/tf-idf';
const b = await chromium.launch();
for (const [w, h] of (process.argv[3] ? JSON.parse(process.argv[3]) : [[1920, 1080], [1440, 900], [375, 812]])) {
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const p = await ctx.newPage();
    await p.addInitScript((t) => { try { localStorage.setItem('neural-mastery-theme', t === 'dark' ? 'dark' : 'pure-white'); localStorage.setItem('nm_signin_nudge_dismissed', '1'); } catch {} }, theme);
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await p.locator('article h1').waitFor({ timeout: 60000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(2500);
    // Code editors only lay out visible lines; scroll through so every one is drawn.
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelector('button[aria-label="Close"]')?.click());
    const th = await p.evaluate(() => document.documentElement.dataset.theme);
    await p.screenshot({ path: `${out}/tfidf-${w}-${theme}.png`, fullPage: true });
    console.log(w, theme, 'theme=', th);
    await ctx.close();
  }
}
await b.close();
