// Generates a real, branded Open Graph / Twitter Card preview image
// (audit: "No Open Graph / Twitter image -- 0 of 248 pages have
// og:image", so links shared on X/LinkedIn show no preview card at
// all). Renders a real HTML/CSS template through the same Playwright
// headless browser this project already uses for prerendering, at the
// standard 1200x630 social-preview size, rather than hand-drawing a
// raster image or pulling in a design tool -- this site's own real
// brand colors/fonts (theme.css's dark palette, Space Mono), not a
// generic placeholder.
//
// One static image for the whole site for now, not a per-page dynamic
// one -- that's a real, larger follow-up (a build-time template per
// page title/category), deliberately deferred rather than rushed in
// the same pass. This closes the acute part of the gap: right now
// literally zero pages have any preview image; one real image fixes
// that for all of them at once.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT_FILE = join(ROOT, 'public', 'og-image.png');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Space Mono';
    src: local('Space Mono');
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1200px;
    height: 630px;
    background: #0a0a0b;
    background-image: radial-gradient(circle at 15% 20%, rgba(61, 220, 151, 0.14), transparent 45%),
                       radial-gradient(circle at 85% 85%, rgba(61, 220, 151, 0.08), transparent 50%);
    font-family: 'Space Mono', ui-monospace, Menlo, Consolas, monospace;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 90px;
    position: relative;
    overflow: hidden;
  }
  .eyebrow {
    color: #3ddc97;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 28px;
  }
  .wordmark {
    color: #f5f5f7;
    font-size: 76px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.05;
    margin-bottom: 26px;
  }
  .tagline {
    color: #a6adb8;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.5;
    max-width: 920px;
  }
  .accent-bar {
    position: absolute;
    left: 90px;
    bottom: 72px;
    width: 120px;
    height: 6px;
    background: #3ddc97;
    border-radius: 3px;
  }
</style>
</head>
<body>
  <div class="eyebrow">AI &amp; Machine Learning, Properly Explained</div>
  <div class="wordmark">Neural Mastery</div>
  <div class="tagline">Real, computed, interactive visualizations and zero-setup in-browser Python &mdash; not static diagrams or video lectures.</div>
  <div class="accent-bar"></div>
</body>
</html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot({ type: 'png' });
  writeFileSync(OUT_FILE, buffer);
  await browser.close();
  console.log(`generate-og-image: wrote ${OUT_FILE}`);
}

main();
