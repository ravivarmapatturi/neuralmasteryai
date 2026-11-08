import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/evidence/diagram-audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Read candidate names from arguments or file
const args = process.argv.slice(2);
const names = args.length > 0 ? args : JSON.parse(fs.readFileSync('candidate-diagrams.json', 'utf8')).slice(0, 20);

async function captureAll() {
  console.log(`Auditing ${names.length} diagrams...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  for (const name of names) {
    try {
      await page.goto(`http://localhost:5201/viz-audit?name=${name}`, { waitUntil: 'networkidle' });
      const stage = page.locator('#diagram-stage');
      await stage.waitFor({ timeout: 4000 });
      await page.waitForTimeout(200);

      const outPath = path.join(OUT_DIR, `${name}-before.png`);
      // Only capture if not already exists
      if (!fs.existsSync(outPath)) {
        await stage.screenshot({ path: outPath });
        console.log(`[Captured] ${name}`);
      } else {
        console.log(`[Exists] ${name}`);
      }
    } catch (e) {
      console.warn(`[Skip/Error] ${name}:`, e.message);
    }
  }

  await browser.close();
  console.log('Done batch capture.');
}

captureAll();
