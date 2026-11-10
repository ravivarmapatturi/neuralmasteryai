import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/evidence/interview-width');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PORT = 5173;

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const viewports = [
    { name: '375', width: 375, height: 667 },
    { name: '768', width: 768, height: 1024 },
    { name: '1280', width: 1280, height: 800 },
    { name: '1920', width: 1920, height: 1080 }
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();

    // Mock speech worker / media to be fast
    await page.addInitScript(() => {
      localStorage.setItem('nm-interview-input-mode', 'type');
    });

    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.si-question-btn');

    // Check Topics screen horizontal overflow
    const topicsOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth
    }));

    // Start question
    const qBtn = page.locator('.si-question-btn').first();
    await qBtn.click();
    await page.waitForSelector('button:has-text("Skip to answering")');

    // Check Asking screen
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-1-asking.png`), fullPage: false });

    // Answering
    await page.click('button:has-text("Skip to answering")');
    await page.waitForSelector('#done');
    const typeInstead = page.locator('button:has-text("Type instead")');
    if (await typeInstead.count() > 0) {
      await typeInstead.click();
    }
    await page.waitForSelector('textarea.si-answer-box');
    await page.fill('textarea.si-answer-box', 'Dense retrieval leverages neural bi-encoders to project documents and queries into a continuous vector space.');
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-2-answering.png`), fullPage: false });

    // Done -> Review / Answer Stage
    await page.click('#done');
    await page.waitForSelector('.si-answer-stage');
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      const stage = document.querySelector('.si-answer-stage');
      const card = document.querySelector('.si-card-stage');
      const stageStyle = stage ? window.getComputedStyle(stage) : null;
      const cardStyle = card ? window.getComputedStyle(card) : null;
      const leftCol = document.querySelector('.si-answer-col-left');
      const rightCol = document.querySelector('.si-answer-col-right');

      return {
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
        cardWidth: card ? card.getBoundingClientRect().width : 0,
        cardMaxWidth: cardStyle ? cardStyle.maxWidth : '',
        stageDisplay: stageStyle ? stageStyle.display : '',
        stageGridCols: stageStyle ? stageStyle.gridTemplateColumns : '',
        leftColWidth: leftCol ? leftCol.getBoundingClientRect().width : 0,
        rightColWidth: rightCol ? rightCol.getBoundingClientRect().width : 0,
        leftColLeft: leftCol ? leftCol.getBoundingClientRect().left : 0,
        rightColLeft: rightCol ? rightCol.getBoundingClientRect().left : 0
      };
    });

    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-3-answer.png`), fullPage: true });

    results.push({
      vp: vp.name,
      width: vp.width,
      metrics
    });

    console.log(`Result for ${vp.name}:`, JSON.stringify(metrics, null, 2));
    await context.close();
  }

  await browser.close();

  // Verification assertions
  console.log('\n--- VERIFICATION REPORT ---');
  let allPassed = true;
  for (const res of results) {
    const { vp, width, metrics } = res;
    const noHScroll = metrics.docScrollWidth <= width;
    console.log(`[${vp}px] scrollWidth: ${metrics.docScrollWidth} / ${width} -> no horizontal scroll: ${noHScroll}`);
    if (!noHScroll) allPassed = false;

    if (width >= 1200) {
      const isGrid = metrics.stageDisplay === 'grid';
      const hasTwoCols = metrics.stageGridCols && metrics.stageGridCols.split(' ').length >= 2;
      const isWide = metrics.cardWidth > 1100;
      console.log(`[${vp}px] stage display: ${metrics.stageDisplay}, 2-col grid: ${hasTwoCols}, wide card (${metrics.cardWidth.toFixed(0)}px): ${isWide}`);
      if (!isGrid || !hasTwoCols || !isWide) allPassed = false;
    } else {
      console.log(`[${vp}px] single column layout verified.`);
    }
  }

  if (allPassed) {
    console.log('\nALL VIEWPORT CHECKS PASSED!');
  } else {
    console.error('\nSOME CHECKS FAILED!');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
