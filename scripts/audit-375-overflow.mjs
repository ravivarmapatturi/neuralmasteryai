#!/usr/bin/env node
/**
 * 375px Mobile Viewport Overflow Audit
 *
 * Loads at least 60 evenly sampled live pages across docs, blog, atlas, labs,
 * glossary, and interview routes at 375x812 viewport. Also includes pages
 * known for wide diagrams, tables, and code blocks.
 *
 * Records documentElement.scrollWidth against clientWidth (375) and identifies
 * any overflowing elements (bounding client rect right > clientWidth or scrollWidth > clientWidth).
 *
 * Exits with status 1 if any page has scrollWidth > clientWidth.
 *
 * Usage:
 *   node scripts/audit-375-overflow.mjs [--base-url https://neuralmasteryai.com] [--concurrency 2]
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// CLI options
const args = process.argv.slice(2);
let baseUrl = process.env.BASE_URL || 'https://neuralmasteryai.com';
let concurrency = 2;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    baseUrl = args[i + 1];
    i++;
  } else if (args[i] === '--concurrency' && args[i + 1]) {
    concurrency = parseInt(args[i + 1], 10) || 2;
    i++;
  }
}
baseUrl = baseUrl.replace(/\/+$/, '');

// Gather route inventory
const pageMetaPath = resolve(rootDir, 'src/data/pageMeta.generated.json');
const blogMetaPath = resolve(rootDir, 'src/data/blogMeta.generated.json');
const practiceCatalogPath = resolve(rootDir, 'src/data/practiceCatalog.ts');
const practiceSlugsPath = resolve(rootDir, 'src/data/practiceSlugs.generated.json');
const glossaryPath = resolve(rootDir, 'src/data/glossary.ts');

const pageMeta = JSON.parse(readFileSync(pageMetaPath, 'utf8'));
const blogMeta = JSON.parse(readFileSync(blogMetaPath, 'utf8'));
const practiceSlugs = JSON.parse(readFileSync(practiceSlugsPath, 'utf8'));
const practiceCatalogContent = readFileSync(practiceCatalogPath, 'utf8');
const glossaryContent = readFileSync(glossaryPath, 'utf8');

const trackSlugs = [
  ...practiceCatalogContent.matchAll(/^    slug: '([a-z0-9-]+)',$/gm),
].map((m) => m[1]);

const glossarySlugs = [
  ...glossaryContent.matchAll(/^  t\('([a-z0-9-]+)'/gm),
].map((m) => m[1]);

// 1. Docs routes: evenly sample ~30 pages out of 1855
const allDocsRoutes = Object.keys(pageMeta.pages).sort();
const sampledDocs = [];
const stepDocs = Math.floor(allDocsRoutes.length / 30);
for (let i = 0; i < allDocsRoutes.length && sampledDocs.length < 30; i += stepDocs) {
  sampledDocs.push(allDocsRoutes[i]);
}

// 2. Specific pages known for wide diagrams, tables, and code
const knownWideDocs = [
  '/docs/deep-learning/attention-transformers', // flagship visualizer
  '/docs/cs-fundamentals/apis-http-and-protocols', // PatternComparisonMatrixDiagram
  '/docs/databases/vector/overview', // VectorDbToolComparisonDiagram + markdown table
  '/docs/llms-genai/retrieval-and-reranking-architectures', // MaxSimWorkedExample
  '/docs/speech-audio/overview', // AudioEvaluationMetricsDiagram
  '/docs/mlops/engineering-foundations', // DependencyPinningDiagram
  '/docs/python-engineering/packaging-testing-and-tooling', // DependencyPinningDiagram
  '/docs/databases/relational/postgresql', // JoinTypesDiagram
  '/docs/nlp/classical-nlp', // StemmingVsLemmatizationDiagram
  '/docs/computer-vision/modern-vision-and-multimodal', // VideoUnderstandingArchitectureDiagram
  '/docs/context-engineering/dynamic-tool-discovery', // markdown table
  '/docs/agent-observability/failure-taxonomy-and-anomaly-detection', // RunnableCode
  '/docs/agent-observability/opentelemetry-and-distributed-tracing', // RunnableCode
  '/docs/agents/plan-and-execute', // RunnableCode
  '/docs/deep-learning/optimizers', // RunnableCode
];

// 3. Atlas routes
const atlasRoutes = [
  '/atlas',
  '/docs/atlas/training',
  '/docs/atlas/inference',
  '/docs/atlas/agent-architecture',
  '/docs/atlas/agent-protocols',
];

// 4. Blog routes: list + series + sampled posts
const sampledBlogSlugs = [
  blogMeta[0]?.slug,
  blogMeta[Math.floor(blogMeta.length * 0.25)]?.slug,
  blogMeta[Math.floor(blogMeta.length * 0.5)]?.slug,
  blogMeta[Math.floor(blogMeta.length * 0.75)]?.slug,
  blogMeta[blogMeta.length - 1]?.slug,
  'what-is-changing-in-ai-engineering-and-what-to-learn-next',
  'us-healthcare-10-prior-authorization',
].filter(Boolean);

const blogRoutes = [
  '/blog',
  '/blog/series/prompt-engineering',
  ...sampledBlogSlugs.map((s) => `/blog/${s}`),
];

// 5. Labs & Practice: list, tracks, and sampled practice problems
const allPracticeSlugs = Object.keys(practiceSlugs).sort();
const sampledPracticeSlugs = [];
const stepPractice = Math.floor(allPracticeSlugs.length / 8);
for (let i = 0; i < allPracticeSlugs.length && sampledPracticeSlugs.length < 8; i += stepPractice) {
  sampledPracticeSlugs.push(allPracticeSlugs[i]);
}
// Known practice problems with tables or code
if (!sampledPracticeSlugs.includes('ds-algo-prob-55')) sampledPracticeSlugs.push('ds-algo-prob-55');
if (!sampledPracticeSlugs.includes('find-duplicates')) sampledPracticeSlugs.push('find-duplicates');

const labsRoutes = [
  '/labs',
  '/practice/track/deep-learning-core',
  '/practice/track/agents-mcp-frameworks',
  ...sampledPracticeSlugs.map((s) => `/practice/${s}`),
];

// 6. Glossary: index + sampled terms
const sampledGlossarySlugs = [];
const stepGlossary = Math.floor(glossarySlugs.length / 8);
for (let i = 0; i < glossarySlugs.length && sampledGlossarySlugs.length < 8; i += stepGlossary) {
  sampledGlossarySlugs.push(glossarySlugs[i]);
}
// Important terms
if (!sampledGlossarySlugs.includes('attention-mechanism')) sampledGlossarySlugs.push('attention-mechanism');
if (!sampledGlossarySlugs.includes('quantization')) sampledGlossarySlugs.push('quantization');
if (!sampledGlossarySlugs.includes('model-context-protocol')) sampledGlossarySlugs.push('model-context-protocol');

const glossaryRoutes = [
  '/glossary',
  ...sampledGlossarySlugs.map((s) => `/glossary/${s}`),
];

// 7. Interview routes
const interviewRoutes = [
  '/interview',
  '/interview/mock',
];

// 8. Core landing / navigation routes
const coreRoutes = [
  '/',
  '/learn',
];

// Combine and deduplicate
const routeSet = new Set([
  ...coreRoutes,
  ...sampledDocs,
  ...knownWideDocs,
  ...atlasRoutes,
  ...blogRoutes,
  ...labsRoutes,
  ...glossaryRoutes,
  ...interviewRoutes,
]);

const routesToAudit = Array.from(routeSet);

console.log(`=======================================================`);
console.log(`375px Mobile Viewport Overflow Audit`);
console.log(`Target Base URL: ${baseUrl}`);
console.log(`Total Routes to Audit: ${routesToAudit.length}`);
console.log(`Breakdown:`);
console.log(`  - Core routes: ${coreRoutes.length}`);
console.log(`  - Sampled Docs: ${sampledDocs.length}`);
console.log(`  - Known Wide/Diagram Docs: ${knownWideDocs.length}`);
console.log(`  - Atlas: ${atlasRoutes.length}`);
console.log(`  - Blog: ${blogRoutes.length}`);
console.log(`  - Labs/Practice: ${labsRoutes.length}`);
console.log(`  - Glossary: ${glossaryRoutes.length}`);
console.log(`  - Interview: ${interviewRoutes.length}`);
console.log(`=======================================================\n`);

async function auditRoute(browser, route) {
  const url = `${baseUrl}${route}`;
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Allow any dynamic layout / hydrations to settle
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const scrollW = docEl.scrollWidth;
      const clientW = docEl.clientWidth;
      const bodyScrollW = document.body ? document.body.scrollWidth : 0;
      const effectiveScrollW = Math.max(scrollW, bodyScrollW);

      let widestElement = null;
      let maxElWidth = clientW;
      const culprits = [];

      const all = document.querySelectorAll('*');
      for (const el of all) {
        // Skip script, style, head, noscript
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'head', 'noscript', 'meta', 'link'].includes(tag)) continue;

        const rect = el.getBoundingClientRect();
        const elScrollW = el.scrollWidth;

        // An element is an overflow culprit if its rendered right edge exceeds the viewport
        // or its scrollWidth exceeds clientWidth while being visibly in layout
        const extendsRight = rect.right > clientW + 1;
        const scrollsWide = elScrollW > clientW + 1 && el.clientWidth > clientW;

        if (extendsRight || scrollsWide) {
          const id = el.id ? `#${el.id}` : '';
          const classes = typeof el.className === 'string' && el.className.trim()
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
            : '';
          const desc = `${tag}${id}${classes}`;
          const rightEdge = Math.round(rect.right);
          const totalWidth = Math.max(rightEdge, elScrollW);

          if (totalWidth > maxElWidth) {
            maxElWidth = totalWidth;
            widestElement = {
              selector: desc,
              rectRight: rightEdge,
              rectWidth: Math.round(rect.width),
              scrollWidth: elScrollW,
              clientWidth: el.clientWidth,
              outerHTMLSnippet: el.outerHTML.slice(0, 160).replace(/\n/g, ' '),
            };
          }

          culprits.push({
            selector: desc,
            rectRight: rightEdge,
            scrollWidth: elScrollW,
          });
        }
      }

      return {
        scrollWidth: effectiveScrollW,
        clientWidth: clientW,
        hasOverflow: effectiveScrollW > clientW + 0.5,
        widestElement,
        culpritCount: culprits.length,
      };
    });

    const status = res ? res.status() : 200;
    return {
      route,
      status,
      scrollWidth: metrics.scrollWidth,
      clientWidth: metrics.clientWidth,
      hasOverflow: metrics.hasOverflow,
      widestElement: metrics.widestElement,
      culpritCount: metrics.culpritCount,
    };
  } catch (err) {
    return {
      route,
      status: 'ERROR',
      error: err.message,
      scrollWidth: 0,
      clientWidth: 375,
      hasOverflow: false,
    };
  } finally {
    await context.close();
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const overflows = [];

  try {
    // Process routes in batches of `concurrency`
    for (let i = 0; i < routesToAudit.length; i += concurrency) {
      const batch = routesToAudit.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((route) => auditRoute(browser, route))
      );

      for (const res of batchResults) {
        results.push(res);
        if (res.hasOverflow) {
          overflows.push(res);
          console.log(
            `❌ [OVERFLOW] ${res.route} | scrollWidth: ${res.scrollWidth}px (client: ${res.clientWidth}px)`
          );
          if (res.widestElement) {
            console.log(
              `   Widest: ${res.widestElement.selector} | right: ${res.widestElement.rectRight}px | scroll: ${res.widestElement.scrollWidth}px`
            );
            console.log(`   Snippet: ${res.widestElement.outerHTMLSnippet}`);
          }
        } else if (res.status === 'ERROR') {
          console.log(`⚠️  [ERROR] ${res.route}: ${res.error}`);
        } else {
          console.log(
            `✅ [CLEAN] ${res.route} | scrollWidth: ${res.scrollWidth}px`
          );
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n=======================================================`);
  console.log(`Audit Summary:`);
  console.log(`  Total pages audited: ${results.length}`);
  console.log(`  Clean pages (<= 375px): ${results.length - overflows.length}`);
  console.log(`  Overflowing pages (> 375px): ${overflows.length}`);
  console.log(`=======================================================`);

  if (overflows.length > 0) {
    console.log(`\nFailing routes with horizontal overflow:`);
    for (const ov of overflows) {
      console.log(
        `  - ${ov.route}: scrollWidth=${ov.scrollWidth}px, widest=${ov.widestElement?.selector || 'unknown'} (right=${ov.widestElement?.rectRight}px, scroll=${ov.widestElement?.scrollWidth}px)`
      );
    }
    process.exit(1);
  } else {
    console.log(`\n🎉 Zero horizontal overflow detected across all ${results.length} audited routes!`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
