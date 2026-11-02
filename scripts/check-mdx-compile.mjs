#!/usr/bin/env node
// Compiles every MDX file so a syntax error fails fast, without the 5 GB build.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : []; });
let bad = 0; const files = walk('src/content');
for (const f of files) {
  try { await compile(readFileSync(f, 'utf8'), { remarkPlugins: [remarkGfm, remarkMath] }); }
  catch (e) { bad++; console.log(`${f}:${e.line ?? '?'}:${e.column ?? '?'} ${String(e.reason ?? e.message).slice(0, 110)}`); }
}
// Compiling doesn't resolve imports, and one missing path fails the whole build.
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/^import\s+(.+?)\s+from\s+['"](\.[^'"]+)['"]/gm)) {
    const base = resolve(dirname(f), m[2]);
    const hit = ['', '.tsx', '.ts', '.jsx', '.js', '.mdx', '/index.tsx', '/index.ts'].map(e => base + e).find(c => existsSync(c) && statSync(c).isFile());
    if (!hit) { bad++; console.log(`${f}: missing import ${m[2]} (${m[1]})`); continue; }
    if (!/\.tsx?$/.test(hit)) continue;
    const src = readFileSync(hit, 'utf8').replace(/^export\s+default\b.*$/gm, '');
    const hasDefault = /^export\s+default\b|as default/m.test(readFileSync(hit, 'utf8'));
    const named = m[1].match(/\{([^}]*)\}/)?.[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean) ?? [];
    for (const n of named) if (!new RegExp(`export[^\\n]*\\b${n}\\b`).test(src) && !new RegExp(`\\b${n}\\b[^\\n]*\\}\\s*from|export\\s*\\{[^}]*\\b${n}\\b`).test(src)) { bad++; console.log(`${f}: ${hit.split('/src/')[1]} has no export ${n}`); }
    if (/^[A-Za-z_]/.test(m[1]) && !hasDefault) { bad++; console.log(`${f}: ${hit.split('/src/')[1]} has no default export`); }
  }
}
console.log(`check-mdx-compile: ${files.length} files, ${bad} failed.`);
process.exit(bad ? 1 : 0);
