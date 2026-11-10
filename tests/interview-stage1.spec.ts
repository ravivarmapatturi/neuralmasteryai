import { test, expect } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;

test.describe('Stage 1 Audit Fixes', () => {
  test('B1: /interview/q/<id> and trailing slash open directly in the question room', async ({ page }) => {
    // 1. Without trailing slash
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.si-speaker-asking')).toBeVisible();
    await expect(page.locator('.si-question-title')).toContainText('chunk size');

    // 2. With trailing slash (GitHub Pages format)
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.si-speaker-asking')).toBeVisible();
    await expect(page.locator('.si-question-title')).toContainText('chunk size');

    // 3. With ?topic handling
    await page.goto(`http://localhost:${PORT}/interview?topic=evaluation`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Interview practice');
    await expect(page.locator('.si-topic-widget h2')).toHaveText('Evaluation');
  });

  test('D4: document.title and meta description for question, topic, and mock page', async ({ page }) => {
    // 1. Direct question title and meta
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/chunk size/i);
    const qDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(qDesc).toContain('chunk size');

    // 2. Topic landing title and meta
    await page.goto(`http://localhost:${PORT}/interview?topic=evaluation`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Evaluation/i);
    const topicDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(topicDesc).toContain('Evaluation');

    // 3. Timed mock page title and meta
    await page.goto(`http://localhost:${PORT}/interview/mock`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Timed Mock Interview/i);
    const mockDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(mockDesc?.toLowerCase()).toContain('interview');
  });

  test('B2 & B12: No audio without user choice, model answer never auto-read, and Done button has one accessible name', async ({ page }) => {
    let playedAudio = false;
    await page.addInitScript(() => {
      window.Audio = class extends Audio {
        constructor() { super(); }
        play() {
          (window as any).playedAudio = true;
          return Promise.resolve();
        }
      } as any;
    });

    // Enter question directly
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.si-speaker-asking')).toBeVisible();

    // Verify no automatic audio playback on entry
    const audioPlayedOnEntry = await page.evaluate(() => Boolean((window as any).playedAudio));
    expect(audioPlayedOnEntry).toBe(false);

    // Skip to answering
    await page.getByRole('button', { name: /Skip to answering/i }).click();
    await page.waitForSelector('.si-speaker-answering');

    // Verify B12: Done button accessible name
    const doneBtn = page.locator('#done');
    await expect(doneBtn).toBeVisible();
    const accessibleName = await doneBtn.evaluate((el) => el.getAttribute('aria-label') || el.textContent?.trim());
    expect(accessibleName).toBe('Done');

    // If voice mode is active, switch to typing
    const typeInsteadBtn = page.getByRole('button', { name: 'Type instead', exact: true });
    if (await typeInsteadBtn.isVisible()) {
      await typeInsteadBtn.click();
    }
    await page.waitForSelector('textarea.si-answer-box');
    await page.fill('textarea.si-answer-box', 'Chunk size controls the trade-off between context and precision.');

    // Reset audio tracker before clicking Done
    await page.evaluate(() => { (window as any).playedAudio = false; });

    // Click Done to reach Review step
    await doneBtn.click();
    await page.waitForSelector('.si-answer-stage');

    // Wait a brief moment to ensure model answer is not auto-read
    await page.waitForTimeout(500);
    const audioPlayedOnReview = await page.evaluate(() => Boolean((window as any).playedAudio));
    expect(audioPlayedOnReview).toBe(false);
  });

  test('A12 & E3: banned fine print removed and checking key points text cleaned', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview/q/genai-chunking-strategies`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Skip to answering/i }).click();
    const typeInstead = page.getByRole('button', { name: 'Type instead', exact: true });
    if (await typeInstead.isVisible()) {
      await typeInstead.click();
    }
    await page.waitForSelector('textarea.si-answer-box');
    await page.fill('textarea.si-answer-box', 'Test answer for banned copy verification.');
    await page.locator('#done').click();
    await page.waitForSelector('.si-answer-stage');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Reviews saved on this device.');
    expect(bodyText).not.toContain('Attempt history saved on this device.');
    expect(bodyText).not.toContain('Checking key points against the model answer on your device…');
  });

  test('A3: question list is not a 133px box', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    const list = page.locator('.si-list');
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(350);
  });
});
