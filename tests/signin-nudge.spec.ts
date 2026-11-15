import { test, expect } from '@playwright/test';

test.describe('Sign-in nudge', () => {
  test.beforeEach(async ({ page, context }) => {
    // Stub Firebase Auth & Google endpoints so app settles signed-out without network
    await page.route('**/*identitytoolkit*/**', (route) => route.abort());
    await page.route('**/*securetoken*/**', (route) => route.abort());
    await page.route('**/*googleapis*/**', (route) => route.abort());
    await page.route('**/*firebase*/**', (route) => route.abort());

    await context.clearCookies();
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test('signed-out user sees nudge after 5s, dismisses, reload keeps it hidden', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-15T12:00:00.000Z') });
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Before 5000ms: no nudge
    await page.clock.fastForward(4000);
    await expect(page.locator('.nm-signin-nudge')).toHaveCount(0);

    // After 5000ms: exact heading, copy, actions, and close control appear
    await page.clock.fastForward(2000);
    const nudge = page.locator('.nm-signin-nudge');
    await expect(nudge).toBeVisible();

    await expect(nudge.locator('#nm-signin-nudge-title')).toHaveText('Save your progress');
    await expect(nudge.locator('.nm-signin-nudge-body')).toHaveText(
      'Sign in to keep your points, streak and interview progress on every device.',
    );
    await expect(nudge.locator('.nm-signin-nudge-btn-primary')).toHaveText('Sign in with Google');
    await expect(nudge.locator('.nm-signin-nudge-btn-secondary')).toHaveText('Use email');
    await expect(nudge.locator('.nm-signin-nudge-close')).toHaveAttribute('aria-label', 'Close');
    await expect(nudge.locator('.nm-signin-nudge-close')).toHaveText('×');

    // Click close
    await nudge.locator('.nm-signin-nudge-close').click();
    await expect(page.locator('.nm-signin-nudge')).toHaveCount(0);

    // Reload, advance 5000ms, and assert the note stays hidden
    await page.reload();
    await page.clock.fastForward(6000);
    await expect(page.locator('.nm-signin-nudge')).toHaveCount(0);
  });

  test('fits mobile viewports at 320px and 375px without horizontal overflow', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-15T12:00:00.000Z') });
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 667 });
      await page.goto('/');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      await page.clock.fastForward(6000);
      await expect(page.locator('.nm-signin-nudge')).toBeVisible();

      const fit = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
      });
      expect(fit).toBe(true);

      // Clean storage for the next viewport iteration
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
    }
  });
});
