import { test, expect } from '@playwright/test';
import http from 'node:http';
import practice from '../src/data/interviewPractice.json' with { type: 'json' };
import type { Page } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : 4173;

// Replace only inference workers: this works with both Vite modules and hashed CI bundles.
// Playwright gives every test a fresh, non-persistent browser context (including model caches).
async function controlledRoom(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const state = window as any;
    state.micTracks = [];
    state.inferenceOps = [];
    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        super();
        if (!/\/(mockInterviewWorker|moonshineSingleThreadWorker)[^/]*\.(?:ts|js)(?:\?|$)/.test(String(url))) {
          return new RealWorker(url, options) as any;
        }
      }
      postMessage({ id, op, payload }: any) {
        state.inferenceOps.push(op);
        const reply = (data: any) => queueMicrotask(() => {
          const event = new MessageEvent('message', { data: { id, ...data } });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        });
        if (op === 'loadJudge') {
          state.releaseReview = () => {
            state.reviewReleased = true;
            reply({ ok: true, result: true });
          };
        } else if (op === 'embed') {
          reply({ ok: true, result: payload.texts.map(() => [1]) });
        } else if (op === 'nli') {
          state.reviewCalls = (state.reviewCalls || 0) + 1;
          reply({ ok: true, result: payload.pairs.map(() => ({ entails: 1, conflicts: 0 })) });
        } else if (op === 'init') {
          reply({ type: 'init_done', device: 'wasm', loadTimeMs: 1 });
        } else if (op === 'reset') {
          reply({ type: 'reset_done' });
        } else {
          throw new Error(`Unexpected inference operation: ${op}`);
        }
      }
      terminate() {}
    } as any;

    Object.defineProperty(navigator, 'mediaDevices', { value: {
      getUserMedia: async () => {
        const ctx = new AudioContext();
        const stream = ctx.createMediaStreamDestination().stream;
        state.micTracks.push(...stream.getTracks());
        return stream;
      },
    } });
    window.Audio = class extends Audio {
      // Do not fetch clips: missing audio would start the separate TTS model worker.
      constructor() { super(); }
      get currentTime() { return 1; }
      play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
      pause() {}
    } as any;
  });
  const externalRequests: string[] = [];
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
    if (/huggingface|hf\.co|\.onnx|\.wasm/.test(url.href)) externalRequests.push(url.href);
    return route.abort('blockedbyclient');
  });
  await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
  await page.locator('.si-node').filter({ hasText: 'Evaluation' }).click();
  return externalRequests;
}

const navigationTopic = practice.topics.find(t => t.id === 'evaluation')!;
async function atQuestion(page: Page, index: number) {
  const question = navigationTopic.questions[index];
  await expect(page.locator('.si-counter')).toHaveText(`Question ${index + 1} of ${navigationTopic.questions.length}`);
  await expect(page).toHaveURL(new RegExp(`/interview/q/${encodeURIComponent(question.id.replaceAll(':', '__'))}$`));
  await expect(page.locator('.si-question-title')).toHaveText(question.title);
}
async function answerByTyping(page: Page) {
  await page.getByRole('button', { name: 'Skip to answering' }).click();
  await page.getByRole('button', { name: 'Type instead', exact: true }).click();
  await page.getByLabel('Your answer', { exact: true }).fill('A distinct old typed answer about evaluation.');
}

test.describe('Interview Room (/interview/room)', () => {
  test('verifies server runs without isolation headers (GitHub Pages compatibility)', async () => {
    const hasSpecialHeaders = await new Promise<boolean>((resolve) => {
      http.get(`http://localhost:${PORT}/interview/room`, (res) => {
        const coop = res.headers['cross-origin-opener-policy'];
        const coep = res.headers['cross-origin-embedder-policy'];
        resolve(Boolean(coop || coep));
      }).on('error', () => resolve(false));
    });
    expect(hasSpecialHeaders).toBe(false);
  });

  test('picks a topic, answers by typing, shows the model answer, moves to next', async ({ page }) => {
    const answersSent: string[] = [];
    page.on('request', (req) => {
      if ((req.postData() || '').includes('probabilistic')) answersSent.push(req.url());
    });
    // Nodes hold still under reduced motion, so the test can click them.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('no mic')) } });
    });

    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Interview practice');
    await expect(page.locator('.si-node')).toHaveCount(22);
    await page.click('.si-node:has-text("Evaluation")');
    await expect(page.locator('.si-panel h2')).toHaveText('Evaluation');
    await page.click('#start-topic');
    await expect(page.locator('.si-counter')).toContainText('Question 1 of');

    await page.click('button:has-text("Skip to answering")');
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    await page.waitForSelector('textarea.si-answer-box', { timeout: 10000 });
    await page.fill('textarea.si-answer-box', 'A probabilistic answer about evaluation.');
    await page.click('#done');

    await expect(page.locator('.si-yours')).toContainText('probabilistic');
    expect(((await page.locator('#model-answer').textContent()) ?? '').length).toBeGreaterThan(40);
    await page.click('#mark-complete');
    await expect(page.locator('.si-done')).toContainText('+10 points');
    await page.click('#next');
    await expect(page.locator('.si-counter')).toContainText('Question 2 of');
    expect(answersSent).toHaveLength(0);
  });

  for (const step of ['asking', 'answering', 'answer'] as const) {
    test(`previous and next update the question and URL during ${step}`, async ({ page }) => {
      await controlledRoom(page);
      await page.locator('#start-topic').click();
      await atQuestion(page, 0);
      await expect(page.locator('#previous-question')).toBeDisabled();
      const enterStep = async () => {
        if (step !== 'asking') await answerByTyping(page);
        if (step === 'answer') await page.locator('#done').click();
      };
      await enterStep();
      await page.locator('#next-question').click();
      await atQuestion(page, 1);
      await expect(page.locator('.si-speaker-asking')).toBeVisible();
      // Typing persists between questions.
      if (step !== 'asking') {
        await page.getByRole('button', { name: 'Skip to answering' }).click();
        await page.getByLabel('Your answer', { exact: true }).fill('The second answer is different.');
        if (step === 'answer') await page.locator('#done').click();
      }
      await page.locator('#previous-question').click();
      await atQuestion(page, 0);
      await expect(page.locator('#previous-question')).toBeDisabled();
      await expect(page.locator('#model-answer')).toHaveCount(0);
    });
  }

  test('practice again clears the answer and preserves the question address', async ({ page }) => {
    await controlledRoom(page);
    await page.locator('#start-topic').click();
    await answerByTyping(page);
    await page.locator('#done').click();
    await expect(page.locator('.si-yours')).toContainText('distinct old typed');
    await expect(page.locator('#model-answer')).toBeVisible();
    await page.locator('#practice-again').click();
    await atQuestion(page, 0);
    await expect(page.locator('#model-answer')).toHaveCount(0);
    await expect(page.locator('.si-yours')).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('');
  });

  test('leaving a live answer stops every mic track; a delayed old review cannot appear on the new answer', async ({ page }) => {
    const modelRequests = await controlledRoom(page);
    await page.locator('#start-topic').click();
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await expect(page.locator('.si-status')).toContainText('Listening.');
    expect(await page.evaluate(() => (window as any).micTracks.filter((t: MediaStreamTrack) => t.readyState === 'live').length)).toBe(1);
    await page.locator('#next-question').click();
    await atQuestion(page, 1);
    expect(await page.evaluate(() => (window as any).micTracks.every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
    await answerByTyping(page);
    await page.locator('#done').click();
    await expect(page.locator('.si-check-loading')).toBeVisible();
    await expect.poll(() => page.evaluate(() => typeof (window as any).releaseReview)).toBe('function');
    await page.locator('#next-question').click();
    await atQuestion(page, 2);
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await page.locator('#done').click();
    await expect(page.locator('.si-yours')).toHaveText('No answer was captured.');
    await page.evaluate(() => (window as any).releaseReview());
    await expect.poll(() => page.evaluate(() => (window as any).reviewCalls)).toBe(2);
    // Let the real worker client's promises and React's commit finish before checking absence.
    await page.evaluate(() => new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await expect(page.locator('.si-check, .si-check-loading, .si-failed-status')).toHaveCount(0);
    await expect(page.locator('.si-yours')).toHaveText('No answer was captured.');
    await expect(page.locator('#model-answer')).toHaveText(navigationTopic.questions[2].answer);
    expect(modelRequests, 'No real model downloads').toEqual([]);
    expect(await page.evaluate(() => (window as any).inferenceOps)).toContain('loadJudge');
  });

  test('navigation follows the intersection of round and role filters', async ({ page }) => {
    await controlledRoom(page);
    const round = 'system-design';
    const role = 'ai-evaluation-reliability-engineer';
    const indices = navigationTopic.questions.flatMap((q, i) =>
      q.rounds?.includes(round) && q.roles?.includes(role) ? [i] : []);
    expect(indices.length).toBeGreaterThan(1);
    expect(indices.length).toBeLessThan(navigationTopic.questions.length);
    await page.getByLabel('Interview round').selectOption(round);
    await page.getByLabel('Role', { exact: true }).selectOption(role);
    await expect(page.locator('.si-list button')).toHaveCount(indices.length);
    await page.locator('#start-topic').click();
    for (const [position, index] of indices.entries()) {
      await atQuestion(page, index);
      if (position === 0) await expect(page.locator('#previous-question')).toBeDisabled();
      if (position < indices.length - 1) await page.locator('#next-question').click();
    }
    await expect(page.locator('#next-question')).toBeDisabled();
    for (const index of indices.slice(0, -1).reverse()) {
      await page.locator('#previous-question').click();
      await atQuestion(page, index);
    }
    await expect(page.locator('#previous-question')).toBeDisabled();
  });

  test('every question and model answer has its audio file', async ({ request }) => {
    const res = await request.get(`http://localhost:${PORT}/audio/interview-voice/genai-chunking-strategies_a.opus`);
    expect(res.status()).toBe(200);
  });

  test('old room address goes to the interview page', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/interview\/?$/);
  });

  test('verifies mobile 375px responsive layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBe(375);
  });
});
