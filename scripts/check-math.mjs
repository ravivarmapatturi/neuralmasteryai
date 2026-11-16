#!/usr/bin/env node
/**
 * scripts/check-math.mjs
 *
 * Guard against single-line display math in MDX files.
 * Single-line `$$…$$` is parsed by remark-math as inline math,
 * failing to render as `.katex-display` and causing vertical clipping
 * and squashed fraction layout.
 *
 * Exits 0 if all standalone display math uses the three-line block format:
 *   $$
 *   <math>
 *   $$
 *
 * Exits 1 with file:line diagnostics if any standalone single-line `$$…$$` remains.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function walkMdx(dir) {
  return readdirSync(dir).flatMap(file => {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return walkMdx(fullPath);
    }
    return fullPath.endsWith('.mdx') ? [fullPath] : [];
  });
}

export function findSingleLineMath(content, filePath = '<unknown>') {
  const lines = content.split('\n');
  const violations = [];
  let inFencedCode = false;
  let fenceMarker = '';
  let inRunnable = false;
  let inJsxTag = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // 1. Fenced code block tracking
    if (!inFencedCode && (trimmed.startsWith('```') || trimmed.startsWith('~~~'))) {
      inFencedCode = true;
      fenceMarker = trimmed.slice(0, 3);
      continue;
    }
    if (inFencedCode) {
      if (trimmed.startsWith(fenceMarker)) {
        inFencedCode = false;
        fenceMarker = '';
      }
      continue;
    }

    // 2. RunnableCode tracking
    if (line.includes('<RunnableCode')) {
      inRunnable = true;
    }
    if (inRunnable) {
      if (line.includes('/>') || line.includes('</RunnableCode>')) {
        inRunnable = false;
      }
      continue;
    }

    // 3. Multiline JSX tag tracking
    if (!inJsxTag && /<[A-Z][A-Za-z0-9_]*\b[^>]*$/.test(line) && !line.includes('/>')) {
      inJsxTag = true;
      continue;
    }
    if (inJsxTag) {
      if (line.includes('>') || line.includes('/>')) {
        inJsxTag = false;
      }
      continue;
    }

    // 4. Standalone single-line display math check
    const match = line.match(/^(\s*)\$\$(.+)\$\$$/);
    if (match) {
      const body = match[2];
      // Ignore if body contains internal $$ (inline math within sentence)
      if (!body.includes('$$') && body.trim().length > 0) {
        violations.push({
          file: filePath,
          line: lineNum,
          column: match[1].length + 1,
          raw: line,
          body: body.trim(),
        });
      }
    }
  }

  return violations;
}

function runCli() {
  const args = process.argv.slice(2);
  const targetPaths = args.filter(a => !a.startsWith('--'));

  const files = targetPaths.length > 0
    ? targetPaths.flatMap(p => statSync(p).isDirectory() ? walkMdx(p) : [p])
    : walkMdx('src/content/docs');

  let totalViolations = 0;
  const violationReports = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const violations = findSingleLineMath(content, file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      for (const v of violations) {
        violationReports.push(`${v.file}:${v.line}:${v.column} Standalone single-line display math: ${v.raw.trim().slice(0, 80)}`);
      }
    }
  }

  if (totalViolations > 0) {
    console.error(`\n[check:math] FAILED: Found ${totalViolations} single-line display math occurrence(s) across ${files.length} file(s):`);
    for (const report of violationReports) {
      console.error(`  ${report}`);
    }
    console.error(`\nTo fix automatically, run:\n  node scripts/fix-display-math.mjs\n`);
    process.exit(1);
  }

  console.log(`[check:math] PASSED: All display math across ${files.length} MDX file(s) correctly formatted as multi-line blocks.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
