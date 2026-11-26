// Captures a real thumbnail of each playground tool's stage for the /playground hub.
// Usage: BASE=http://localhost:5184 node scripts/capture-playground-thumbs.mjs [slug...]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const cat = JSON.parse(fs.readFileSync('src/data/playgroundCatalog.json', 'utf8'));
const base = process.env.BASE || 'http://localhost:5184';
const only = process.argv.slice(2);
const slugs = cat.tools.map((t) => t.slug).filter((s) => !only.length || only.includes(s));
let browser, page;
const open = async () => {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 0.6, reducedMotion: 'reduce' });
};
let ok = 0, n = 0;
for (const slug of slugs) {
  if (n++ % 20 === 0) await open();
  try {
    await page.goto(`${base}/playground/${slug}`, { waitUntil: 'networkidle' });
    const stage = page.locator('.playground-tool__stage');
    await stage.waitFor({ timeout: 15000 });
    await page.addStyleTag({ content: 'header, nav.nm-navbar, .nm-navbar, [class*="navbar"] { display: none !important; }' });
    await page.waitForTimeout(1500);
    const idx = await stage.evaluate((el) => {
      const svgs = [...el.querySelectorAll('svg')];
      let best = -1, area = 40000;
      svgs.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.width * r.height > area) { area = r.width * r.height; best = i; } });
      return best;
    });
    const target = idx >= 0 ? stage.locator('svg').nth(idx) : stage;
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const r = await target.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height }; });
    const h = Math.min(r.h, r.w * 0.62);
    await page.screenshot({ path: `public/playground-thumbs/${slug}.jpg`, type: 'jpeg', quality: 72, fullPage: true, clip: { x: r.x, y: r.y, width: r.w, height: h } });
    ok++;
  } catch (e) { console.log('FAIL', slug, e.message.split('\n')[0]); }
}
console.log(`captured ${ok}/${slugs.length}`);
await browser.close();
