import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/evidence/diagram-audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

const diagramName = process.argv[2];
const suffix = process.argv[3] || 'before'; // 'before' | 'after'

if (!diagramName) {
  console.error('Usage: node scripts/audit-screenshot.mjs <DiagramName> [before|after]');
  process.exit(1);
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await page.goto(`http://localhost:5201/viz-audit?name=${diagramName}`, { waitUntil: 'networkidle' });
    
    // Wait for the diagram stage to render
    const stage = page.locator('#diagram-stage');
    await stage.waitFor({ timeout: 5000 });
    // small wait for SVGs and fonts to settle
    await page.waitForTimeout(300);

    const outPath = path.join(OUT_DIR, `${diagramName}-${suffix}.png`);
    await stage.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
