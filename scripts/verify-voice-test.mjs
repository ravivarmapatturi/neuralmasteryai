import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = 5187; // Dedicated port; leaves 5199 alone

// Minimal static HTTP server with NO COOP/COEP headers (matching GitHub Pages production)
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

let server;
let isViteServer = false;

if (fs.existsSync(path.join(DIST, 'index.html'))) {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/' || pathname === '/lab/voice-test') {
      pathname = '/index.html';
    }

    let filePath = path.join(DIST, pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html');
    }

    const ext = path.extname(filePath);
    // Zero COOP/COEP headers
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Voice test static server running at http://localhost:${PORT} with ZERO COOP/COEP headers`);
} else {
  // In low-RAM environment or pre-build dev mode, run Vite dev server with zero COOP/COEP headers
  server = await createViteServer({
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  isViteServer = true;
  console.log(`Voice test Vite server running at http://localhost:${PORT} with ZERO COOP/COEP headers`);
}

const results = {
  runTimestamp: new Date().toISOString(),
  route: '/lab/voice-test',
  notes: 'Evaluated on local static server with zero COOP/COEP headers (matching GitHub Pages).',
  mobileOverflowCheck375px: null,
  noIndexCheck: null,
  fixedQuestion: null,
  voices: {},
  indianEnglishAudit: null,
};

let hasFailure = false;
const failureReasons = [];

try {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile responsive 375px check
  console.log('Testing mobile width 375px responsiveness on /lab/voice-test...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`http://localhost:${PORT}/lab/voice-test`, { waitUntil: 'networkidle' });

  const overflow = await mobilePage.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const clientW = docEl.clientWidth;
    const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
    return {
      clientWidth: clientW,
      scrollWidth: scrollW,
      hasHorizontalOverflow: scrollW > clientW,
    };
  });
  console.log('Mobile 375px width check:', overflow);
  results.mobileOverflowCheck375px = { ...overflow, pass: !overflow.hasHorizontalOverflow };
  if (overflow.hasHorizontalOverflow) {
    hasFailure = true;
    failureReasons.push(
      `Horizontal overflow detected at 375px: scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth})`
    );
  }

  // 2. Check noindex, nofollow
  console.log('Testing robots meta tag for noindex, nofollow...');
  const robotsMeta = await mobilePage.evaluate(() => {
    return document.querySelector('meta[name="robots"]')?.getAttribute('content');
  });
  console.log('Robots meta tag:', robotsMeta);
  results.noIndexCheck = { robotsMeta, pass: robotsMeta === 'noindex, nofollow' };
  if (robotsMeta !== 'noindex, nofollow') {
    hasFailure = true;
    failureReasons.push(`Robots meta tag expected "noindex, nofollow", received "${robotsMeta}"`);
  }

  await mobileContext.close();

  // 3. Desktop full inspection of voices, metrics, players, and Indian English audit
  console.log('Opening desktop context for /lab/voice-test verification...');
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await desktopContext.newPage();
  await page.goto(`http://localhost:${PORT}/lab/voice-test`, { waitUntil: 'networkidle' });

  // Check fixed question
  const questionText = await page.evaluate(() => {
    return document.querySelector('blockquote')?.textContent?.trim();
  });
  console.log('Fixed question:', questionText);
  results.fixedQuestion = questionText;
  if (!questionText || !questionText.includes('What is a foundation model')) {
    hasFailure = true;
    failureReasons.push(`Fixed interview question is missing or empty: "${questionText}"`);
  }

  // Inspect all 3 voices rendered
  const voiceCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('section:nth-of-type(2) > div > div'));
    return cards.map((c) => {
      const title = c.querySelector('h3')?.textContent?.trim() || '';
      const badge = c.querySelector('span[style*="border-radius: 4px"]')?.textContent?.trim() || '';
      const textContent = c.textContent || '';
      const hasAudioPlayer =
        !!c.querySelector('audio, [data-testid="button-browser-speak"]') ||
        (textContent.includes('Speak with Browser') || textContent.includes('Stop Speaking'));
      const hasOnDemandButton = !!c.querySelector('button[style*="Run"]');
      return {
        title,
        badge,
        hasAudioPlayer,
        hasOnDemandButton,
        hasDownloadBytes: textContent.includes('Network Bytes'),
        hasTimeToAudio: textContent.includes('Time to Audio'),
        hasNormalRtf: textContent.includes('Normal CPU RTF'),
        hasThrottleRtf: textContent.includes('4x Throttle RTF'),
        hasLicenceSection: textContent.includes('Primary Source Licensing'),
        textSnippet: textContent.slice(0, 150),
      };
    });
  });

  console.log(`Found ${voiceCards.length} voice cards:`, voiceCards);
  results.voices = voiceCards;

  if (voiceCards.length < 3) {
    hasFailure = true;
    failureReasons.push(`Expected at least 3 voice comparison cards, found ${voiceCards.length}`);
  }

  for (const vc of voiceCards) {
    if (!vc.title || vc.title.trim() === '') {
      hasFailure = true;
      failureReasons.push('Encountered voice card with empty title.');
    }
    if (!vc.hasAudioPlayer) {
      hasFailure = true;
      failureReasons.push(`Voice card "${vc.title}" is missing an audio player / speak button.`);
    }
    if (!vc.hasDownloadBytes || !vc.hasTimeToAudio || !vc.hasNormalRtf || !vc.hasThrottleRtf) {
      hasFailure = true;
      failureReasons.push(`Voice card "${vc.title}" is missing required metrics.`);
    }
    if (!vc.hasLicenceSection) {
      hasFailure = true;
      failureReasons.push(`Voice card "${vc.title}" is missing primary source licensing information.`);
    }
  }

  // Verify Indian English audit card
  const auditSection = await page.evaluate(() => {
    const sec = document.querySelector('section:last-of-type');
    const heading = sec?.querySelector('h2')?.textContent?.trim() || '';
    const text = sec?.textContent || '';
    return {
      heading,
      hasPiper: text.includes('Piper Voices Catalog'),
      hasKokoro: text.includes('Kokoro-82M Architecture'),
      hasAI4Bharat: text.includes('AI4Bharat') || text.includes('Indic-Parler-TTS'),
      hasApacheLicense: text.includes('Apache-2.0'),
    };
  });

  console.log('Indian English audit check:', auditSection);
  results.indianEnglishAudit = auditSection;

  if (!auditSection.hasPiper || !auditSection.hasKokoro || !auditSection.hasAI4Bharat) {
    hasFailure = true;
    failureReasons.push('Indian English audit card is missing required coverage of Piper, Kokoro, or AI4Bharat.');
  }

  await browser.close();
} catch (err) {
  console.error('Test run error:', err);
  results.error = err.message;
  hasFailure = true;
  failureReasons.push(`Runtime error: ${err.message}`);
} finally {
  if (isViteServer) {
    await server.close();
  } else {
    server.close();
  }
}

fs.writeFileSync('/tmp/voice-test-results.json', JSON.stringify(results, null, 2));
console.log('Results written to /tmp/voice-test-results.json');
console.log(JSON.stringify(results, null, 2));

if (hasFailure) {
  console.error('\n❌ VOICE VERIFICATION HARNESS FAILED:');
  failureReasons.forEach((r, idx) => console.error(`  ${idx + 1}. ${r}`));
  process.exit(1);
} else {
  console.log('\n✅ VOICE VERIFICATION HARNESS PASSED all assertions with zero COOP/COEP headers!');
  process.exit(0);
}
