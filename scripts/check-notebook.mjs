#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOTS = ['src/content/docs', 'src/content/blog'];
const ALLOW_PATH = 'scripts/check-notebook.allow.json';
const args = new Set(process.argv.slice(2));
const reportMode = args.has('--report');
const fullMode = args.has('--all');
const changedMode = args.has('--changed') || (!reportMode && !fullMode);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && full.endsWith('.mdx') ? [full] : [];
  });
}
function rel(file) { return path.relative(ROOT, file).split(path.sep).join('/'); }
function lineAt(source, offset) { return source.slice(0, offset).split('\n').length; }
function add(violations, file, source, offset, rule, message) {
  violations.push({ path: rel(file), line: lineAt(source, offset), rule, message });
}
function stripJsxProps(source) {
  return source.replace(/<([A-Z][\w.]*)\b[^>]*>/gs, (tag) => tag.replace(/\b\w+\s*=\s*(?:\{`[\s\S]*?`\}|\{[\s\S]*?\}|"[^"]*"|'[^']*')/g, (value) => ' '.repeat(value.length)));
}
function extractRunnableRanges(source) {
  const ranges = [];
  const re = /<RunnableCode\b[^>]*\bcode\s*=\s*\{`([\s\S]*?)`\}\s*\/?\s*>/g;
  for (const match of source.matchAll(re)) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
}
function inRanges(pos, ranges) { return ranges.some(([a, b]) => pos >= a && pos < b); }
function isProgramCode(code) {
  const lines = code.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return true;
  const dataLine = /^(?:[\w .-]+(?:\s*\([^)]*\))?\s*=\s*[^=].*|[-*]\s+[^:]+:\s+.+)$/;
  const proseLine = /^(?:[A-Z][^.!?]{20,}[.!?]?|(?:The|This|That|For|When|Because|In|A|An|We|It)\s+\w+.*)$/;
  const codeTokens = /[{}();]|\b(?:const|let|var|function|return|import|from|def|class|print|if|else|for|while|SELECT|echo|npm|pip|await|torchrun|deepspeed|flwr|kubectl|terraform|promtool|vllm|aws|feast|=>)\b|^\s{2,}\S/;
  const data = lines.filter((line) => dataLine.test(line)).length;
  const prose = lines.filter((line) => proseLine.test(line)).length;
  const hasExecutableSyntax = lines.some((line) => codeTokens.test(line));
  return !((data >= Math.max(1, Math.ceil(lines.length * 0.6)) && !hasExecutableSyntax) || (prose >= Math.ceil(lines.length * 0.65) && !hasExecutableSyntax));
}
// Text containers are not pictures; they must not count toward rule 5.
const TEXT_ONLY_COMPONENTS = new Set(['ELI5', 'GoDeeper', 'NotebookCallout', 'RunnableCode', 'Remember', 'Key', 'Mark', 'SketchBox', 'MDXLink', 'Link', 'Callout', 'Tabs', 'TabItem', 'Details']);
function countVisuals(source) {
  const code = source.replace(/```[\s\S]*?```/g, '');
  const imported = new Set([...code.matchAll(/^import\s+(?:(?:[\w$]+|\{[^}]*\})\s+from\s+)?['"][^'"]+['"];?\s*$/gm)].map((m) => {
    const named = m[0].match(/^import\s+\{([^}]*)\}/);
    if (named) return named[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]);
    const def = m[0].match(/^import\s+([\w$]+)/);
    return def ? [def[1]] : [];
  }).flat().filter((name) => !TEXT_ONLY_COMPONENTS.has(name)));
  const uses = [...imported].reduce((n, name) => n + [...code.matchAll(new RegExp(`<${name}\\b`, 'g'))].length, 0);
  const imgs = [...code.matchAll(/<img\b|<ThemedImage\b|<video\b|<Video\b/g)].length;
  return uses + imgs;
}
function wordCount(source) {
  return source.replace(/^---[\s\S]*?---\s*/m, '').replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\{[^{}]*\}/g, ' ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
function scan(file) {
  const original = fs.readFileSync(file, 'utf8');
  const source = stripJsxProps(original);
  const violations = [];
  const ranges = extractRunnableRanges(original);
  const lines = source.split('\n');
  let offset = 0; let fence = null; let fenceStart = 0; let fenceContent = [];
  for (const line of lines) {
    const start = offset;
    const open = line.match(/^\s*(```+|~~~+)\s*([^\s`]*)/);
    if (open && !fence) { fence = { marker: open[1][0], lang: open[2].toLowerCase() }; fenceStart = start; fenceContent = []; offset += line.length + 1; continue; }
    if (fence && new RegExp(`^\\s*${fence.marker}{3,}\\s*$`).test(line)) {
      const content = fenceContent.join('\n');
      if (!inRanges(fenceStart, ranges) && (!fence.lang || ['text', 'txt', 'plain'].includes(fence.lang) || (fence.lang !== 'output' && !isProgramCode(content)))) add(violations, file, source, fenceStart, 1, `Fence is not named runnable program code (${fence.lang || 'no language'}).`);
      fence = null; fenceContent = []; offset += line.length + 1; continue;
    }
    if (fence) { fenceContent.push(line); offset += line.length + 1; continue; }
    const markdownTableDivider = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    if (!inRanges(start, ranges) && !markdownTableDivider && /[─│├└┌┐┘┬┴┼]|-->|<--|\+---|\|---/.test(line)) add(violations, file, source, start, 2, 'ASCII box or arrow diagram art detected.');
    if (/^\s*\$\$.*\S.*\$\$\s*$/.test(line)) add(violations, file, source, start, 3, 'Display math must use opening and closing $$ on separate lines.');
    if (/^\s*\|.*\\frac\b.*\|\s*$/.test(line)) add(violations, file, source, start, 3, 'Do not use stacked fractions in Markdown table cells.');
    if (/^\s*(?:\*\*[^*].*[^*]\*\*|__[^_].*[^_]__)\s*$/.test(line)) {
      const next = lines.slice(lines.indexOf(line) + 1).find((item) => item.trim());
      if (next && !/^\s*(?:[-*+]\s|\d+\.\s|\|)/.test(next)) add(violations, file, source, start, 4, 'Bold-only line acts as a heading; use a Markdown heading.');
    }
    offset += line.length + 1;
  }
  for (const match of source.matchAll(/<\s*(table|pre)\b/gi)) add(violations, file, source, match.index, 9, `Raw <${match[1].toLowerCase()}> element; use notebook components.`);
  // Worksheet grids: one heading per cell plus the corner over the row labels.
  for (const m of original.matchAll(/head: \[([^\]]*)\]/g)) {
    const q = /'[^']*'|"[^"]*"/g; const nh = (m[1].match(q) || []).length;
    const c = original.slice(m.index + m[0].length).match(/cells: \[([^\]]*)\]/);
    if (c && (c[1].match(q) || []).length + 1 !== nh) add(violations, file, source, m.index, 9, 'Worksheet grid headings do not line up with its cells (need one per cell plus the corner).');
  }
  // Components used without an import crash the page at runtime (global ones: ThemedImage, Mark, Key).
  {
    const body = original.replace(/```[\s\S]*?```/g, '').replace(/code=\{`[\s\S]*?`\}/g, '').replace(/`[^`\n]*`/g, '');
    const used = new Set([...body.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]));
    const imported = new Set(['ThemedImage', 'Mark', 'Key']);
    for (const m of original.replace(/```[\s\S]*?```/g, '').replace(/code=\{`[\s\S]*?`\}/g, '').matchAll(/^import\s+([\s\S]*?)\s+from/gm)) for (const n of m[1].replace(/ as /g, ' ').match(/[A-Za-z_$][\w$]*/g) || []) imported.add(n);
    for (const m of original.matchAll(/export (?:const|function) ([A-Z]\w*)/g)) imported.add(m[1]);
    for (const name of used) if (!imported.has(name)) add(violations, file, source, 0, 9, `<${name}> is used but never imported; the page will fail to load.`);
  }
  const words = wordCount(original); const visuals = countVisuals(original);
  if (words > 1500 && visuals < 3) add(violations, file, source, 0, 5, `Page has ${words} words and ${visuals} visual(s); pages over 1,500 words need at least 3.`);
  const allow = loadAllowlist();
  const kept = violations.filter((v) => !allow.some((entry) => entry.path === v.path && entry.rule === v.rule));
  return { path: rel(file), words, visuals, violations: kept };
}
function loadAllowlist() {
  const file = path.join(ROOT, ALLOW_PATH);
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(entries) || entries.some((e) => !e || typeof e.path !== 'string' || !Number.isInteger(e.rule) || typeof e.reason !== 'string' || !e.reason.trim())) throw new Error(`${ALLOW_PATH} entries require path, integer rule, and non-empty reason`);
  return entries;
}
function changedFiles() {
  try { return execFileSync('git', ['diff', '--name-only', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean); }
  catch { return []; }
}
const allFiles = CONTENT_ROOTS.flatMap((dir) => walk(path.join(ROOT, dir)));
let files = allFiles;
if (changedMode) {
  const changed = new Set(changedFiles());
  files = allFiles.filter((file) => changed.has(rel(file)));
}
const results = files.sort().map(scan);
const violations = results.flatMap((result) => result.violations);
if (reportMode) {
  const byRule = {};
  for (const item of violations) byRule[item.rule] = (byRule[item.rule] ?? 0) + 1;
  const output = { generatedAt: new Date().toISOString(), mode: 'full-site-report', filesScanned: results.length, pagesWithViolations: results.filter((r) => r.violations.length).length, violationCount: violations.length, violationsByRule: byRule, pages: results.filter((r) => r.violations.length).map((r) => ({ path: r.path, words: r.words, visuals: r.visuals, violationCount: r.violations.length, violations: r.violations })) };
  const outputPath = path.join(ROOT, 'docs/evidence/site-audit/notebook-violations.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Notebook report: ${output.filesScanned} pages scanned; ${output.pagesWithViolations} pages with ${output.violationCount} violations.`);
  console.log(`Wrote ${rel(outputPath)}.`);
  process.exit(0);
}
console.log(`Notebook check (${fullMode ? 'full-site' : 'changed-files'}): ${results.length} pages, ${violations.length} violation(s).`);
for (const item of violations) console.error(`${item.path}:${item.line} rule ${item.rule}: ${item.message}`);
process.exit(violations.length ? 1 : 0);
