import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EVIDENCE_DIR = join(process.cwd(), 'docs', 'evidence', 'focus');

test.describe('Focus Pomodoro Timer E2E', () => {
  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
  });

  test.beforeAll(() => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test('full focus session lifecycle: start, navigate, reload, finish, break card, stats and screenshots', async ({ page }) => {
    // 1. Install fake clock starting at fixed local/UTC timestamp
    const startTime = new Date('2026-11-09T10:00:00.000Z');
    await page.clock.install({ time: startTime });

    // 2. Open /focus at 1440px desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');

    // Confirm initial state
    const heroTitle = page.locator('h1.nm-focus-title');
    await expect(heroTitle).toHaveText('Focus');
    await expect(page.locator('.nm-focus-digits')).toHaveText('25:00');
    await expect(page.getByText('No focus sessions recorded yet')).toBeVisible();

    // 3. Start focus session
    const startBtn = page.getByRole('button', { name: /start 25m focus/i });
    await startBtn.click();

    // Confirm running state
    await expect(page.locator('.nm-focus-phase-pill')).toHaveText('Focus');
    await expect(page.getByRole('button', { name: /pause timer/i })).toBeVisible();

    // Advance 5 seconds
    await page.clock.fastForward(5000);
    await expect(page.locator('.nm-focus-digits')).toHaveText('24:55');

    // Check navbar control shows countdown
    const navCountdown = page.locator('.nm-timer-nav-btn.is-running .nm-timer-nav-countdown');
    await expect(navCountdown).toHaveText('24:55');

    // 4. Navigate between pages: timer must keep running uninterrupted
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.nm-timer-nav-btn.is-running .nm-timer-nav-countdown')).toHaveText(/^24:\d\d$/);

    await page.goto('/labs');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.nm-timer-nav-btn.is-running .nm-timer-nav-countdown')).toHaveText(/^24:\d\d$/);

    // 5. Reload page: resumes correctly from localStorage
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.nm-timer-nav-btn.is-running .nm-timer-nav-countdown')).toHaveText(/^24:\d\d$/);

    // 6. Return to /focus and finish remaining focus time
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');

    // Fast-forward remainder of the 25 minutes
    await page.clock.fastForward(26 * 60 * 1000);

    // 7. Verify Break Card appears
    const breakCard = page.locator('.nm-timer-break-card');
    await expect(breakCard).toBeVisible();
    await expect(page.getByText('Step away from the screen, stretch, or rest your eyes.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip break' })).toBeVisible();

    // 8. Verify session is recorded in stats on /focus
    await expect(page.getByText('No focus sessions recorded yet')).not.toBeVisible();
    await expect(page.locator('.nm-focus-metrics-grid')).toHaveText(/(25m|26m)/);
    await expect(page.locator('.nm-focus-metrics-grid')).toContainText('1 day');
    await expect(page.locator('.nm-focus-metrics-grid')).toContainText('1 session');

    // Verify 7-day bar chart shows focus time
    await expect(page.locator('.nm-focus-chart-card')).toHaveText(/(25m|26m)/);

    // 9. Navigate to /progress and verify Focus Time card
    await page.goto('/progress');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Focus time', { exact: true })).toBeVisible();
    await expect(page.getByText(/Today:\s*(25m|26m)/)).toBeVisible();
    await expect(page.getByText('Streak: 1 day')).toBeVisible();
    await expect(page.getByRole('link', { name: /open focus timer →/i })).toBeVisible();

    // 10. Capture Evidence Screenshots in docs/evidence/focus/
    // Desktop 1440px Light
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: join(EVIDENCE_DIR, 'focus-desktop-1440-light.png'), fullPage: false });

    // Desktop 1440px Dark
    const themeBtn = page.getByRole('button', { name: /toggle color mode/i });
    await themeBtn.click();
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.screenshot({ path: join(EVIDENCE_DIR, 'focus-desktop-1440-dark.png'), fullPage: false });

    // Desktop Navbar Popover
    const navBtn = page.locator('.nm-timer-nav-btn');
    await navBtn.click();
    await page.waitForSelector('.nm-timer-popover', { state: 'visible' });
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.screenshot({ path: join(EVIDENCE_DIR, 'navbar-desktop-1440-dark.png'), fullPage: false });

    // Switch back to light for mobile shots
    await themeBtn.click();
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.screenshot({ path: join(EVIDENCE_DIR, 'navbar-desktop-1440-light.png'), fullPage: false });

    // Mobile 375px Light
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/focus');
    await page.waitForLoadState('domcontentloaded');

    // Verify no 375px horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBe(375);

    await page.screenshot({ path: join(EVIDENCE_DIR, 'focus-mobile-375-light.png'), fullPage: false });
    await page.screenshot({ path: join(EVIDENCE_DIR, 'navbar-mobile-375-light.png'), clip: { x: 0, y: 0, width: 375, height: 80 } });

    // Mobile 375px Dark
    const mobileThemeBtn = page.getByRole('button', { name: /toggle color mode/i });
    await mobileThemeBtn.click();
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.screenshot({ path: join(EVIDENCE_DIR, 'focus-mobile-375-dark.png'), fullPage: false });

    // Mobile Navbar Dark
    await page.screenshot({ path: join(EVIDENCE_DIR, 'navbar-mobile-375-dark.png'), clip: { x: 0, y: 0, width: 375, height: 80 } });
  });

  for (const width of [320, 375]) {
    test(`mobile timer fits routes at ${width}px idle, running and paused`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const route of ['/focus', '/learn', '/labs', '/interview', '/progress', '/docs/deep-learning/attention-transformers']) {
        await page.goto(route);
        await expect(page.locator('.nm-navbar-header')).toBeVisible();
        const measure = async () => {
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
          const bounds = await page.locator('.nm-navbar-nav').boundingBox();
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        };
        await measure();
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await page.getByRole('button', { name: 'Start focus timer', exact: true }).filter({ visible: true }).click();
        const popover = await page.locator('.nm-timer-popover').boundingBox();
        expect(popover!.x).toBeGreaterThanOrEqual(0);
        expect(popover!.x + popover!.width).toBeLessThanOrEqual(width);
        await page.locator('.nm-timer-popover').getByRole('button', { name: /start/i }).first().click();
        await page.getByRole('button', { name: 'Close focus timer', exact: true }).click();
        await page.getByRole('button', { name: 'Close menu', exact: true }).click();
        await measure();
        await page.locator('.nm-navbar-nav .nm-timer-nav-btn').click();
        await page.getByRole('button', { name: /pause/i }).filter({ visible: true }).first().click();
        await page.keyboard.press('Escape');
        await measure();
        await page.evaluate(() => localStorage.removeItem('nm_focus_timer_state'));
      }
    });
  }

  test('reload after endsAt has passed: session saved exactly once with time up to endsAt only', async ({ page }) => {
    const startTime = new Date('2026-11-09T14:00:00.000Z');
    await page.clock.install({ time: startTime });
    await page.goto('/focus');
    await page.getByRole('button', { name: /start 25m focus/i }).click();

    // Move wall time without firing interval callbacks: the persisted timer is
    // still running and unsaved when a real document reload discovers expiry.
    await page.clock.setSystemTime(new Date(startTime.getTime() + 30 * 60 * 1000));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]'))).toEqual([]);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Break card should be visible
    await expect(page.locator('.nm-timer-break-card')).toBeVisible();

    // Stats should show exactly 25m (not 30m)
    await expect(page.locator('.nm-focus-metrics-grid')).toHaveText(/25m/);
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]'));
    expect(sessions.length).toBe(1);
    expect(sessions[0].focusedSeconds).toBe(1500);

    // Another reload does not duplicate session
    await page.reload();
    await expect(page.locator('.nm-focus-metrics-grid')).toContainText('1 session');
    const sessionsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('nm_focus_sessions') || '[]'));
    expect(sessionsAfter.length).toBe(1);
  });
});
