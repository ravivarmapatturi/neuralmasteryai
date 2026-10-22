// Walks src/content/docs/**/*.mdx the same way src/lib/contentTree.ts does
// at runtime (route = "/docs/" + relative path minus .mdx) and writes a
// sitemap.xml into dist/ at build time. Kept as a plain filesystem walk
// rather than importing contentTree.ts directly, since that module relies
// on Vite's import.meta.glob and isn't runnable under plain Node.
import { writeFileSync, statSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

const SITE_URL = 'https://neuralmasteryai.com';
const docsDir = resolve(import.meta.dirname, '..', 'src', 'content', 'docs');
const dist = resolve(import.meta.dirname, '..', 'dist');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

// Only curated practice problems are listed, at their descriptive slugs
// (src/data/practiceSlugs.generated.json, built from practiceCatalog.ts).
// Hidden problems keep working URLs but aren't advertised to crawlers.
const practiceSlugs = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'src', 'data', 'practiceSlugs.generated.json'), 'utf8'));
const trackSlugs = [...readFileSync(resolve(import.meta.dirname, '..', 'src', 'data', 'practiceCatalog.ts'), 'utf8').matchAll(/^    slug: '([a-z0-9-]+)',$/gm)].map((m) => m[1]);

const files = walk(docsDir).filter((f) => {
  const rel = relative(docsDir, f).replace(/\.mdx$/, '').split('\\').join('/');
  return !rel.startsWith('practice-problems/') || practiceSlugs[rel.slice('practice-problems/'.length)];
});
const urls = [
  ...trackSlugs.map((slug) => ({ loc: `${SITE_URL}/practice/track/${slug}`, lastmod: null })),
  { loc: `${SITE_URL}/`, lastmod: null },
  { loc: `${SITE_URL}/learn`, lastmod: null },
  { loc: `${SITE_URL}/practice`, lastmod: null },
  { loc: `${SITE_URL}/blog`, lastmod: null },
  ...JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'src', 'data', 'blogMeta.generated.json'), 'utf8')).map((p) => ({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: p.date,
  })),
  ...files.map((f) => {
    const rel = relative(docsDir, f).replace(/\.mdx$/, '').split('\\').join('/');
    // Practice-problem pages live at /practice/<slug>, not /docs/<slug> --
    // same remap contentTree.ts's practiceRoute() applies at runtime (see
    // its comment). overview.mdx no longer exists on disk (superseded by
    // the real /practice list page above), so it's never walked here.
    const loc = rel.startsWith('practice-problems/')
      ? `${SITE_URL}/practice/${practiceSlugs[rel.slice('practice-problems/'.length)]}`
      : `${SITE_URL}/docs/${rel}`;
    return { loc, lastmod: statSync(f).mtime.toISOString().slice(0, 10) };
  }),
];

// Every page is served at its trailing-slash URL (GitHub Pages redirects the
// bare form), so list that form -- a sitemap entry that redirects isn't indexed.
for (const u of urls) if (!u.loc.endsWith('/')) u.loc += '/';

const body = urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`)
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(resolve(dist, 'sitemap.xml'), xml);
console.log(`generate-sitemap: wrote dist/sitemap.xml with ${urls.length} URLs`);
