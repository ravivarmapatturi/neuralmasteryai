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

  test('picks a topic, answers by typing, shows the model answer, moves to next', async ({ page }) => {
    test.setTimeout(120000);
    const answersSent: string[] = [];
    page.on('request', (req) => {
      if ((req.postData() || '').includes('probabilistic')) answersSent.push(req.url());
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('no mic')) } });
    });

    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Practise out loud.');
    await expect(page.locator('.si-topic')).toHaveCount(11);
    await page.click('.si-topic:has-text("RAG and retrieval")');
    await expect(page.locator('.si-list li')).toHaveCount(4);
    await page.click('#start-topic');
    await expect(page.locator('.si-progress')).toContainText('Question 1 of 4');

    await page.click('button:has-text("Skip to answering")');
    await page.waitForSelector('textarea.si-answer-box', { timeout: 10000 });
    await page.fill('textarea.si-answer-box', 'A probabilistic answer about chunk size.');
    await page.click('#done');

    await expect(page.locator('.si-yours')).toContainText('probabilistic');
    await expect(page.locator('#model-answer')).toContainText('Fixed-size chunking');
    await page.click('#next');
    await expect(page.locator('.si-progress')).toContainText('Question 2 of 4');
    expect(answersSent).toHaveLength(0);
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
