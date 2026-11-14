import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOTS_DIR = join(process.cwd(), 'docs', 'screenshots', 'focus');

test.describe('Focus Screen Time & Distraction-Free Mode E2E', () => {
  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
  });

  test.beforeAll(() => {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  test('screen time increases while visible, stops on hidden and blur, resumes on focus, and reload keeps today total', async ({ page }) => {
    const startTime = new Date('2026-11-14T10:00:00.000Z');
    await page.clock.install({ time: startTime });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');

    // Confirm initial state
    await expect(page.locator('h1.nm-focus-title')).toHaveText('Focus');
    await expect(page.locator('.nm-focus-digits')).toHaveText('00:00');
    await expect(page.locator('.nm-timer-nav-countdown')).toHaveText('00:00');

    // 1. Time increases while the page is visible
    await page.clock.fastForward(5000);
    await expect(page.locator('.nm-focus-digits')).toHaveText('00:05');
    await expect(page.locator('.nm-timer-nav-countdown')).toHaveText('00:05');

    // 2. After dispatching visibilitychange (hidden) and blur it stops
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
    });

    // Advance clock 10 seconds while hidden/blurred
    await page.clock.fastForward(10000);
    // Time must NOT advance while hidden/blurred
    await expect(page.locator('.nm-focus-digits')).toHaveText('00:05');
    await expect(page.locator('.nm-timer-nav-countdown')).toHaveText('00:05');

    // 3. It resumes on visible + focus
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await page.clock.fastForward(3000);
    await expect(page.locator('.nm-focus-digits')).toHaveText('00:08');
    await expect(page.locator('.nm-timer-nav-countdown')).toHaveText('00:08');

    // 4. Reload keeps today's total
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.nm-focus-digits')).toHaveText('00:08');
    await expect(page.locator('.nm-timer-nav-countdown')).toHaveText('00:08');

    // 5. Manual pause stops counting, resume continues
    const navBtn = page.locator('.nm-navbar-nav .nm-timer-nav-btn');
    await navBtn.click();
    await page.waitForSelector('.nm-timer-popover', { state: 'visible' });

    const pauseBtn = page.locator('.nm-timer-popover').getByRole('button', { name: 'Pause timer', exact: true });
    await pauseBtn.click();
    await expect(page.locator('.nm-timer-popover').getByRole('button', { name: 'Resume timer', exact: true })).toBeVisible();

    await page.clock.fastForward(5000);
    // Did not count while paused
    await expect(page.locator('.nm-timer-popover-digits')).toHaveText('00:08');

    // Resume
    await page.locator('.nm-timer-popover').getByRole('button', { name: 'Resume timer', exact: true }).click();
    await page.clock.fastForward(2000);
    await expect(page.locator('.nm-timer-popover-digits')).toHaveText('00:10');

    await page.keyboard.press('Escape');
  });

  test('distraction-free mode hides navbar extras, sidebars, TOC, footer, and exit button restores them', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs/deep-learning/attention-transformers');
    await page.waitForLoadState('domcontentloaded');

    // Verify default layout elements are visible
    const sidebar = page.locator('.nm-sidebar-wrap');
    const toc = page.locator('.nm-toc-wrap');
    const footer = page.getByRole('contentinfo');
    const searchBtn = page.locator('.nm-navbar-search-btn');

    await expect(sidebar).toBeVisible();
    await expect(toc).toBeVisible();
    await expect(footer).toBeVisible();
    await expect(searchBtn).toBeVisible();

    // Open timer popover and turn on Distraction-free switch
    const navBtn = page.locator('.nm-navbar-nav .nm-timer-nav-btn');
    await navBtn.click();
    await page.waitForSelector('.nm-timer-popover', { state: 'visible' });

    const dfSwitch = page.locator('.nm-timer-popover').getByRole('switch', { name: 'Distraction-free' });
    await dfSwitch.click();

    // Verify distraction-free class is present on <html>
    await expect(page.locator('html')).toHaveClass(/distraction-free/);

    // Verify navbar extras, sidebar, TOC, and footer are hidden
    await expect(sidebar).toBeHidden();
    await expect(toc).toBeHidden();
    await expect(footer).toBeHidden();
    await expect(searchBtn).toBeHidden();

    // Verify Exit distraction-free button and today's focus time are visible
    const exitBtn = page.locator('.nm-navbar-nav .nm-exit-distraction-free-btn');
    await expect(exitBtn).toBeVisible();
    await expect(page.locator('.nm-navbar-nav .nm-distraction-free-time')).toBeVisible();

    // Capture screenshot of distraction-free view
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'distraction-free.png'), fullPage: false });

    // Click Exit distraction-free button
    await exitBtn.click();

    // Verify distraction-free class is removed and extras are restored
    await expect(page.locator('html')).not.toHaveClass(/distraction-free/);
    await expect(sidebar).toBeVisible();
    await expect(toc).toBeVisible();
    await expect(footer).toBeVisible();
    await expect(searchBtn).toBeVisible();
    await expect(exitBtn).toBeHidden();
  });

  test('captures screenshots of navbar control, popover, and distraction-free view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');

    // 1. Capture navbar control screenshot
    const navBtn = page.locator('.nm-navbar-nav .nm-timer-nav-btn');
    await expect(navBtn).toBeVisible();
    await navBtn.screenshot({ path: join(SCREENSHOTS_DIR, 'navbar-control.png') });

    // 2. Open popover and capture screenshot
    await navBtn.click();
    const popover = page.locator('.nm-timer-popover');
    await expect(popover).toBeVisible();
    await popover.screenshot({ path: join(SCREENSHOTS_DIR, 'popover.png') });

    await page.keyboard.press('Escape');
  });

  for (const width of [320, 375]) {
    test(`no horizontal overflow at ${width}px in normal and distraction-free modes`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      for (const route of ['/focus', '/learn', '/labs', '/interview', '/docs/deep-learning/attention-transformers']) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(() => document.fonts.ready);

        // Measure normal layout width
        const scrollWidthNormal = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidthNormal, `Normal mode overflow on ${route} at ${width}px`).toBe(width);

        // Turn on distraction-free class
        await page.evaluate(() => document.documentElement.classList.add('distraction-free'));
        const scrollWidthDF = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidthDF, `Distraction-free overflow on ${route} at ${width}px`).toBe(width);

        // Clean up class
        await page.evaluate(() => document.documentElement.classList.remove('distraction-free'));
      }
    });
  }
});
