import { test, expect } from '@playwright/test';

test.describe('Guided Build Mode (v1: react-agent-loop)', () => {
  test('toggle guided mode, progressive 5-step scaffold, real reference assembly, and Pyodide verification', async ({ page }) => {
    // 1. Navigate to react-agent-loop practice page
    await page.goto('/practice/react-agent-loop');
    await page.waitForLoadState('load');

    // Verify Workspace Mode toggle includes Canvas, Python, and Guided
    const toggle = page.locator('[data-testid="canvas-python-toggle"]');
    await expect(toggle).toBeVisible();

    const canvasTab = page.locator('[data-testid="toggle-canvas-mode"]');
    const pythonTab = page.locator('[data-testid="toggle-python-mode"]');
    const guidedTab = page.locator('[data-testid="toggle-guided-mode"]');

    await expect(canvasTab).toBeVisible();
    await expect(pythonTab).toBeVisible();
    await expect(guidedTab).toBeVisible();

    // 2. Switch to Guided Mode
    await guidedTab.click();
    await expect(guidedTab).toHaveAttribute('aria-selected', 'true');

    const guidedPane = page.locator('[data-testid="guided-build-pane"]');
    await expect(guidedPane).toBeVisible();

    // Verify Step 1 is active
    const stepIndicator = page.locator('[data-testid="guided-step-indicator"]');
    const stepTitle = page.locator('[data-testid="guided-step-title"]');
    const stepPrompt = page.locator('[data-testid="guided-step-prompt"]');

    await expect(stepIndicator).toContainText('Step 1 of 5');
    await expect(stepTitle).toContainText('Step 1: Handle Final Answer & Loop Termination');
    await expect(stepPrompt).toContainText('Final Answer:');

    // Screenshot Step 1 - Dark theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/01_step1_dark.png', fullPage: true });

    // Screenshot Step 1 - Light theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/01_step1_light.png', fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    // Submit Step 1 -> Advance to Step 2
    const submitStepBtn = page.locator('[data-testid="submit-guided-step-btn"]');
    await expect(submitStepBtn).toBeVisible();
    await submitStepBtn.click();

    // Verify Step 2
    await expect(stepIndicator).toContainText('Step 2 of 5');
    await expect(stepTitle).toContainText('Step 2: Parse Action and Action Input with Regex');

    // Submit Step 2 -> Advance to Step 3
    await submitStepBtn.click();

    // Verify Step 3
    await expect(stepIndicator).toContainText('Step 3 of 5');
    await expect(stepTitle).toContainText('Step 3: Extract Strings and Verify Tool Registry');

    // Screenshot Step 3 - Dark theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/02_step3_dark.png', fullPage: true });

    // Screenshot Step 3 - Light theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/02_step3_light.png', fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    // Submit Step 3 -> Advance to Step 4
    await submitStepBtn.click();

    // Verify Step 4
    await expect(stepIndicator).toContainText('Step 4 of 5');
    await expect(stepTitle).toContainText('Step 4: Execute Tool with Safe Exception Handling');

    // Submit Step 4 -> Advance to Step 5
    await submitStepBtn.click();

    // Verify Step 5
    await expect(stepIndicator).toContainText('Step 5 of 5');
    await expect(stepTitle).toContainText('Step 5: Return Loop Observation and Continue Status');

    // Submit Step 5 -> All 5 Steps Complete!
    await submitStepBtn.click();

    // Verify Completion
    await expect(stepIndicator).toContainText('All 5 Steps Completed ✓');
    const completionBanner = page.locator('[data-testid="guided-completion-banner"]');
    await expect(completionBanner).toBeVisible();
    await expect(completionBanner).toContainText('All 5 Steps Completed & Verified!');

    // Screenshot Step 5 / Complete - Dark theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/03_step5_dark.png', fullPage: true });

    // Screenshot Step 5 / Complete - Light theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'scratch/screenshots/03_step5_light.png', fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    // Verify Run & Submit buttons appear now that step 5 is complete
    const runBtn = page.locator('[data-testid="run-code-btn"]');
    const submitBtn = page.locator('[data-testid="submit-code-btn"]');
    await expect(runBtn).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // 3. Test real Pyodide execution through the real Submit path
    await submitBtn.click();

    // Pyodide loads and executes the complete reference solution against the real test suite
    // Wait for the submission result to appear in the DOM
    const resultStatus = page.locator('text=Passed').or(page.locator('text=Problem Solved!'));
    await expect(resultStatus.first()).toBeVisible({ timeout: 25000 });

    // Screenshot after successful real execution
    await page.screenshot({ path: 'scratch/screenshots/04_real_pyodide_test_passed.png', fullPage: true });
  });
});
