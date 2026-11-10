import { test, expect, Page } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;

async function setupPage(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('nm-interview-input-mode', 'type');
    // Mock worker to prevent heavy downloads
    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        super();
        if (!/\/(mockInterviewWorker|moonshineSingleThreadWorker|kokoroWorker)[^/]*\.(?:ts|js)(?:\?|$)/.test(String(url))) {
          return new RealWorker(url, options) as any;
        }
      }
      postMessage({ id, op, payload }: any) {
        const reply = (data: any) => queueMicrotask(() => {
          const event = new MessageEvent('message', { data: { id, ...data } });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        });
        if (op === 'loadJudge') {
          reply({ ok: true, result: true });
        } else if (op === 'init') {
          reply({ type: 'init_done', device: 'wasm', loadTimeMs: 1 });
        } else if (op === 'embed') {
          reply({ ok: true, result: [[1]] });
        } else if (op === 'nli') {
          reply({ ok: true, result: [{ entails: 1, conflicts: 0 }] });
        } else if (['transcribe', 'commit', 'batch'].includes(op)) {
          reply({ type: 'result', text: 'Sample answer', inferMs: 1 });
        } else if (op === 'reset') {
          reply({ type: 'reset_done' });
        }
      }
      terminate() { this.onmessage = null; }
    } as any;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => {
          const ctx = new AudioContext();
          return ctx.createMediaStreamDestination().stream;
        },
      },
    });
  });

  await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
  const qBtn = page.locator('.si-question-btn').first();
  await qBtn.scrollIntoViewIfNeeded();
  await qBtn.click();
}

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test.describe('Question Room Viewport Fit (G2)', () => {
  for (const { width, height } of VIEWPORTS) {
    test(`fits exactly one viewport without scrolling at ${width}x${height} on Listen and Answer`, async ({ page }) => {
      await setupPage(page, width, height);

      // STEP 1: Listen (step === 'asking')
      await page.waitForSelector('.si-speaker-asking', { state: 'visible' });
      const listenActionBar = page.locator('.si-speaker-asking .si-actions');
      await expect(listenActionBar).toBeVisible();

      // Verify action button is within visible viewport
      const listenBox = await listenActionBar.boundingBox();
      expect(listenBox).not.toBeNull();
      expect(listenBox!.y + listenBox!.height).toBeLessThanOrEqual(height);

      // Verify document scrollHeight equals viewport height (zero page overflow)
      const listenMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        scrollY: window.scrollY,
      }));
      expect(listenMetrics.scrollHeight).toBe(height);
      expect(listenMetrics.scrollY).toBe(0);

      // STEP 2: Answer (step === 'answering')
      const skipBtn = page.getByRole('button', { name: /Skip to answering/i });
      await skipBtn.click();
      await page.waitForSelector('.si-speaker-answering', { state: 'visible' });

      const answerActionBar = page.locator('.si-speaker-answering .si-actions');
      await expect(answerActionBar).toBeVisible();

      const answerBox = await answerActionBar.boundingBox();
      expect(answerBox).not.toBeNull();
      expect(answerBox!.y + answerBox!.height).toBeLessThanOrEqual(height);

      const answerMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        scrollY: window.scrollY,
      }));
      expect(answerMetrics.scrollHeight).toBe(height);
      expect(answerMetrics.scrollY).toBe(0);

      // STEP 3: Review (step === 'answer') - scrolling allowed
      await page.evaluate(() => (document.getElementById('done') as HTMLButtonElement)?.click());
      await page.waitForSelector('.si-answer-stage', { state: 'visible' });

      // Review step is unlocked for scrolling
      const isLocked = await page.evaluate(() => document.body.classList.contains('si-viewport-lock'));
      expect(isLocked).toBe(false);
    });
  }
});
