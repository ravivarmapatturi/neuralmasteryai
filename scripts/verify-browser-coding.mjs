import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('docs/evidence/interview');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

// 3 problems to verify
const testProblems = [
  {
    qId: 'senior:coding-chunker-token-aware',
    problemId: 'coding-text-chunker',
    titleSnippet: 'token-aware recursive text chunker',
  },
  {
    qId: 'senior:coding-token-bucket-rate-limiter',
    problemId: 'coding-token-bucket',
    titleSnippet: 'token bucket rate limiter',
  },
  {
    qId: 'senior:coding-reciprocal-rank-fusion',
    problemId: 'coding-reciprocal-rank-fusion',
    titleSnippet: 'Reciprocal Rank Fusion (RRF)',
  },
];

const problemSets = JSON.parse(fs.readFileSync('src/data/practice/problemSets.generated.json', 'utf-8'));
const solutions = new Map(problemSets.map((p) => [p.id, p.solution]));

async function runBrowserChecks() {
  console.log('Launching browser for real Pyodide checks...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { width: 1440, height: 900, name: '1440' },
    { width: 375, height: 812, name: '375' },
  ];

  const themes = ['light', 'dark'];
  const logReport = [];

  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`\n=== Testing Viewport ${vp.name} (${vp.width}x${vp.height}) - Theme: ${theme} ===`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });

      const page = await context.newPage();

      // Ensure theme is set on html
      await page.addInitScript((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      for (let pIdx = 0; pIdx < testProblems.length; pIdx++) {
        const prob = testProblems[pIdx];
        const solution = solutions.get(prob.problemId);
        console.log(`\nTesting problem ${pIdx + 1}/3: ${prob.problemId} on ${vp.name}-${theme}`);

        // 1. Open /interview?topic=coding
        await page.goto('http://localhost:5173/interview?topic=coding', { waitUntil: 'networkidle' });

        // Ensure theme applied
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        // Find the question in the list and click it
        const qButton = page.locator('.si-list button').filter({ hasText: prob.titleSnippet }).first();
        await qButton.waitFor({ state: 'visible', timeout: 10000 });
        await qButton.dispatchEvent('click');

        // 2. Question asking screen is visible
        const titleEl = page.locator('.si-question-title');
        await titleEl.waitFor({ state: 'visible', timeout: 10000 });
        console.log('  1. Opened question on /interview');

        // Confirm open code editor button is present
        const openEditorBtn = page.locator('#open-code-editor-asking');
        await openEditorBtn.waitFor({ state: 'visible', timeout: 5000 });

        // 3. Open editor overlay
        await openEditorBtn.click();
        const overlay = page.locator('.si-code-overlay');
        await overlay.waitFor({ state: 'visible', timeout: 10000 });
        console.log('  2. Editor overlay opened');

        // Check if on mobile
        const isMobile = vp.width < 768;

        if (isMobile) {
          // On mobile, default tab is 'Problem'. Reference solution card should be visible.
          const lockedText = page.locator('text=Run or submit your code to unlock the verified reference solution');
          await lockedText.waitFor({ state: 'visible', timeout: 10000 });
          console.log('  3. Reference solution locked before attempt on mobile: true');

          // Take screenshot of mobile overlay in problem tab (showing locked reference)
          const screenshotLocked = path.join(evidenceDir, `overlay-${prob.problemId}-${vp.name}-${theme}-locked.png`);
          await page.screenshot({ path: screenshotLocked, fullPage: false });
          console.log(`  Screenshot saved: ${screenshotLocked}`);

          // Switch to 'Code' tab
          const codeTabBtn = page.getByRole('button', { name: 'Code', exact: true });
          await codeTabBtn.click();
          await page.locator('.cm-editor').waitFor({ state: 'visible', timeout: 15000 });

          // Run wrong starter code
          console.log('  4. Running wrong solution through real Pyodide...');
          const runBtn = page.getByRole('button', { name: /▶ Run|Run/i }).first();
          await runBtn.click();

          // Wait for test results to populate with failures
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return text.includes('failed') || text.includes('0 /') || text.includes('Failed') || text.includes('Wrong');
          }, { timeout: 35000 });
          console.log('  -> Observed failures from wrong solution in real Pyodide');

          // Switch back to 'Problem' tab to confirm reference solution unlocked
          const problemTabBtn = page.getByRole('button', { name: 'Problem', exact: true });
          await problemTabBtn.click();
          const unlockSummary = page.locator('text=Show verified reference solution');
          await unlockSummary.waitFor({ state: 'visible', timeout: 5000 });
          console.log('  -> Reference solution unlocked after attempt!');

          // Switch back to 'Code' tab to inject right solution
          await codeTabBtn.click();
          await page.locator('.cm-editor').waitFor({ state: 'visible', timeout: 5000 });

          console.log('  5. Injecting reference solution into editor...');
          await page.evaluate((code) => {
            const cm = document.querySelector('.cm-editor');
            if (cm && cm.cmView && cm.cmView.view) {
              const view = cm.cmView.view;
              view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: code },
              });
            } else {
              const input = document.querySelector('.cm-content');
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, code);
            }
          }, solution);

          // Submit right solution
          console.log('  Submitting right solution...');
          const submitBtn = page.getByRole('button', { name: /Submit/i }).first();
          await submitBtn.click();

          // Wait for test results to show pass
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return (text.includes('All tests passed') || text.includes('passed')) && !text.includes('failed') && !text.includes('Running');
          }, { timeout: 35000 });
          console.log('  -> Observed PASS for right solution in real Pyodide');

          // Take screenshot of passed state on mobile
          const screenshotPassed = path.join(evidenceDir, `overlay-${prob.problemId}-${vp.name}-${theme}-passed.png`);
          await page.screenshot({ path: screenshotPassed, fullPage: false });
          console.log(`  Screenshot saved: ${screenshotPassed}`);
        } else {
          // Desktop: panels side by side
          await page.locator('.cm-editor').waitFor({ state: 'visible', timeout: 15000 });

          // 4. Confirm reference solution stays locked before attempt
          const lockedText = page.locator('text=Run or submit your code to unlock the verified reference solution');
          const isLocked = await lockedText.isVisible();
          console.log(`  3. Reference solution locked before attempt: ${isLocked}`);
          if (!isLocked) {
            throw new Error('Reference solution was NOT locked before attempt!');
          }

          // Take screenshot of editor overlay while locked
          const screenshotLocked = path.join(evidenceDir, `overlay-${prob.problemId}-${vp.name}-${theme}-locked.png`);
          await page.screenshot({ path: screenshotLocked, fullPage: false });
          console.log(`  Screenshot saved: ${screenshotLocked}`);

          // 5. Run wrong solution (default starter code) through real Pyodide
          console.log('  4. Running wrong solution through real Pyodide...');
          const runBtn = page.getByRole('button', { name: /▶ Run|Run/i }).first();
          await runBtn.click();

          // Wait for test results to populate with failures
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return text.includes('failed') || text.includes('0 /') || text.includes('Failed') || text.includes('Wrong');
          }, { timeout: 35000 });
          console.log('  -> Observed failures from wrong solution in real Pyodide');

          // Confirm reference solution is now UNLOCKED
          const unlockSummary = page.locator('text=Show verified reference solution');
          await unlockSummary.waitFor({ state: 'visible', timeout: 5000 });
          console.log('  -> Reference solution unlocked after attempt!');

          // 6. Run right solution and see it pass
          console.log('  5. Injecting reference solution into editor...');
          await page.evaluate((code) => {
            const cm = document.querySelector('.cm-editor');
            if (cm && cm.cmView && cm.cmView.view) {
              const view = cm.cmView.view;
              view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: code },
              });
            } else {
              const input = document.querySelector('.cm-content');
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, code);
            }
          }, solution);

          // Click Submit to run all test cases and award completion
          console.log('  Submitting right solution...');
          const submitBtn = page.getByRole('button', { name: /Submit/i }).first();
          await submitBtn.click();

          // Wait for test results to show all passed
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return (text.includes('All tests passed') || text.includes('passed')) && !text.includes('failed') && !text.includes('Running');
          }, { timeout: 35000 });
          console.log('  -> Observed PASS for right solution in real Pyodide');

          // Take screenshot of editor overlay showing PASS and unlocked solution
          const screenshotPassed = path.join(evidenceDir, `overlay-${prob.problemId}-${vp.name}-${theme}-passed.png`);
          await page.screenshot({ path: screenshotPassed, fullPage: false });
          console.log(`  Screenshot saved: ${screenshotPassed}`);
        }

        // Return to the same question
        console.log('  6. Returning to interview question...');
        const returnBtn = page.getByRole('button', { name: /Return to interview/i });
        await returnBtn.click();

        // Wait for overlay to disappear
        await overlay.waitFor({ state: 'hidden', timeout: 5000 });

        // Confirm Solved badge shows
        const solvedBadge = page.locator('.si-solved-badge');
        await solvedBadge.waitFor({ state: 'visible', timeout: 5000 });
        const badgeText = await solvedBadge.innerText();
        console.log(`  7. Solved badge displayed: "${badgeText.trim()}"`);

        // Check points in localStorage
        const pointsBefore = await page.evaluate(() => {
          const stored = localStorage.getItem('nm_user_progress');
          if (!stored) return 0;
          try {
            return JSON.parse(stored).points || 0;
          } catch {
            return 0;
          }
        });
        console.log(`  Points before reload: ${pointsBefore}`);

        // Reload page
        console.log('  8. Reloading page...');
        await page.reload({ waitUntil: 'networkidle' });

        // Ensure theme applied after reload
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        // If on topics list after reload, enter the question
        if (!await page.locator('.si-question-title').isVisible()) {
          const qBtnAfter = page.locator('.si-list button').filter({ hasText: prob.titleSnippet }).first();
          await qBtnAfter.dispatchEvent('click');
        }

        // Confirm Solved still shows after reload
        const solvedBadgeAfter = page.locator('.si-solved-badge');
        await solvedBadgeAfter.waitFor({ state: 'visible', timeout: 5000 });
        console.log('  -> Solved badge persists after reload');

        // Confirm points were not awarded again (identical points)
        const pointsAfter = await page.evaluate(() => {
          const stored = localStorage.getItem('nm_user_progress');
          if (!stored) return 0;
          try {
            return JSON.parse(stored).points || 0;
          } catch {
            return 0;
          }
        });
        console.log(`  Points after reload: ${pointsAfter} (awarded once: ${pointsBefore === pointsAfter})`);

        logReport.push({
          viewport: vp.name,
          theme,
          problemId: prob.problemId,
          lockedBefore: true,
          wrongSolutionFailed: true,
          unlockedAfterWrong: true,
          rightSolutionPassed: true,
          solvedBadgeVisible: true,
          persistsAfterReload: true,
          pointsAwardedOnce: pointsBefore === pointsAfter,
        });
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('\n=== REAL BROWSER VERIFICATION REPORT ===');
  console.table(logReport);
}

runBrowserChecks().catch((err) => {
  console.error('Browser check failed:', err);
  process.exit(1);
});
