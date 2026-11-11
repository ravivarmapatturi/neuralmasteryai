// Pure route/path logic extracted from prerender-for-pagefind.mjs so it
// can be unit-tested without touching the real filesystem, spawning a
// server, or launching a browser -- the parts of that script that
// actually need those things (walking dist/, snapshotting with
// Playwright) stay there; the string transformations that decide WHICH
// route a file maps to, and WHERE its snapshot gets written, are pure.
import { join, relative } from 'node:path';

/** Maps an absolute .mdx file path to its site route, exactly as
 * prerender-for-pagefind.mjs's routesFromContentTree() does: relativize
 * against the content root (node:path's relative(), the same function the
 * real script uses -- not a manual string slice, so this stays exactly
 * equivalent across platforms), strip the .mdx extension, normalize
 * Windows backslashes to forward slashes, prefix with /docs/ -- EXCEPT a
 * practice-problems file, which maps to its real, current /practice/<slug>
 * route instead (see contentTree.ts's practiceRoute(), the same remap
 * applied at runtime; overview.mdx no longer exists on disk, superseded by
 * the real /practice list page, so it's never passed in here). */
export function routeFromMdxPath(absoluteFilePath, contentRoot, practiceSlugs = {}) {
  const relPath = relative(contentRoot, absoluteFilePath).replace(/\.mdx$/, '');
  const posixPath = relPath.split('\\').join('/');
  const PRACTICE_PREFIX = 'practice-problems/';
  if (posixPath.startsWith(PRACTICE_PREFIX)) {
    // Curated problems are served at a descriptive slug
    // (src/data/practiceSlugs.generated.json), the rest at their file id.
    const id = posixPath.slice(PRACTICE_PREFIX.length);
    return `/practice/${practiceSlugs[id] ?? id}`;
  }
  return `/docs/${posixPath}`;
}

/** Maps a route to the on-disk path its prerendered snapshot gets written
 * to, under a given base directory (.pagefind-prerender/ or dist/) --
 * always <base>/<route-without-leading-slash>/index.html. */
export function outputPathForRoute(route, baseDir) {
  return join(baseDir, route.replace(/^\//, ''), 'index.html');
}

const PRACTICE_LINK = /\/practice\/([a-z0-9][a-z0-9-]*)/g;

/** The hidden practice problems that published pages link to, directly or
 * through another linked hidden problem. Lessons point at these, so each
 * needs a real file or its URL answers 404 to anything that does not run
 * the app. `readHidden(id)` returns that problem's source text. */
export function linkedHiddenPractice(publishedTexts, hiddenIds, readHidden) {
  const linksIn = (text) => [...text.matchAll(PRACTICE_LINK)].map((m) => m[1]).filter((id) => hiddenIds.has(id));
  const found = new Set();
  let frontier = publishedTexts.flatMap(linksIn);
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      if (found.has(id)) continue;
      found.add(id);
      next.push(...linksIn(readHidden(id)));
    }
    frontier = next;
  }
  return [...found].sort();
}

/** Internal links in a snapshot, rewritten to the trailing-slash URL each
 * page is really served at, so a crawler reading the file is not sent
 * through a redirect for every link. Files ("/favicon.svg"), the root and
 * links that already end in a slash are left alone. */
export function withTrailingSlashLinks(html) {
  return html.replace(/(<a\b[^>]*?\shref=")(\/[^"?#]*[^"\/?#])((?:[?#][^"]*)?")/g, (whole, before, path, after) =>
    path.startsWith('//') || /\.[a-z0-9]+$/i.test(path) ? whole : `${before}${path}/${after}`);
}
