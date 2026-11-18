import { test, expect } from '@playwright/test';

test.describe('Framework Tier Mode (v1: react-agent-loop)', () => {
  test('mode toggle, educational disclaimer, gap completion, and Pyodide Run/Submit execution', async ({ page }) => {
    // 1. Navigate to react-agent-loop practice page
    await page.goto('/practice/react-agent-loop');
    await page.waitForLoadState('load');

    // 2. Verify mode toggle is present with all modes
    const toggle = page.locator('[data-testid="canvas-python-toggle"]');
    await expect(toggle).toBeVisible();

    const canvasTab = page.locator('[data-testid="toggle-canvas-mode"]');
    const pythonTab = page.locator('[data-testid="toggle-python-mode"]');
    const frameworkTab = page.locator('[data-testid="toggle-framework-mode"]');

    await expect(canvasTab).toBeVisible();
    await expect(pythonTab).toBeVisible();
    await expect(frameworkTab).toBeVisible();

    // 3. Switch to Framework Mode
    await frameworkTab.click();
    await expect(frameworkTab).toHaveAttribute('aria-selected', 'true');

    // 4. Verify Framework Mode elements
    const frameworkPane = page.locator('[data-testid="framework-mode-pane"]');
    await expect(frameworkPane).toBeVisible();

    const disclaimerBanner = page.locator('[data-testid="framework-disclaimer-banner"]');
    await expect(disclaimerBanner).toBeVisible();
    await expect(disclaimerBanner).toContainText('LangGraph API Educational Teaching Model');
    await expect(disclaimerBanner).toContainText('pure-Python teaching shim');

    const gapsCard = page.locator('[data-testid="framework-gaps-card"]');
    await expect(gapsCard).toBeVisible();
    await expect(page.locator('[data-testid="gap-card-gap-1-agent"]')).toContainText('Pending');
    await expect(page.locator('[data-testid="gap-card-gap-2-tools-condition"]')).toContainText('Pending');
    await expect(page.locator('[data-testid="gap-card-gap-3-graph-wiring"]')).toContainText('Pending');

    // Screenshot 1: Framework Mode Initial State (Dark)
    await page.screenshot({ path: 'scratch/screenshots/01_framework_initial_dark.png', fullPage: true });

    // Toggle to Light Theme
    const themeBtn = page.locator('button[aria-label="Toggle color mode"]').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scratch/screenshots/02_framework_initial_light.png', fullPage: true });
      // Switch back to Dark Theme
      await themeBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Fill in the solution gaps
    const fillSolutionBtn = page.locator('[data-testid="framework-fill-solution-btn"]');
    await expect(fillSolutionBtn).toBeVisible();
    await fillSolutionBtn.click();

    // Verify all 3 gaps are marked Completed
    await expect(page.locator('[data-testid="gap-card-gap-1-agent"]')).toContainText('Completed');
    await expect(page.locator('[data-testid="gap-card-gap-2-tools-condition"]')).toContainText('Completed');
    await expect(page.locator('[data-testid="gap-card-gap-3-graph-wiring"]')).toContainText('Completed');

    // 6. Test Pyodide Run execution
    const runBtn = page.locator('[data-testid="framework-run-btn"]');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for execution to finish (Pyodide in-browser execution)
    await expect(page.getByText('Direct Final Answer (No Tools)')).toBeVisible();
    await expect(page.locator('text=Passed').first()).toBeVisible({ timeout: 35000 });

    // 7. Test Pyodide Submit execution
    const submitBtn = page.locator('[data-testid="framework-submit-btn"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify submit passes both test cases and shows completion toast or solved state
    await expect(page.locator('text=Passed').nth(1)).toBeVisible({ timeout: 35000 });

    // Screenshot 3: Framework Mode Passed Verification (Dark)
    await page.screenshot({ path: 'scratch/screenshots/03_framework_passed_dark.png', fullPage: true });

    // Toggle theme to Light mode for passed screenshot
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scratch/screenshots/04_framework_passed_light.png', fullPage: true });
      await themeBtn.click();
    }
  });
});
