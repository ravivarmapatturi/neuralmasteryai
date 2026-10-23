// Pre-extracts every page's frontmatter (title, sidebar_position,
// description) plus each section's _category_.json into
// src/data/pageMeta.generated.json, so contentTree.ts can build the
// sidebar/nav tree from plain static JSON instead of eagerly importing
// (and bundling) every single .mdx page's compiled component just to read
// its frontmatter. That eager import.meta.glob was the root cause of the
// whole site shipping as one ~1.2MB-gzipped JS chunk regardless of route --
// this is the piece that lets the component import become lazy instead
// (see contentTree.ts).
//
// Same walk()+gray-matter pattern as check-internal-links.mjs, which
// already reimplements route derivation in plain Node for the same reason
// (contentTree.ts uses Vite's import.meta.glob and can't run outside Vite).
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import matter from 'gray-matter';

const root = join(import.meta.dirname, '..');
const CONTENT_ROOT = join(root, 'src', 'content', 'docs');
const OUTPUT = join(root, 'src', 'data', 'pageMeta.generated.json');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const allFiles = walk(CONTENT_ROOT);
const mdxFiles = allFiles.filter((f) => extname(f) === '.mdx');
const categoryFiles = allFiles.filter((f) => f.endsWith('_category_.json'));

const pages = {};
for (const file of mdxFiles) {
  const rel = relative(CONTENT_ROOT, file).replace(/\.mdx$/, '').split('\\').join('/');
  const parts = rel.split('/');
  const section = parts.length > 1 ? parts[0] : 'general';
  const raw = readFileSync(file, 'utf8');
  const { data } = matter(raw);
  pages[`/docs/${rel}`] = {
    slug: rel,
    section,
    title: data.title ?? null,
    sidebarPosition: typeof data.sidebar_position === 'number' ? data.sidebar_position : null,
    description: data.description ?? null,
    // Practice-problem-only fields (real, structured tags -- see Phase 2 of
    // the Learn/Practice split). null for every other page, which never
    // had and never needs these.
    difficulty: data.difficulty ?? null,
    topic: data.topic ?? null,
    placeholder: data.placeholder === true,
  };
}

const categories = {};
for (const file of categoryFiles) {
  const section = relative(CONTENT_ROOT, dirname(file)).split('\\').join('/');
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  categories[section] = { label: meta.label, position: meta.position };
}

writeFileSync(OUTPUT, JSON.stringify({ pages, categories }, null, 2) + '\n');

// Blog posts (src/content/blog/<slug>.mdx): title, date, description and
// reading time for the /blog list, newest first. Like the docs metadata,
// this keeps the list page from importing every post's compiled component.
const BLOG_ROOT = join(root, 'src', 'content', 'blog');
const BLOG_OUTPUT = join(root, 'src', 'data', 'blogMeta.generated.json');
const posts = existsSync(BLOG_ROOT)
  ? readdirSync(BLOG_ROOT)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => {
        const { data, content } = matter(readFileSync(join(BLOG_ROOT, f), 'utf8'));
        const words = content.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? '');
        if (!data.title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`blog/${f}: needs a title and a YYYY-MM-DD date`);
        return {
          slug: f.replace(/\.mdx$/, ''),
          title: data.title,
          description: data.description ?? null,
          date,
          tags: Array.isArray(data.tags) ? data.tags : [],
          readingMinutes: Math.max(1, Math.round(words / 230)),
          series: typeof data.series === 'string' ? data.series : null,
          part: typeof data.part === 'number' ? data.part : null,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)))
  : [];
writeFileSync(BLOG_OUTPUT, JSON.stringify(posts, null, 2) + '\n');
console.log(`generate-page-meta: wrote ${posts.length} blog posts to src/data/blogMeta.generated.json`);
console.log(`generate-page-meta: wrote ${Object.keys(pages).length} pages, ${Object.keys(categories).length} categories to ${existsSync(OUTPUT) ? 'src/data/pageMeta.generated.json' : OUTPUT}`);
