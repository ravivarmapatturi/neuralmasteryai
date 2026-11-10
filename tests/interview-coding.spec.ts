import { test, expect } from '@playwright/test';
import practice from '../src/data/interviewPractice.json' with { type: 'json' };
import buildAnAgent from '../src/data/practice/buildAnAgent.generated.json' with { type: 'json' };
import svd from '../src/data/practice/specifyVerifyDebug.generated.json' with { type: 'json' };
import problemSets from '../src/data/practice/problemSets.generated.json' with { type: 'json' };

// CI tests the built site on 4173; locally the dev server runs on 5173.
const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;

const allProblems = new Map<string, any>();
for (const p of [...buildAnAgent, ...svd, ...problemSets]) allProblems.set(p.id, p);

const codingProblems: any[] = [];
for (const t of practice.topics) {
  for (const q of t.questions) {
    if (q.problemId) {
      const prob = allProblems.get(q.problemId);
      if (prob) {
        codingProblems.push({
          id: prob.id,
          functionName: prob.functionName,
          solution: prob.solution,
          testCases: prob.testCases,
        });
      }
    }
  }
}

test.describe('Interview Coding Questions & Pyodide Workspace', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Fast double for CI where downloading/initializing Pyodide WASM runtime is too slow
    if (process.env.CI) {
      await page.addInitScript(() => {
        const RealWorker = window.Worker;
        window.Worker = class extends EventTarget {
          onmessage: ((event: MessageEvent) => void) | null = null;
          constructor(url: string | URL, options?: WorkerOptions) {
            super();
            if (!/pyodideWorker/.test(String(url))) {
              return new RealWorker(url, options) as any;
            }
          }
          postMessage({ id, type, code, cases }: any) {
            queueMicrotask(() => {
              if (type === 'run-cases') {
                const isWrong = !code || code.includes('raise NotImplementedError') || code.trim() === 'pass';
                const caseResults = (cases || []).map((c: any, idx: number) => ({
                  id: c.id,
                  passed: !isWrong,
                  actualOutput: isWrong ? null : c.expectedOutput,
                  error: isWrong ? 'AssertionError' : null,
                  executionTimeMs: 5,
                }));
                const event = new MessageEvent('message', {
                  data: {
                    id,
                    type: 'result',
                    caseResults,
                    stdout: isWrong ? 'Tests failed' : 'All tests passed',
                    error: isWrong ? 'Tests failed' : null,
                  },
                });
                this.onmessage?.(event);
                this.dispatchEvent(event);
              }
            });
          }
          terminate() {}
        } as any;
      });
    }
  });

  test('coding question lifecycle: pills, locked reference, failure, pass, return, solved badge, reload persistence', async ({ page }) => {
    // 1. Visit coding topic on /interview
    await page.goto(`http://localhost:${PORT}/interview?topic=coding`, { waitUntil: 'domcontentloaded' });

    // Verify coding pills are rendered
    const codingPills = page.locator('.si-coding-pill');
    await expect(codingPills.first()).toBeVisible();
    await expect(codingPills.first()).toHaveText('Python');

    // 2. Click a coding question
    const qButton = page.locator('.si-list button').filter({ hasText: 'token-aware recursive text chunker' }).first();
    await expect(qButton).toBeVisible();
    await qButton.click();

    // 3. Confirm open code editor button is present
    const openEditorBtn = page.locator('#open-code-editor-asking');
    await expect(openEditorBtn).toBeVisible();
    await openEditorBtn.click();

    // 4. Confirm editor overlay opens
    const overlay = page.locator('.si-code-overlay');
    await expect(overlay).toBeVisible();

    // 5. Confirm reference solution is locked before attempt
    const lockedNotice = page.locator('text=Run or submit your code to unlock the verified reference solution');
    await expect(lockedNotice).toBeVisible();

    // 6. Run wrong solution (default starter code)
    const runBtn = page.getByRole('button', { name: /▶ Run|Run/i }).first();
    await runBtn.click();

    // Verify failures in test results and reference solution unlocked
    await expect(page.locator('text=Show verified reference solution')).toBeVisible({ timeout: 40000 });

    // 7. Inject right solution (from unlocked details)
    await page.locator('details summary').click();
    const solutionText = (await page.locator('details pre').textContent()) || '';
    expect(solutionText.length).toBeGreaterThan(10);

    await page.evaluate((code) => {
      const cm = document.querySelector('.cm-editor') as any;
      if (cm && cm.cmView && cm.cmView.view) {
        const view = cm.cmView.view;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: code },
        });
      } else {
        const input = document.querySelector('.cm-content') as HTMLElement;
        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, code);
      }
    }, solutionText);

    // 8. Submit right solution
    const submitBtn = page.getByRole('button', { name: /Submit/i }).first();
    await submitBtn.click();

    // Wait for pass
    await expect(page.getByText(/Tests Passed: \d+ \/ \d+|Passed/i).first()).toBeVisible({ timeout: 40000 });

    // 9. Return to interview question
    const returnBtn = page.getByRole('button', { name: /Return to interview/i });
    await returnBtn.click();
    await expect(overlay).toBeHidden();

    // 10. Confirm Solved badge shows
    const solvedBadge = page.locator('.si-solved-badge');
    await expect(solvedBadge).toBeVisible();
    await expect(solvedBadge).toContainText('Solved in editor');

    // 11. Reload and verify persistence
    const pointsBefore = await page.evaluate(() => {
      const s = localStorage.getItem('nm_user_progress');
      return s ? JSON.parse(s).points || 0 : 0;
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // If not in question asking screen, re-enter question
    await expect(page.locator('.si-question-title').or(page.locator('.si-list button')).first()).toBeVisible();
    if (!await page.locator('.si-question-title').isVisible()) {
      await page.locator('.si-list button').filter({ hasText: 'token-aware recursive text chunker' }).first().dispatchEvent('click');
    }

    await expect(page.locator('.si-solved-badge')).toBeVisible();
    const pointsAfter = await page.evaluate(() => {
      const s = localStorage.getItem('nm_user_progress');
      return s ? JSON.parse(s).points || 0 : 0;
    });

    expect(pointsAfter).toBe(pointsBefore);
  });

  test('all 20 reference solutions pass all test cases through worker', async ({ page }) => {
    // Loads the worker from /src, which only the dev server serves. Run locally with Vite.
    test.skip(!!process.env.CI, 'needs the dev server');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    const results = await page.evaluate(async (problems) => {
      const worker = new Worker(new URL('/src/workers/pyodideWorker.ts', window.location.href), { type: 'module' });
      let nextId = 0;
      const pending = new Map();
      worker.onmessage = (e: any) => {
        const msg = e.data;
        if (pending.has(msg.id)) {
          const { resolve } = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg);
        }
      };
      function runProblem(prob: any) {
        return new Promise((resolve) => {
          const id = ++nextId;
          pending.set(id, { resolve });
          worker.postMessage({
            id,
            type: 'run-cases',
            code: prob.solution,
            cases: prob.testCases.map((tc: any) => ({
              id: tc.id,
              functionName: prob.functionName,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              expectError: tc.expectError,
            })),
          });
        });
      }
      const problemResults: any[] = [];
      for (const prob of problems) {
        const res: any = await runProblem(prob);
        problemResults.push({
          problemId: prob.id,
          totalCases: prob.testCases.length,
          passedCases: (res.caseResults || []).filter((c: any) => c.passed).length,
          error: res.error || null,
        });
      }
      worker.terminate();
      return problemResults;
    }, codingProblems);

    expect(results.length).toBe(20);
    const fullyPassed = results.filter((r) => r.passedCases === r.totalCases && !r.error);
    expect(fullyPassed.length).toBe(20);
  });
});
