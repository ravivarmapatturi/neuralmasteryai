import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/evidence/interview-ui');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '375', width: 375, height: 667 }
  ];

  const themes = ['light', 'dark'];

  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`Capturing ${vp.name}px - ${theme}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();

      // Screen 1: Topics (fullPage: false for 1440 to show exact 1440x900 viewport fit; fullPage: false for 375)
      await page.goto('http://localhost:5201/interview');
      await page.waitForSelector('.si-node');
      await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-1-topics.png`), fullPage: false });

      // Screen 2: Asking
      await page.click('#start-topic');
      await page.waitForSelector('button:has-text("Skip to answering")');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-2-asking.png`), fullPage: false });

      // Screen 3: Answering
      await page.click('button:has-text("Skip to answering")');
      await page.waitForSelector('#done');
      const typeInstead = page.locator('button:has-text("Type instead")');
      if (await typeInstead.count() > 0) {
        await typeInstead.click();
      }
      await page.waitForSelector('textarea.si-answer-box');
      await page.fill('textarea.si-answer-box', 'Dense retrieval uses bi-encoder embeddings to calculate semantic similarity against an indexed vector space.');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-3-answering.png`), fullPage: false });

      // Screen 4: Answer Comparison (fullPage: true so user sees comparison side-by-side)
      await page.click('#done');
      await page.waitForSelector('.si-answer-stage');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-4-answer.png`), fullPage: true });

      // Screen 4-completed: Marked Complete
      await page.click('#mark-complete');
      await page.waitForSelector('.si-done');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-4-answer-completed.png`), fullPage: true });

      // Screen 5: Done stage (finish topic)
      // Navigate to coding topic and click its last question to finish topic
      await page.goto('http://localhost:5201/interview?topic=coding');
      await page.waitForSelector('.si-node');
      await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await page.waitForSelector('.si-list button');
      // Click the last question in the list
      const listButtons = page.locator('.si-list button');
      const count = await listButtons.count();
      await listButtons.nth(count - 1).click();
      
      await page.waitForSelector('button:has-text("Skip to answering")');
      await page.click('button:has-text("Skip to answering")');
      await page.waitForSelector('#done');
      await page.click('#done');
      await page.waitForSelector('#next');
      
      const nextBtn = page.locator('#next');
      const nextText = await nextBtn.textContent();
      if (nextText && nextText.includes('Finish topic')) {
        await nextBtn.click();
      }
      await page.waitForSelector('.si-done-stage');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-${theme}-5-done.png`), fullPage: false });

      await context.close();
    }
  }

  await browser.close();
  console.log('All 24 screenshots captured successfully in docs/evidence/interview-ui!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
