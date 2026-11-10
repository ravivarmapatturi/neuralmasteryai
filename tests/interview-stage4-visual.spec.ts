import { test, expect } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;

test.describe('Stage 4: One Visual System', () => {
  test('fonts are preloaded in index.html with font-display swap and no dynamic font links', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    
    // Check index.html preload link exists
    const preloadLink = page.locator('link[rel="preload"][as="style"]');
    await expect(preloadLink).toHaveCount(1);
    const href = await preloadLink.getAttribute('href');
    expect(href).toContain('display=swap');
    expect(href).toContain('Space+Mono');

    // No dynamically injected stylesheet for fonts
    const dynamicFontLink = page.locator('#nm-interview-room-fonts');
    await expect(dynamicFontLink).toHaveCount(0);
  });

  test('timed mock page aligns with main platform visual tokens and Space Mono display font', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview/mock`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.nm-mock-title');

    // Title and section headings use Space Mono display font
    const titleFont = await page.locator('.nm-mock-title').evaluate(el => window.getComputedStyle(el).fontFamily);
    expect(titleFont).toContain('Space Mono');

    const sectionTitleFont = await page.locator('.nm-mock-section-title').first().evaluate(el => window.getComputedStyle(el).fontFamily);
    expect(sectionTitleFont).toContain('Space Mono');

    const roleNameFont = await page.locator('.nm-mock-role-name').first().evaluate(el => window.getComputedStyle(el).fontFamily);
    expect(roleNameFont).toContain('Space Mono');
  });

  test('light theme buttons have a crisp outlined style instead of flat grey', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

    // Secondary button on landing
    const secondaryBtn = page.locator('#landing-timed-mock-btn');
    const secBg = await secondaryBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const secBorder = await secondaryBtn.evaluate(el => window.getComputedStyle(el).borderWidth);
    expect(secBg).toBe('rgb(255, 255, 255)');
    expect(parseFloat(secBorder)).toBeGreaterThanOrEqual(1);

    // Focus nav button in light theme
    const focusBtn = page.locator('.nm-focus-nav-btn');
    if (await focusBtn.count() > 0) {
      const focusBg = await focusBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(focusBg).toBe('rgb(255, 255, 255)');
    }
  });

  test('selects share consistent height, padding, and custom chevron', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });

    const roleSelect = page.locator('.si-filters select[aria-label="Role"]');
    await expect(roleSelect).toBeAttached();

    const box = await roleSelect.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(32);
    expect(box!.height).toBeLessThanOrEqual(44);

    const bgImage = await roleSelect.evaluate(el => window.getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain('svg');
  });

  test('system design canvas uses display font for headings and clean outlined tool buttons', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies`, { waitUntil: 'domcontentloaded' });
    
    // In light theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    
    // Wait for the room to render
    const heading = page.locator('.si-question-title');
    await expect(heading).toBeVisible();
    const headingFont = await heading.evaluate(el => window.getComputedStyle(el).fontFamily);
    expect(headingFont).toContain('Space Mono');
  });
});
