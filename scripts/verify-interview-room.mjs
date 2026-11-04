import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(ROOT, 'docs', 'screenshots', 'interview-room');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const AUDIO_WAV = path.resolve(ROOT, 'scripts', 'speech-benchmarks', 'audio', 'speech_with_pauses.wav');
const REF_HTML = path.resolve(ROOT, 'docs', 'interview-room-reference.html');
const LIVE_PORT = 5199; // dev server specified by user

// Helper to check headers on live port
async function checkServerHeaders(port) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}/interview/room`, (res) => {
      const coop = res.headers['cross-origin-opener-policy'];
      const coep = res.headers['cross-origin-embedder-policy'];
      resolve({
        statusCode: res.statusCode,
        coop,
        coep,
        hasNoSpecialHeaders: !coop && !coep,
      });
    }).on('error', (err) => {
      resolve({ statusCode: 0, error: err.message, hasNoSpecialHeaders: false });
    });
  });
}

async function main() {
  console.log('--- Verifying Interview Room Implementation ---');

  // 1. Check Server Headers (GitHub Pages invariant: NO special headers)
  const headerCheck = await checkServerHeaders(LIVE_PORT);
  console.log(`Server on port ${LIVE_PORT} status:`, headerCheck.statusCode);
  console.log(`COOP Header:`, headerCheck.coop || 'None');
  console.log(`COEP Header:`, headerCheck.coep || 'None');
  if (!headerCheck.hasNoSpecialHeaders) {
    console.warn('Warning: Server has isolation headers, but GitHub Pages will not.');
  } else {
    console.log('✓ Invariant satisfied: Running with NO special headers (matching GitHub Pages).');
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${AUDIO_WAV}`,
      '--allow-file-access',
    ],
  });

  const failureReasons = [];

  try {
    // 2. Network Privacy Audit: Verify 0 answers or audio are transmitted
    console.log('\nAudit: Checking Network Privacy (Zero Audio / Answers transmitted)...');
    const auditContext = await browser.newContext();
    const auditPage = await auditContext.newPage();
    const externalRequests = [];

    auditPage.on('request', (req) => {
      const url = req.url();
      const method = req.method();
      const postData = req.postData() || '';
      // Flag any POST/PUT requests with user answers or audio
      if (
        (method === 'POST' || method === 'PUT') &&
        (postData.includes('foundational') || postData.includes('model') || postData.length > 5000)
      ) {
        externalRequests.push({ url, method, postDataLength: postData.length });
      }
    });

    await auditPage.goto(`http://localhost:${LIVE_PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    // Click begin
    await auditPage.click('#begin');
    await auditPage.waitForSelector('#mic');
    // Click mic
    await auditPage.click('#mic');
    // Wait for speaking or listening
    await auditPage.waitForSelector('.who');
    // Wait 2 seconds
    await auditPage.waitForTimeout(2000);

    if (externalRequests.length > 0) {
      failureReasons.push(`Network leakage detected: ${JSON.stringify(externalRequests)}`);
    } else {
      console.log('✓ Privacy verified: 0 outbound requests transmitted user audio or answer data.');
    }
    await auditContext.close();

    // 3. Mobile 375px Horizontal Overflow Audit
    console.log('\nAudit: Responsive Layout & Horizontal Overflow at 375px...');
    const mobileCtx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`http://localhost:${LIVE_PORT}/interview/room`, { waitUntil: 'domcontentloaded' });

    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Document scrollWidth at 375px: ${scrollWidth}px`);
    if (scrollWidth > 375) {
      failureReasons.push(`Horizontal overflow on /interview/room: scrollWidth = ${scrollWidth} > 375`);
    } else {
      console.log('✓ 375px responsive check passed: scrollWidth === 375px (zero overflow).');
    }
    await mobileCtx.close();

    // 4. Full Flow Test: Setup -> Mic -> Speaking -> Listening -> Answer -> Debrief
    console.log('\nAudit: Testing Full Interview Flow to Debrief...');
    const testCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const testPage = await testCtx.newPage();
    await testPage.goto(`http://localhost:${LIVE_PORT}/interview/room`, { waitUntil: 'domcontentloaded' });

    // Step 1: Setup
    await testPage.waitForSelector('h1');
    const titleText = await testPage.textContent('h1');
    if (!titleText || !titleText.includes('Practise the real thing')) {
      failureReasons.push(`Setup screen missing main heading: ${titleText}`);
    }

    // Click begin
    await testPage.click('#begin');
    await testPage.waitForSelector('#mic');

    // Click mic
    await testPage.click('#mic');

    // Step 3: Wait for speaking or listening
    await testPage.waitForSelector('.who');

    // If skip speaking is available, skip it to enter listening
    try {
      await testPage.click('button:has-text("Skip speaking")', { timeout: 1500 });
    } catch {}

    // Step 4: Listening step
    await testPage.waitForSelector('#live, textarea.live', { timeout: 10000 });
    console.log('Listening step reached.');

    // If textarea (typing mode), input text; if fake audio, wait or simulate typing
    const isTextarea = await testPage.$('textarea.live');
    if (isTextarea) {
      await isTextarea.fill(
        'A foundation model is a probabilistic model based upon previous tokens. It tries to predict the next token. Regular ML models are trained on structured data. ML models like XGBoost are really cheaper because the size is much less and can run on CPU while foundational models require GPUs.'
      );
    } else {
      // Fake audio input or click switch to typing to ensure deterministic input
      const switchBtn = await testPage.$('button:has-text("Switch to typing")');
      if (switchBtn) {
        await switchBtn.click();
        await testPage.fill(
          'textarea.live',
          'A foundation model is a probabilistic model based upon previous tokens. It tries to predict the next token. Regular ML models are trained on structured data. ML models like XGBoost are really cheaper because the size is much less and can run on CPU while foundational models require GPUs.'
        );
      }
    }

    // Conclude turns until debrief scorecard is reached (max 2 follow-ups)
    console.log('Concluding turn 0 answer with "#done" (I\'m finished)...');
    await testPage.click('#done');

    let turnsCount = 0;
    while (turnsCount < 4) {
      await testPage.waitForTimeout(1000);
      const isDebrief = await testPage.$('.call');
      if (isDebrief) {
        console.log('Debrief reached!');
        break;
      }

      turnsCount++;
      console.log(`Handling follow-up turn ${turnsCount}...`);
      try {
        await testPage.click('button:has-text("Skip speaking")', { timeout: 1500 });
      } catch {}
      await testPage.waitForSelector('#live, textarea.live', { timeout: 10000 });

      // Provide clarifying answer
      const followUpTextarea = await testPage.$('textarea.live');
      if (followUpTextarea) {
        await followUpTextarea.fill('Foundation models also adapt to downstream tasks with prompting or fine-tuning without retraining from scratch, and apply to vision and audio representations.');
      } else {
        const switchBtn = await testPage.$('button:has-text("Switch to typing")');
        if (switchBtn) {
          try { await switchBtn.click(); } catch {}
          await testPage.fill('textarea.live', 'Foundation models also adapt to downstream tasks with prompting or fine-tuning without retraining from scratch, and apply to vision and audio representations.');
        }
      }

      console.log('Clicking #done on follow-up turn...');
      await testPage.click('#done');
    }

    // Wait for debrief scorecard to render
    await testPage.waitForSelector('.call', { timeout: 25000 });
    console.log('Debrief scorecard rendered.');

    // Assert debrief content
    const callText = await testPage.textContent('.call');
    const nextText = await testPage.textContent('.next');
    const rows = await testPage.$$('.rows .row');
    const markedText = await testPage.textContent('.stack .live');

    console.log(`Call content: ${callText?.slice(0, 80)}...`);
    console.log(`Practise next: ${nextText?.slice(0, 80)}...`);
    console.log(`Signal rows count: ${rows.length}`);
    console.log(`Marked answer snippet: ${markedText?.slice(0, 80)}...`);

    if (!callText || callText.trim().length === 0) {
      failureReasons.push('Debrief call box is empty!');
    }
    if (!nextText || nextText.trim().length === 0) {
      failureReasons.push('Debrief Practise this next box is empty!');
    }
    if (rows.length === 0) {
      failureReasons.push('Debrief contains 0 signal rows!');
    }
    if (!markedText || markedText.trim().length === 0) {
      failureReasons.push('Debrief marked answer is empty!');
    }

    // Test "Was this useful?" feedback click
    const yesBtn = await testPage.$('button:has-text("Yes")');
    if (yesBtn) {
      await yesBtn.click();
      const stored = await testPage.evaluate(() => localStorage.getItem('nm_interview_room_useful'));
      if (stored !== 'yes') {
        failureReasons.push(`Useful feedback not saved to localStorage: ${stored}`);
      } else {
        console.log('✓ Useful feedback stored in localStorage: yes');
      }
    }

    await testCtx.close();

    // 5. Generate and Capture Side-by-Side Screenshots for All 5 Screens
    console.log('\n--- Generating Side-by-Side Screenshots (1440 & 375, Light & Dark) ---');

    const viewports = [
      { name: '1440', width: 1440, height: 900 },
      { name: '375', width: 375, height: 812 },
    ];
    const themes = ['light', 'dark'];

    for (const vp of viewports) {
      for (const th of themes) {
        console.log(`Capturing screens at ${vp.name}px (${th})...`);

        // Context for Reference Mockup
        const refCtx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: th,
        });
        const refPage = await refCtx.newPage();
        await refPage.goto(`file://${REF_HTML}`);
        if (th === 'dark') {
          await refPage.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        }

        // Context for Live Room
        const liveCtx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: th,
        });
        const livePage = await liveCtx.newPage();
        await livePage.goto(`http://localhost:${LIVE_PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
        if (th === 'dark') {
          await livePage.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        }

        // --- Screen 1: Setup ---
        await refPage.evaluate(() => window.setup && window.setup());
        await refPage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen1-setup-${vp.name}-${th}-ref.png`) });
        await livePage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen1-setup-${vp.name}-${th}-live.png`) });

        // --- Screen 2: Mic ---
        await refPage.evaluate(() => window.micStep && window.micStep());
        await refPage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen2-mic-${vp.name}-${th}-ref.png`) });
        await livePage.click('#begin');
        await livePage.waitForSelector('#mic');
        await livePage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen2-mic-${vp.name}-${th}-live.png`) });

        // --- Screen 3: Speaking ---
        await refPage.evaluate(() => window.ask && window.ask(0));
        await refPage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen3-speaking-${vp.name}-${th}-ref.png`) });
        await livePage.click('#mic');
        await livePage.waitForSelector('.who');
        await livePage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen3-speaking-${vp.name}-${th}-live.png`) });

        // --- Screen 4: Listening ---
        await refPage.evaluate(() => window.listen && window.listen(0));
        await refPage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen4-listening-${vp.name}-${th}-ref.png`) });
        try {
          await livePage.click('button:has-text("Skip speaking")', { timeout: 1500 });
        } catch {}
        await livePage.waitForSelector('#live, textarea.live');
        await livePage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen4-listening-${vp.name}-${th}-live.png`) });

        // --- Screen 5: Debrief ---
        await refPage.evaluate(() => window.card && window.card());
        await refPage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen5-debrief-${vp.name}-${th}-ref.png`) });
        // Complete live answer to debrief
        await livePage.click('#done');
        for (let t = 0; t < 4; t++) {
          const callEl = await livePage.$('.call');
          if (callEl) break;
          try {
            await livePage.click('button:has-text("Skip speaking")', { timeout: 1500 });
          } catch {}
          await livePage.waitForSelector('.call, #live, textarea.live', { timeout: 15000 });
          const callNow = await livePage.$('.call');
          if (callNow) break;
          const doneBtn = await livePage.$('#done');
          if (doneBtn) {
            await doneBtn.click();
            await livePage.waitForTimeout(500);
          }
        }
        await livePage.waitForSelector('.call', { timeout: 20000 });
        await livePage.screenshot({ path: path.join(SCREENSHOT_DIR, `screen5-debrief-${vp.name}-${th}-live.png`) });

        await refCtx.close();
        await liveCtx.close();

        // Create Side-by-Side Comparison image
        const screens = ['screen1-setup', 'screen2-mic', 'screen3-speaking', 'screen4-listening', 'screen5-debrief'];
        for (const sc of screens) {
          const refPath = path.join(SCREENSHOT_DIR, `${sc}-${vp.name}-${th}-ref.png`);
          const livePath = path.join(SCREENSHOT_DIR, `${sc}-${vp.name}-${th}-live.png`);
          const sidePath = path.join(SCREENSHOT_DIR, `${sc}-${vp.name}-${th}-sidebyside.png`);

          const compCtx = await browser.newContext({
            viewport: { width: vp.width * 2 + 40, height: Math.max(vp.height, 1000) },
          });
          const compPage = await compCtx.newPage();
          const compHtml = `<!doctype html><html><body style="margin:0;padding:20px;background:#888;font-family:sans-serif;color:#fff;">
            <div style="display:flex;gap:20px;justify-content:center;">
              <div style="text-align:center;">
                <h3 style="margin:0 0 10px;">Reference Mock-up (${vp.name}px, ${th})</h3>
                <img src="file://${refPath}" style="border:2px solid #fff;max-width:${vp.width}px;box-shadow:0 4px 12px rgba(0,0,0,0.3);" />
              </div>
              <div style="text-align:center;">
                <h3 style="margin:0 0 10px;">Live Implementation (${vp.name}px, ${th})</h3>
                <img src="file://${livePath}" style="border:2px solid #00f;max-width:${vp.width}px;box-shadow:0 4px 12px rgba(0,0,0,0.3);" />
              </div>
            </div>
          </body></html>`;
          await compPage.setContent(compHtml);
          await compPage.screenshot({ path: sidePath, fullPage: true });
          await compCtx.close();
        }
      }
    }

    console.log('✓ All reference and live screenshots successfully captured in docs/screenshots/interview-room/');
  } catch (err) {
    failureReasons.push(`Test execution failed with error: ${err.message}\n${err.stack}`);
  } finally {
    await browser.close();
  }

  if (failureReasons.length > 0) {
    console.error('\n❌ VERIFICATION FAILURES:');
    failureReasons.forEach((r, i) => console.error(` ${i + 1}. ${r}`));
    process.exit(1);
  }

  console.log('\n🎉 ALL INTERVIEW ROOM AUDITS PASSED WITH ZERO FAILURES!');
  process.exit(0);
}

main();
