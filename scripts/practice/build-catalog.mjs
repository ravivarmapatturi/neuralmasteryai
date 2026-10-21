#!/usr/bin/env node
/**
 * Validates the curated Practice catalogue (src/data/practiceCatalog.ts) and
 * derives everything that hangs off it:
 *
 *   - src/data/practiceSlugs.generated.json: { problemId: descriptiveSlug }
 *     for every curated problem. contentTree serves each problem at
 *     /practice/<slug>, and the old /practice/<id> URL redirects there.
 *   - Cleans each curated problem's MDX page of generator boilerplate:
 *     "Practice:" title prefixes, "#861." numbering, "Rank #861 of 1072 /
 *     40 XP" lines, the "Master X in the Y track of the 1,000+ problem
 *     curriculum" description, and the duplicate inline playground.
 *
 * Run after editing practiceCatalog.ts:  node scripts/practice/build-catalog.mjs
 * Fails (exit 1) on an unknown problem id, a duplicate, or a missing Learn route.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROBLEM_DIR = path.join(ROOT, 'src/content/docs/practice-problems');

const catalogSrc = fs.readFileSync(path.join(ROOT, 'src/data/practiceCatalog.ts'), 'utf8');
const { code } = transformSync(catalogSrc, { loader: 'ts', format: 'esm' });
const { CATALOG } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const pageMeta = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pageMeta.generated.json'), 'utf8')).pages;
const structuredSrc = fs.readFileSync(path.join(ROOT, 'src/lib/practiceProblem.ts'), 'utf8');
// Project tracks: generated, already-descriptive ids, no boilerplate to clean.
const projectTracks = ['buildAnAgent', 'specifyVerifyDebug'].flatMap((name) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, `src/data/practice/${name}.generated.json`), 'utf8')),
);
const agentIds = new Set(projectTracks.map((p) => p.id));
const existingIds = new Set(fs.readdirSync(PROBLEM_DIR).filter((f) => f.endsWith('.mdx')).map((f) => f.slice(0, -4)));

const errors = [];
const seen = new Set();
const slugs = {};
const usedSlugs = new Set();

export function cleanTitle(raw) {
  return raw
    .replace(/^(Practice:\s*)+/i, '')
    .replace(/^#\d+\.\s*/, '')
    .trim();
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/\bfrom scratch\b/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    // Shorter URLs: drop words that say nothing about the problem itself.
    .replace(/^(numpy-vectorized|vectorized|numpy|pandas)-/, '')
    .replace(/-(simulator|metric|calculator|engine)$/, '');
}

for (const track of CATALOG) {
  if (!pageMeta[track.learnRoute]) errors.push(`${track.slug}: learnRoute ${track.learnRoute} is not a real page`);
  for (const id of track.problems) {
    if (seen.has(id)) errors.push(`${track.slug}: ${id} is listed twice`);
    seen.add(id);
    if (!existingIds.has(id)) {
      errors.push(`${track.slug}: no MDX page for ${id}`);
      continue;
    }
    const structured = agentIds.has(id) || new RegExp(`\n  ['"]${id}['"]: \{\n`).test(structuredSrc);
    if (!structured) errors.push(`${track.slug}: ${id} has no structured test cases`);

    if (agentIds.has(id)) {
      slugs[id] = id; // already descriptive
      usedSlugs.add(id);
      continue;
    }
    const meta = pageMeta[`/docs/practice-problems/${id}`];
    let slug = slugify(cleanTitle(meta?.title ?? id));
    // Never shadow a different problem's existing URL, never reuse a slug.
    if ((existingIds.has(slug) && slug !== id) || usedSlugs.has(slug)) slug = `${slug}-${track.slug}`;
    if ((existingIds.has(slug) && slug !== id) || usedSlugs.has(slug)) errors.push(`${id}: cannot find a free slug (${slug})`);
    usedSlugs.add(slug);
    slugs[id] = slug;
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

fs.writeFileSync(path.join(ROOT, 'src/data/practiceSlugs.generated.json'), `${JSON.stringify(slugs, null, 1)}\n`);

// --- Duplicates of curated problems --------------------------------------
// The generator produced the same exercise under several topics ("Reverse
// Linked List" exists three times). A hidden copy that implements the same
// function, or has the same title, as a curated problem redirects to it.
const fnById = new Map();
for (const m of structuredSrc.matchAll(/\bid: ["']([a-z0-9-]+)["'],[\s\S]{0,600}?functionName: ["']([A-Za-z0-9_]+)["']/g)) {
  if (!fnById.has(m[1])) fnById.set(m[1], m[2]);
}
const curatedByFn = new Map();
const curatedByTitle = new Map();
for (const id of seen) {
  if (fnById.has(id)) curatedByFn.set(fnById.get(id), id);
  const meta = pageMeta[`/docs/practice-problems/${id}`];
  if (meta?.title) curatedByTitle.set(slugify(cleanTitle(meta.title)), id);
}
const duplicates = {};
for (const id of existingIds) {
  if (seen.has(id) || id === 'overview') continue;
  const meta = pageMeta[`/docs/practice-problems/${id}`];
  const target = curatedByFn.get(fnById.get(id)) ?? (meta?.title ? curatedByTitle.get(slugify(cleanTitle(meta.title))) : undefined);
  if (target) duplicates[id] = target;
}
fs.writeFileSync(path.join(ROOT, 'src/data/practiceDuplicates.generated.json'), `${JSON.stringify(duplicates, null, 1)}\n`);


// --- MDX boilerplate cleanup (idempotent) ---------------------------------
let cleaned = 0;
for (const track of CATALOG) {
  for (const id of track.problems) {
    if (agentIds.has(id)) continue;
    const file = path.join(PROBLEM_DIR, `${id}.mdx`);
    const before = fs.readFileSync(file, 'utf8');
    const fm = before.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) continue;
    let front = fm[1];
    let body = before.slice(fm[0].length);

    const titleMatch = front.match(/^title:\s*"?(.*?)"?\s*$/m);
    const title = cleanTitle(titleMatch ? titleMatch[1] : id);
    front = front.replace(/^title:.*$/m, `title: ${JSON.stringify(title)}`);

    // First real sentence of the Overview is a better description than the
    // generated "Master X in the Y track of the 1,000+ problem ..." line.
    const overview = body.match(/## Overview\s*\n+([^\n]+)/);
    const descMatch = front.match(/^description:\s*(.*)$/m);
    const generated = descMatch && /1,000\+ problem|Curriculum Problem \d+|^"?Master /.test(descMatch[1]);
    if (generated) {
      let desc = overview ? overview[1].replace(/`/g, '').split(/(?<=\.)\s/)[0] : `${title}, with tests that run in your browser.`;
      if (desc.length > 200) desc = `${desc.slice(0, 197).replace(/\s+\S*$/, '')}...`;
      front = front.replace(/^description:.*$/m, `description: ${JSON.stringify(desc)}`);
    }

    body = body
      .replace(/^# .*\n+/m, '') // "# #861. Dense Layer Forward Pass" -- the workspace shows the title
      .replace(/^\*\*(Track|Rank)\b.*\n+/m, '') // "**Track**: ... | **Rank**: #861 of 1072 | **Points**: 40 XP"
      .replace(/^<PracticePlayground [^\n]*\/>\n+/m, ''); // the workspace already is the playground
    if (!body.includes('<PracticePlayground')) {
      body = body.replace(/^import PracticePlayground from [^\n]*\n/m, '');
    }
    const after = `---\n${front}\n---\n${body.replace(/^\n+/, '\n')}`;
    if (after !== before) {
      fs.writeFileSync(file, after);
      cleaned += 1;
    }
  }
}

const total = CATALOG.reduce((n, t) => n + t.problems.length, 0);
console.log(`catalog OK: ${CATALOG.length} tracks, ${total} curated problems, ${cleaned} MDX pages cleaned, ${Object.keys(duplicates).length} hidden duplicates redirected`);
