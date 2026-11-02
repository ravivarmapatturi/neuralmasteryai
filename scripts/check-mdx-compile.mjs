#!/usr/bin/env node
// Compiles every MDX file so a syntax error fails fast, without the 5 GB build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : []; });
let bad = 0; const files = walk('src/content');
for (const f of files) {
  try { await compile(readFileSync(f, 'utf8'), { remarkPlugins: [remarkGfm, remarkMath] }); }
  catch (e) { bad++; console.log(`${f}:${e.line ?? '?'}:${e.column ?? '?'} ${String(e.reason ?? e.message).slice(0, 110)}`); }
}
console.log(`check-mdx-compile: ${files.length} files, ${bad} failed.`);
process.exit(bad ? 1 : 0);
