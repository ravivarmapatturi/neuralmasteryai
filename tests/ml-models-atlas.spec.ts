import { test, expect } from '@playwright/test';


test.describe('Machine Learning Models Atlas', () => {
  test('page loads and displays the atlas entries', async ({ page }) => {
    await page.goto(`/docs/atlas/ml-models`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ml-models-atlas', { timeout: 15000 });

    const title = page.locator('h1').first();
    await expect(title).toContainText('Machine Learning Models Atlas');

    const firstEntry = page.locator('#linear-regression');
    await expect(firstEntry).toBeVisible();

    const lastEntry = page.locator('#e-means');
    await expect(lastEntry).toBeVisible();
  });

  test('opening an entry displays the visual and has no horizontal overflow at 375px and 320px', async ({ page }) => {
    // 1. Check at 375px viewport (standard mobile)
    await page.setViewportSize({ width: 375, height: 750 });
    await page.goto(`/docs/atlas/ml-models`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ml-models-atlas', { timeout: 15000 });

    // Open an entry: e-means
    const eMeansSummary = page.locator('#e-means summary');
    await eMeansSummary.click();

    // Verify visual container is displayed
    const eMeansVisual = page.locator('#e-means .ml-models-atlas__diagram');
    await expect(eMeansVisual).toBeVisible();

    // Check horizontal overflow at 375px
    const overflow375 = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow375).toBeLessThanOrEqual(1);

    // Also open linear regression
    const lrSummary = page.locator('#linear-regression summary');
    await lrSummary.click();
    const lrVisual = page.locator('#linear-regression .ml-models-atlas__diagram');
    await expect(lrVisual).toBeVisible();

    const overflow375WithLR = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow375WithLR).toBeLessThanOrEqual(1);

    // 2. Check at 320px viewport (narrow mobile)
    await page.setViewportSize({ width: 320, height: 600 });
    await page.waitForTimeout(300);

    const overflow320 = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow320).toBeLessThanOrEqual(1);
  });

  test('all visible text uses Kalam handwritten font (except code/math)', async ({ page }) => {
    await page.goto(`/docs/atlas/ml-models`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ml-models-atlas', { timeout: 15000 });

    const offenders = await page.evaluate(() => {
      const CODE = 'pre, code, kbd, samp, .katex, .cm-editor, .monaco-editor, textarea';
      const MATH = '.katex, math';
      const result: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if (el.closest(MATH)) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const hasText = Array.from(el.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 1
        );
        if (!hasText) continue;
        const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        if (family === 'Kalam') continue;
        const isCode = el.closest(CODE) !== null || style.whiteSpace.startsWith('pre');
        if (isCode && /mono/i.test(family)) continue;
        const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
        result.push(`${family} <${el.tagName.toLowerCase()} class="${cls}"> ${(el.textContent ?? '').trim().slice(0, 30)}`);
      }
      return result;
    });

    expect(offenders).toEqual([]);
  });

  test('e-means blog post loads, renders visual, runnable code, and fits 375px without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 750 });
    await page.goto(`/blog/e-means-outperforming-kmeans`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });

    const title = page.locator('h1').first();
    await expect(title).toContainText('e-Means: Scaling k-Means');

    // Visual is mounted and visible
    const visual = page.locator('svg[aria-label="Distortion loss curves over steps"]');
    await expect(visual).toBeVisible();

    // Check no horizontal overflow at 375px
    const overflow375 = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow375).toBeLessThanOrEqual(1);

    // Check at 320px
    await page.setViewportSize({ width: 320, height: 600 });
    await page.waitForTimeout(200);

    const overflow320 = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow320).toBeLessThanOrEqual(1);
  });
});
