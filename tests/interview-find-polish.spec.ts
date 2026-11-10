import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;
const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/interview');

test.describe('Find, Filter & Polish (C9 & C10)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test('C9: text search over all questions, bookmarks, and URL filter synchronization', async ({ page }) => {
    // 1. Visit /interview with clean storage
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto(`http://localhost:${PORT}/interview`);
    await page.waitForSelector('.si-panel');

    // Exactly one primary action on the topics screen
    const primaryBtns = await page.$$('.si-primary');
    expect(primaryBtns.length).toBe(1);

    // 2. Text search across all questions
    const searchInput = page.locator('#interview-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('speculative decoding');
    await page.waitForTimeout(300);

    // Verify search count
    const countText = await page.locator('.si-count').textContent();
    expect(countText).toContain('question');

    // 3. Test bookmarks
    const firstBookmarkBtn = page.locator('.si-list-item .si-bookmark-btn').first();
    await expect(firstBookmarkBtn).toBeVisible();
    await firstBookmarkBtn.click();
    await page.waitForTimeout(100);

    // Verify bookmark stored in localStorage
    const storedBookmarks = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('nm-interview-bookmarks') || '[]');
    });
    expect(storedBookmarks.length).toBeGreaterThan(0);

    // 4. Filter by bookmarked
    const statusSelect = page.locator('select[aria-label="Question status"]');
    await statusSelect.selectOption('bookmarked');
    await page.waitForTimeout(200);

    // URL should reflect bookmarked status
    expect(page.url()).toContain('status=bookmarked');

    // Capture desktop and mobile screenshots of bookmarked / filtered state
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'bookmarks-filtered-1440-dark.png') });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'bookmarks-filtered-375-dark.png') });
  });

  test('C9 & C10: Filter state in URL, Previous & Next follow filtered list, one primary action per screen', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // Mock audio play to avoid stalls
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    // 1. Load with filters in URL: search=LoRA&level=senior
    await page.goto(`http://localhost:${PORT}/interview?search=LoRA&level=senior`);
    await page.waitForSelector('.si-panel');

    // Verify search input populated from URL
    const searchVal = await page.locator('#interview-search').inputValue();
    expect(searchVal).toBe('LoRA');

    // Verify level select populated from URL
    const levelVal = await page.locator('select[aria-label="Experience level"]').inputValue();
    expect(levelVal).toBe('senior');

    // Verify only one primary action button
    const screen1Primary = await page.$$('.si-primary');
    expect(screen1Primary.length).toBe(1);

    // 2. Start the filtered sequence
    const startTopicBtn = page.locator('#start-topic');
    await startTopicBtn.click();
    await page.waitForSelector('.si-speaker-asking');

    // Verify stage counter reflects filtered list
    const counterText1 = await page.locator('.si-counter').textContent();
    expect(counterText1).toMatch(/^1 \/ \d+$/);

    // Screen 2: Asking stage - verify exactly one primary action (Skip to answering)
    const screen2Primary = await page.$$('.si-primary');
    expect(screen2Primary.length).toBe(1);

    // Next question button in nav should follow filtered list
    const nextNavBtn = page.locator('#next-question');
    await expect(nextNavBtn).toBeEnabled();
    await nextNavBtn.click();
    await page.waitForTimeout(200);

    // Verify counter advanced to Question 2 of filtered list
    const counterText2 = await page.locator('.si-counter').textContent();
    expect(counterText2).toMatch(/^2 \/ \d+$/);

    // Previous button should now be enabled
    const prevNavBtn = page.locator('#previous-question');
    await expect(prevNavBtn).toBeEnabled();

    // Move to answering step
    const skipBtn = page.locator('.si-speaker-asking .si-primary');
    await skipBtn.click();
    await page.waitForSelector('.si-speaker-answering');

    // First answer asks how to answer: speak or type. Pick typing.
    await page.locator('#primer-type').click();

    // Screen 3: Answering stage - verify exactly one primary action (#done)
    const screen3Primary = await page.$$('.si-primary');
    expect(screen3Primary.length).toBe(1);
    expect(await page.locator('#done').isVisible()).toBe(true);

    // Finish answer to reach answer stage
    await page.locator('#done').click();
    await page.waitForSelector('.si-answer-stage');

    // Screen 4: Answer stage - verify exactly one primary action (#next)
    const screen4Primary = await page.$$('.si-primary');
    expect(screen4Primary.length).toBe(1);
    expect(await page.locator('#next').isVisible()).toBe(true);

    // Previous and Next still follow filtered list in answer stage
    await page.locator('#next').click();
    await page.waitForTimeout(200);
    const counterText3 = await page.locator('.si-counter').textContent();
    expect(counterText3).toMatch(/^3 \/ \d+$/);
  });

  test('C10: Layout stability, no width jump between steps', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.clear();
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    await page.goto(`http://localhost:${PORT}/interview?topic=rag`);
    await page.waitForSelector('.si-card');

    // Measure card width in topics step
    const topicsCardBox = await page.locator('.si-card').boundingBox();
    expect(topicsCardBox).not.toBeNull();

    // Start topic -> asking step
    await page.locator('#start-topic').click();
    await page.waitForSelector('.si-speaker-asking');
    const askingCardBox = await page.locator('.si-card').boundingBox();
    expect(askingCardBox).not.toBeNull();

    // The question room is a centred column of at most 860px; the topic list stays wide.
    expect(askingCardBox!.width).toBeLessThanOrEqual(860);
    expect(askingCardBox!.width).toBeGreaterThan(800);
    expect(Math.abs(askingCardBox!.x + askingCardBox!.width / 2 - 720)).toBeLessThan(10);

    // Capture asking evidence
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'polish-asking-1440-light.png') });

    // Move to answering step
    await page.locator('.si-speaker-asking .si-primary').click();
    await page.waitForSelector('.si-speaker-answering');
    await page.locator('#primer-type').click();
    const answeringCardBox = await page.locator('.si-card').boundingBox();
    expect(answeringCardBox).not.toBeNull();

    // Zero horizontal layout jump between asking and answering
    expect(answeringCardBox!.width).toBe(askingCardBox!.width);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'polish-answering-1440-light.png') });

    // Move to answer step
    await page.locator('#done').click();
    await page.waitForSelector('.si-answer-stage');
    const answerCardBox = await page.locator('.si-card').boundingBox();
    expect(answerCardBox).not.toBeNull();

    // Review still uses the wide two-column card. When the review redesign lands
    // (audit plan, question room point 9) this becomes toBe(askingCardBox!.width).
    expect(answerCardBox!.width).toBeGreaterThanOrEqual(askingCardBox!.width);
    expect(answerCardBox!.width).toBeLessThanOrEqual(1240);
    expect(Math.abs(answerCardBox!.x + answerCardBox!.width / 2 - 720)).toBeLessThan(10);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'polish-answer-1440-light.png') });
  });

  test('C10: Microphone error state banner and retry button', async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => {
      localStorage.clear();
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      try {
        Object.defineProperty(navigator, 'mediaDevices', {
          value: {
            getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
          },
          configurable: true,
        });
      } catch {
        // fallback
      }
    });

    await page.goto(`http://localhost:${PORT}/interview?topic=rag`);
    await page.waitForSelector('#start-topic');
    await page.locator('#start-topic').click();
    await page.waitForSelector('.si-speaker-asking');

    // Skip to answering
    await page.locator('.si-speaker-asking .si-primary').click();
    await page.waitForSelector('.si-speaker-answering');

    // Choosing to speak asks for the microphone, which is denied.
    await page.locator('#primer-speak').click();

    // Error banner should be clearly rendered
    const errorBanner = page.locator('.si-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(page.locator('.si-error-title')).toContainText('Microphone unavailable');
    await expect(page.locator('.si-error-action')).toBeVisible();

    // Capture evidence in dark mode at 1440px and light mode at 375px
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'polish-mic-error-1440-dark.png') });

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'polish-mic-error-375-light.png') });
  });

  test('C10: 320px and 375px small mobile responsive pass in both themes with 0 overflow', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    const viewports = [
      { width: 375, height: 667, name: '375' },
      { width: 320, height: 568, name: '320' },
    ];
    const themes = ['light', 'dark'];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const theme of themes) {
        await page.goto(`http://localhost:${PORT}/interview`);
        await page.waitForSelector('.si-panel');
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

        // Check horizontal scroll width
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBe(vp.width);

        // Test search input on small mobile
        await page.locator('#interview-search').fill('retrieval');
        await page.waitForTimeout(200);

        const mobileScrollWidthAfterSearch = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(mobileScrollWidthAfterSearch).toBe(vp.width);

        // Capture evidence screenshot
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, `find-search-${vp.name}-${theme}.png`),
        });
      }
    }

    // Capture 1440px desktop evidence in both themes
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const theme of themes) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `find-search-1440-${theme}.png`),
      });
    }
  });
});
