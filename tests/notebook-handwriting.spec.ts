import { test, expect, type Page } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;
const BASE = `http://localhost:${PORT}`;

const PAGES = [
  '/',
  '/learn',
  '/labs',
  '/interview',
  '/interview/q/genai-chunking-strategies',
  '/interview/mock',
  '/study-plans',
  '/blog',
  '/docs/machine-learning/linear-regression',
  '/docs/deep-learning/attention-transformers',
];

// Every visible piece of text must be handwritten. Code may be monospace and
// typeset maths keeps its own faces; nothing else may use a computer font.
async function fontOffenders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const CODE = 'pre, code, kbd, samp, .katex, .cm-editor, .monaco-editor, textarea';
    const MATH = '.katex, math';
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (el.closest(MATH)) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const hasText = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 1,
      );
      if (!hasText) continue;
      const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      if (family === 'Kalam') continue;
      const isCode = el.closest(CODE) !== null || style.whiteSpace.startsWith('pre');
      if (isCode && /mono/i.test(family)) continue;
      const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
      offenders.push(`${family} <${el.tagName.toLowerCase()} class="${cls}"> ${(el.textContent ?? '').trim().slice(0, 30)}`);
    }
    return offenders;
  });
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nm-navbar-header');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

test.describe('White notebook: one handwritten face everywhere', () => {
  test('a first visit opens the white notebook', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await open(page, '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pure-white');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    expect(await page.evaluate(() => document.fonts.check("16px 'Kalam'"))).toBe(true);
  });

  for (const path of PAGES) {
    test(`no computer text on ${path}`, async ({ page }) => {
      await open(page, path);
      expect(await fontOffenders(page)).toEqual([]);
    });
  }

  test('no computer text in the open menu', async ({ page }) => {
    await open(page, '/');
    await page.locator('.nm-navbar-primary-toggle').click();
    await expect(page.getByRole('link', { name: 'Study plans' }).first()).toBeVisible();
    expect(await fontOffenders(page)).toEqual([]);
  });

  test('no computer text on a phone or in the dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => localStorage.setItem('neural-mastery-theme', 'dark'));
    for (const path of ['/', '/interview', '/blog', '/study-plans']) {
      await open(page, path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await fontOffenders(page), path).toEqual([]);
    }
  });

  test('the progress legend is one continuous 0 to 100 scale', async ({ page }) => {
    await open(page, '/interview');
    await expect(page.locator('.si-legend-bar')).toHaveCount(1);
    await expect(page.locator('.si-legend-ticks')).toHaveText(/0%.*25%.*50%.*75%.*100%/);
  });
});
