// Pagefind indexes static HTML by crawling files on disk. platform-vite is
// a client-side-only SPA -- dist/index.html's <body> is just `<div
// id="root">` until React renders, so running `pagefind --site dist`
// directly indexes zero words (verified: it does, and fails the build).
//
// Fix: boot the real production build (via scripts/static-server.cjs,
// which reproduces GitHub Pages' base-path + no-SPA-fallback behavior),
// visit every real /docs/* route in a headless browser, and snapshot each
// route's fully-rendered HTML. Pagefind indexes the snapshot written to
// .pagefind-prerender/, and --output-path writes the resulting index into
// dist/pagefind.
//
// This same rendering pass ALSO writes each snapshot into
// dist/<route>/index.html -- a real, per-route static HTML file with real
// rendered content, not just the generic SPA shell. This closes a real
// crawlability bug: GitHub Pages has exactly one physical file
// (dist/index.html) for a client-side-only SPA, so every /docs/* URL
// previously 404'd (real HTTP 404 status, generic untitled body) for any
// client that doesn't execute JS -- WebFetch, most crawlers, link-preview
// bots -- even though a real browser renders it fine once React boots.
// Confirmed directly: `curl -I` against the deployed site returned 404 for
// a real content page. Writing a real file at each route's path means
// GitHub Pages serves a genuine 200 with real content there instead; the
// browser-facing behavior is unchanged, since the file still ships the
// same JS bundle and React still boots and takes over the DOM normally.
//
// GitHub Pages 301-redirects a bare directory path ("/docs/foo") to its
// trailing-slash form ("/docs/foo/") once dist/docs/foo/index.html exists
// (confirmed against production) -- src/lib/contentTree.ts's
// getPageByRoute() normalizes that trailing slash away so the client-side
// router still matches correctly after the redirect lands.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { routeFromMdxPath, outputPathForRoute } from './lib/prerenderRoutes.mjs';

const ROOT = join(import.meta.dirname, '..');
const CONTENT_ROOT = join(ROOT, 'src', 'content', 'docs');
const DIST_DIR = join(ROOT, 'dist');
const PRERENDER_DIR = join(ROOT, '.pagefind-prerender');
const PORT = 4174;
const BASE = ''; // served from the custom domain's own root now, no subpath prefix

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(entry) === '.mdx') out.push(full);
  }
  return out;
}

// A `placeholder: true` frontmatter flag marks a page as templated
// filler with no real content yet (currently ~1,470 mechanically
// generated practice-problem stubs) -- prerendering and indexing those
// was the dominant cost in this step (each one needs a real headless
// browser render), ballooning CI/deploy time from ~2-3 minutes to ~10
// once the page count went from ~309 to ~1,792. Skipping them here
// means they're reachable through the SPA like any other route, just
// without a static prerendered file or a Pagefind search entry -- which
// is the right tradeoff for content that's not real yet anyway (no
// value indexing near-duplicate template text, and no value having
// search engines crawl it). Remove the frontmatter flag once a given
// problem gets real content and it rejoins prerendering/indexing
// automatically, no code change needed here.
function isPlaceholder(mdxPath) {
  const head = readFileSync(mdxPath, 'utf8').slice(0, 200);
  return /^placeholder:\s*true\s*$/m.test(head);
}

function routesFromContentTree() {
  return walk(CONTENT_ROOT)
    .filter((f) => !isPlaceholder(f))
    .map((f) => routeFromMdxPath(f, CONTENT_ROOT));
}

// App.tsx's non-/docs/* routes -- these aren't in the content tree at all,
// so routesFromContentTree() never sees them, and they were missing this
// same crawlability fix entirely: confirmed live, '/' served a real 200 but
// with the bare <div id="root"> shell (zero real content, since nothing
// had rendered into it yet), and '/progress' served a genuine 404 (no
// physical file exists at dist/progress/index.html for a client-side-only
// route). Keep this in sync with App.tsx's <Route> list by hand -- it's
// short and changes rarely enough that walking the router tree
// programmatically isn't worth the complexity. '/practice' is the real
// problem-LIST page (eagerly rendered, like '/' and '/progress' -- see the
// readySelector split below); the individual /practice/<slug> problem
// pages themselves come from routesFromContentTree()'s remap instead.
// /profile, /leaderboard, /about, /privacy, /terms were missing from
// this list entirely (added after the original fix that covered
// '/', '/learn', '/progress', '/practice') -- each one genuinely 404'd
// on the live site (real HTTP 404 status, confirmed via a real website
// audit 2026-10-07), the identical bug this list exists to prevent.
const APP_ROUTES = ['/', '/learn', '/progress', '/practice', '/profile', '/leaderboard', '/about', '/privacy', '/terms'];

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`static-server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function main() {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('prerender-for-pagefind: dist/index.html missing -- run `npm run build` first.');
    process.exit(1);
  }

  rmSync(PRERENDER_DIR, { recursive: true, force: true });
  mkdirSync(PRERENDER_DIR, { recursive: true });

  const server = spawn(process.execPath, [join(ROOT, 'scripts', 'static-server.cjs')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });

  try {
    await waitForServer(`http://localhost:${PORT}${BASE}/`);

    const routes = [...APP_ROUTES, ...routesFromContentTree()];
    console.log(`prerender-for-pagefind: snapshotting ${routes.length} route(s)...`);

    // 208 routes taken one at a time (each waiting for full network-idle)
    // was the single slowest step in CI (~2.5 minutes). Snapshotting is
    // embarrassingly parallel -- every route is independent -- so this
    // fans the work out across a small pool of concurrent pages sharing
    // one browser, and swaps 'networkidle' (waits for zero network
    // activity) for 'domcontentloaded' + the existing waitForSelector,
    // which is what was actually gating readiness anyway.
    const CONCURRENCY = 4;
    const browser = await chromium.launch();
    let cursor = 0;
    async function worker() {
      const page = await browser.newPage();
      while (cursor < routes.length) {
        const route = routes[cursor++];
        const isDocRoute = route.startsWith('/docs/');
        const readySelector = isDocRoute ? 'article.prose h1, article.prose h2, article.prose h3, article.prose' : 'h1, h2, #root';

        let rendered = false;
        let attempts = 0;
        while (!rendered && attempts < 2) {
          attempts++;
          try {
            await page.goto(`http://localhost:${PORT}${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector(readySelector, { timeout: 30000 });
            rendered = true;
          } catch (err) {
            if (attempts >= 2) {
              throw new Error(`Timeout waiting for '${readySelector}' on route: ${route} (${err.message})`);
            }
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(200);
        const html = await page.content();

        const pagefindOutFile = outputPathForRoute(route, PRERENDER_DIR);
        mkdirSync(dirname(pagefindOutFile), { recursive: true });
        writeFileSync(pagefindOutFile, html);

        // Real, crawlable static HTML at the route's own path in dist/ --
        // see the file header for why this exists.
        const distOutFile = outputPathForRoute(route, DIST_DIR);
        mkdirSync(dirname(distOutFile), { recursive: true });
        writeFileSync(distOutFile, html);
      }
      await page.close();
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    await browser.close();
    console.log(`prerender-for-pagefind: wrote ${routes.length} rendered page(s) to ${relative(ROOT, PRERENDER_DIR)}/ and to ${relative(ROOT, DIST_DIR)}/<route>/`);
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error('prerender-for-pagefind failed:', e);
  process.exit(1);
});
