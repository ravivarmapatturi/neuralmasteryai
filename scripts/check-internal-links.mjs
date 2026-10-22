// Validates internal links found in MDX source content against the actual
// set of routes the content-tree would generate (src/lib/contentTree.ts's
// logic, reimplemented here in plain Node since that file uses Vite's
// import.meta.glob and can't run outside a Vite build).
//
// Scope, deliberately: this checks MARKDOWN/JSX PROSE LINKS inside
// src/content/docs/**/*.mdx (`[text](/docs/...)` and `href="/docs/..."`)
// against the known-real route set. It does NOT check:
//   - external links (http/https) -- no network calls in CI, by design
//   - in-page anchors (#heading-id) -- see check-anchor-links.mjs (run
//     together via `npm run check:links`), which validates those instead
//   - links generated at runtime from component data (e.g. AlgorithmSelector's
//     decision-tree hrefs, LearningPathMap's section hrefs) -- those
//     intentionally point at not-yet-migrated routes right now (see
//     MIGRATION_STATUS.md's "Special attention" section) and are a
//     content-migration-phase concern, not a broken-prose-link one.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import matter from 'gray-matter';

const CONTENT_ROOT = join(import.meta.dirname, '..', 'src', 'content', 'docs');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(entry) === '.mdx') out.push(full);
  }
  return out;
}

const files = walk(CONTENT_ROOT);
// Blog posts link into Learn too, so their links are checked the same way.
const BLOG_FILES = walk(join(import.meta.dirname, '..', 'src', 'content', 'blog'));

// Build the same route set contentTree.ts derives from the file tree --
// including its practice-problems remap (/docs/practice-problems/<slug> ->
// /practice/<slug>, overview -> the real /practice list page, not a doc
// route at all) so a prose link written against either the old or new URL
// shape is checked against what the app will ACTUALLY render at, not just
// "does a file exist at this literal path".
const PRACTICE_SLUGS = JSON.parse(readFileSync(new URL('../src/data/practiceSlugs.generated.json', import.meta.url), 'utf8'));
const validRoutes = new Set(['/practice', '/blog']);
// Blog posts: /blog/<slug> for every src/content/blog/<slug>.mdx.
for (const f of readdirSync(new URL('../src/content/blog/', import.meta.url))) if (f.endsWith('.mdx')) validRoutes.add(`/blog/${f.slice(0, -4)}`);
// Track pages: /practice/track/<slug> for every catalogue track (slugs read
// from src/data/practiceCatalog.ts, the same list the app renders).
const CATALOG_SRC = readFileSync(new URL('../src/data/practiceCatalog.ts', import.meta.url), 'utf8');
for (const [, slug] of CATALOG_SRC.matchAll(/^    slug: '([a-z0-9-]+)',$/gm)) validRoutes.add(`/practice/track/${slug}`);
for (const f of files) {
  const rel = relative(CONTENT_ROOT, f).replace(/\.mdx$/, '').split('\\').join('/');
  if (rel.startsWith('practice-problems/')) {
    const slug = rel.slice('practice-problems/'.length);
    // Curated problems are served at a descriptive slug
    // (src/data/practiceSlugs.generated.json); every other one at its file id.
    if (slug !== 'overview') validRoutes.add(`/practice/${PRACTICE_SLUGS[slug] ?? slug}`);
  } else {
    validRoutes.add(`/docs/${rel}`);
  }
}

const LINK_PATTERNS = [
  /\[[^\]]*\]\((\/docs\/[^)#\s]+|\/practice\/?[^)#\s]*|\/blog\/?[^)#\s]*)/g, // markdown [text](/docs/... or /practice...)
  /\bhref=["'](\/docs\/[^"'#]+|\/practice\/?[^"'#]*)["']/g, // JSX/HTML href="..."
  /\bto=["'](\/docs\/[^"'#]+|\/practice\/?[^"'#]*)["']/g, // react-router <Link to="...">
];

let brokenCount = 0;
const findings = [];

for (const file of [...files, ...BLOG_FILES]) {
  const raw = readFileSync(file, 'utf8');
  const { content } = matter(raw);
  for (const pattern of LINK_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      const link = match[1].replace(/\/$/, '');
      if (!validRoutes.has(link)) {
        brokenCount++;
        findings.push({ file: relative(process.cwd(), file), link });
      }
    }
  }
}

console.log(`check-internal-links: scanned ${files.length} MDX file(s), found ${validRoutes.size} valid route(s).`);
if (findings.length > 0) {
  console.error(`\nBroken internal link(s) found in MDX prose content:\n`);
  for (const f of findings) console.error(`  ${f.file} -> ${f.link}`);
  console.error(`\n${brokenCount} broken internal link(s). Failing.`);
  process.exit(1);
}
console.log('check-internal-links: no broken internal prose links found.');
