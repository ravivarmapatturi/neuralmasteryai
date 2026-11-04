import { test, expect } from '@playwright/test';
import http from 'node:http';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : 4173;

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

  test('walks through question flow to debrief, failing on empty results', async ({ page }) => {
    test.setTimeout(180000);
    // Intercept requests to ensure candidate speech/answers are not sent over the network
    const answersSent: string[] = [];
    page.on('request', (req) => {
      const data = req.postData() || '';
      if (data.includes('foundational') || data.includes('probabilistic') || data.includes('pretrain')) {
        answersSent.push(req.url());
      }
    });

    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });

    // Step 1: Setup
    await expect(page.locator('h1')).toHaveText('Practise the real thing.');
    await page.click('#begin');

    // Step 2: Mic step
    await expect(page.locator('h2')).toHaveText('Allow your microphone');
    await page.click('button:has-text("Or type your answers")');

    // Step 3 & 4: Speaking -> Listening
    try {
      await page.click('button:has-text("Skip speaking")', { timeout: 1500 });
    } catch {}

    await page.waitForSelector('textarea.live', { timeout: 10000 });
    await page.fill(
      'textarea.live',
      'A foundation model is a probabilistic model based upon previous tokens. It tries to predict the next token. Regular ML models are trained on structured data. ML models like XGBoost are really cheaper because the size is much less and can run on CPU while foundational models require GPUs.'
    );
    await page.click('#done');

    // Dialogue loop: follow-ups and later questions in the session
    for (let t = 0; t < 20; t++) {
      await page.waitForTimeout(1000);
      const call = await page.$('.call');
      if (call) break;
      // Interviewer clips can run longer than the wait, so skip whenever the button appears
      for (let w = 0; w < 40; w++) {
        if ((await page.$('textarea.live')) || (await page.$('.call'))) break;
        const skip = await page.$('button:has-text("Skip speaking")');
        if (skip) await skip.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      if (await page.$('.call')) break;
      await page.waitForSelector('textarea.live', { timeout: 10000 });
      await page.fill(
        'textarea.live',
        'Foundation models also adapt to multiple downstream tasks via prompting or fine-tuning without retraining from scratch, and generalize across modalities like vision and audio.'
      );
      await page.click('#done');
    }

    // Step 5: Debrief scorecard
    await page.waitForSelector('.call', { timeout: 25000 });

    const callText = await page.locator('.call').textContent();
    const nextText = await page.locator('.next').textContent();
    const rows = await page.locator('.rows .row').all();
    const markedText = await page.locator('.stack .live').first().textContent();

    // Must fail on empty results
    expect(callText?.trim().length).toBeGreaterThan(10);
    expect(nextText?.trim().length).toBeGreaterThan(10);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(markedText?.trim().length).toBeGreaterThan(10);

    // Verify localStorage feedback
    await page.click('button:has-text("Yes")');
    const stored = await page.evaluate(() => localStorage.getItem('nm_interview_room_useful'));
    expect(stored).toBe('yes');

    // Verify network privacy: 0 answer transmissions
    expect(answersSent).toHaveLength(0);
  });

  test('verifies mobile 375px responsive layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBe(375);
  });
});
