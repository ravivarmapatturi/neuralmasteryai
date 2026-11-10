import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PORT = process.env.CI ? 4173 : 5173;
const EVIDENCE_DIR = path.resolve('docs/evidence/timed-mock');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function setupInferenceDoubles(page: Page) {
  await page.addInitScript(() => {
    // 1. Mock SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak = () => {};
      window.speechSynthesis.cancel = () => {};
    }

    // 2. Mock getUserMedia
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        return dest.stream;
      };
    }

    // 3. Mock Worker for on-device mockInterviewWorker / Moonshine
    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        super();
        if (!/(mockInterviewWorker|moonshineSingleThreadWorker)/.test(String(url))) {
          return new RealWorker(url, options) as any;
        }
      }
      postMessage({ id, op, payload }: any) {
        queueMicrotask(() => {
          let result: any = true;
          if (op === 'init') result = true;
          if (op === 'transcribe') result = 'I would diagnose high variance, constrain tree depth, and verify with cross-validation.';
          if (op === 'embed') result = (payload?.texts || []).map(() => [1]);
          if (op === 'nli') result = (payload?.pairs || []).map(() => ({ entails: 1, conflicts: 0 }));

          const event = new MessageEvent('message', {
            data: { id, ok: true, result },
          });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        });
      }
      terminate() {
        this.onmessage = null;
      }
    } as any;
  });
}

test.describe('Timed Mock Interview Browser Flow', () => {
  const viewports = [
    { name: '375px mobile', width: 375, height: 667 },
    { name: '1440px desktop', width: 1440, height: 900 },
  ];

  const themes = ['light', 'dark'] as const;

  for (const vp of viewports) {
    for (const theme of themes) {
      test(`full timed mock flow at ${vp.name} in ${theme} mode`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupInferenceDoubles(page);
        await page.emulateMedia({ colorScheme: theme });

        // Set theme in localStorage and document attribute before page loads
        await page.addInitScript((th) => {
          try {
            localStorage.setItem('neural-mastery-theme', th);
          } catch {}
          document.documentElement.setAttribute('data-theme', th);
        }, theme);

        // 1. Visit /interview and check entry point link
        await page.goto(`http://localhost:${PORT}/interview`);

        // Ensure theme persists on the root element
        await page.evaluate((th) => {
          localStorage.setItem('neural-mastery-theme', th);
          document.documentElement.setAttribute('data-theme', th);
        }, theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const mockLink = page.locator('a.si-mock-link[href="/interview/mock"]');
        await expect(mockLink).toBeVisible();
        await expect(mockLink).toHaveText(/Timed mock/i);

        // 2. Click through to /interview/mock
        await mockLink.click();
        await expect(page).toHaveURL(/\/interview\/mock/);

        // Wait for real content to mount (avoid capturing Suspense loading fallback)
        const heading = page.locator('h1.nm-mock-title');
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText(/Timed mock interview/i);
        await expect(page.locator('.nm-mock-role-card')).toHaveCount(4);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        // Check horizontal overflow
        const setupOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
        });
        expect(setupOverflow).toBe(true);

        // Capture setup screenshot with real content
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `setup-${vp.width}-${theme}.png`) });

        // 3. Select role and start
        const agenticCard = page.locator('.nm-mock-role-card', { hasText: 'Agentic' });
        await agenticCard.click();
        await expect(agenticCard).toHaveClass(/is-active/);

        // Start 30-min interview
        const startBtn = page.getByRole('button', { name: /Start 30-minute mock interview/i });
        await startBtn.click();

        // 4. In active interview: check question, timer, and no model answers
        await expect(page.getByText(/Question 1 of 5/i)).toBeVisible();
        await expect(page.locator('.nm-mock-question-title')).toBeVisible();
        await expect(page.locator('.nm-mock-timer-digits')).toBeVisible();
        await expect(page.locator('.nm-mock-timer-limit')).toHaveText(/\/ suggested/i);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        // Model answer must NOT be shown
        await expect(page.getByText('Model answer', { exact: true })).not.toBeVisible();

        // Check active screen horizontal overflow
        const activeOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
        });
        expect(activeOverflow).toBe(true);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `active-${vp.width}-${theme}.png`) });

        // 5. Test pause and resume
        const pauseBtn = page.getByRole('button', { name: /⏸ Pause/i });
        await pauseBtn.click();
        await expect(page.getByRole('heading', { name: /Interview paused/i })).toBeVisible();

        const resumeBtn = page.getByRole('button', { name: /Resume interview →/i });
        await resumeBtn.click();
        await expect(page.getByRole('heading', { name: /Interview paused/i })).not.toBeVisible();

        // 6. Fast-forward through questions to scorecard: Answer 1, 2, 4, 5; Skip 3
        for (let q = 1; q <= 5; q++) {
          await expect(page.getByText(new RegExp(`Question ${q} of 5`, 'i'))).toBeVisible();

          if (q === 3) {
            // Test Skip question button
            await page.getByRole('button', { name: /Skip question/i }).click();
            continue;
          }

          // Switch to typed answer
          await page.getByRole('tab', { name: /Type your answer/i }).click();
          const textarea = page.locator('#mock-typed-answer');
          await textarea.fill(
            `Detailed answer for question ${q}: I would apply systematic root cause analysis, monitor the KV cache, and implement regression tests.`
          );

          if (q === 5) {
            await page.getByRole('button', { name: /Finish interview & see scorecard/i }).click();
          } else {
            await page.getByRole('button', { name: /Submit answer & next question/i }).click();
          }
        }

        // 7. Verify Scorecard
        await expect(page.getByRole('heading', { level: 1, name: /Interview scorecard/i })).toBeVisible();
        await expect(page.locator('.nm-mock-question-report')).toHaveCount(5);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        // Verify answered tally shows 4 of 5 (1 skipped)
        await expect(page.locator('.nm-mock-stat-value', { hasText: '4 of 5' })).toBeVisible();

        // Verify skipped question 3 shows "Skipped" (not 0s)
        await expect(page.locator('.nm-mock-report-time.is-skipped', { hasText: 'Skipped' })).toBeVisible();

        // Verify answered questions show real recorded time
        const answeredTimes = page.locator('.nm-mock-report-time:not(.is-skipped)');
        await expect(answeredTimes.first()).toContainText('⏱');

        // Strictly verify NO percent grade and NO pass prediction
        const scorecardText = await page.innerText('.nm-timed-mock-shell');
        expect(scorecardText).not.toMatch(/out of 100/i);
        expect(scorecardText).not.toMatch(/\/100/i);
        expect(scorecardText).not.toMatch(/percent grade/i);
        expect(scorecardText).not.toMatch(/pass prediction/i);

        // Check model answer is visible on scorecard
        await expect(page.locator('.nm-mock-report-section-title', { hasText: 'Model answer' }).first()).toBeVisible();

        // Check checklist items (Covered / Not detected)
        await expect(page.locator('.nm-mock-check-badge').first()).toBeVisible();

        // Check candidate self-rating: Got it / Partly / Missed it
        const gotItBtn = page.locator('.nm-mock-rating-btn.got-it').first();
        await gotItBtn.click();
        await expect(gotItBtn).toHaveClass(/is-active/);
        await expect(page.getByText(/1 Got it/i)).toBeVisible();

        // Check scorecard horizontal overflow at viewport
        const scorecardOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
        });
        expect(scorecardOverflow).toBe(true);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `scorecard-${vp.width}-${theme}.png`) });
      });
    }
  }
});
