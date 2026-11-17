#!/usr/bin/env node
/**
 * scripts/fix-display-math.mjs
 *
 * Deterministic sitewide transformation for display math.
 * Rewrites standalone single-line `$$…$$` into three lines:
 *   $$
 *   <body without outer whitespace>
 *   $$
 * retaining the original line's indentation.
 *
 * Preserves:
 *   - Fenced code blocks (``` or ~~~)
 *   - Indented code blocks / JSX tags
 *   - RunnableCode components
 *   - Inline math within sentences
 *   - Markdown list indentation
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

export function transformMdx(content) {
  const lines = content.split('\n');
  const result = [];
  let inFencedCode = false;
  let fenceMarker = '';
  let inRunnable = false;
  let inJsxTag = false;
  let transformedCount = 0;

  let inList = false;
  let listBaseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced code block tracking (``` or ~~~)
    if (!inFencedCode && (trimmed.startsWith('```') || trimmed.startsWith('~~~'))) {
      inFencedCode = true;
      fenceMarker = trimmed.slice(0, 3);
      result.push(line);
      continue;
    }
    if (inFencedCode) {
      if (trimmed.startsWith(fenceMarker)) {
        inFencedCode = false;
        fenceMarker = '';
      }
      result.push(line);
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
      result.push(line);
      continue;
    }

    // 3. Multiline JSX tag tracking (e.g. <Component ... >)
    if (!inJsxTag && /<[A-Z][A-Za-z0-9_]*\b[^>]*$/.test(line) && !line.includes('/>')) {
      inJsxTag = true;
      result.push(line);
      continue;
    }
    if (inJsxTag) {
      if (line.includes('>') || line.includes('/>')) {
        inJsxTag = false;
      }
      result.push(line);
      continue;
    }

    // 4. Markdown list item tracking
    const listMarkerMatch = line.match(/^(\s*(?:[*+-]|\d+[.)])\s+)/);
    if (listMarkerMatch) {
      inList = true;
      listBaseIndent = listMarkerMatch[1].replace(/\t/g, '    ').length;
    } else if (trimmed !== '' && !line.startsWith(' ') && !line.startsWith('\t')) {
      inList = false;
      listBaseIndent = 0;
    }

    // 5. Standalone single-line display math check
    // Matches when trimmed content is exactly $$...$$ with non-empty body
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      const inner = trimmed.slice(2, -2);

      // If body contains internal $$ (e.g. "$$a$$ and $$b$$"), it's inline math in a sentence
      if (!inner.includes('$$') && inner.trim().length > 0) {
        const indent = line.slice(0, line.indexOf('$$'));
        const indentWidth = indent.replace(/\t/g, '    ').length;

        // Indented code blocks:
        // Outside a list, 4 or more leading spaces (or tab) defines an indented code block.
        // Inside a list, indented code requires 4 spaces beyond the list marker's content column.
        const isIndentedCode = !inList ? indentWidth >= 4 : indentWidth >= listBaseIndent + 4;

        if (!isIndentedCode) {
          result.push(`${indent}$$`);
          result.push(`${indent}${inner.trim()}`);
          result.push(`${indent}$$`);
          transformedCount++;
          continue;
        }
      }
    }

    result.push(line);
  }

  return { content: result.join('\n'), count: transformedCount };
}

export function processFile(filePath, dryRun = false) {
  const original = readFileSync(filePath, 'utf8');
  const { content: transformed, count } = transformMdx(original);
  if (count > 0 && !dryRun) {
    writeFileSync(filePath, transformed, 'utf8');
  }
  return { filePath, count, changed: count > 0 };
}

function runCli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetPaths = args.filter(a => !a.startsWith('--'));

  const files = targetPaths.length > 0
    ? targetPaths.flatMap(p => statSync(p).isDirectory() ? walkMdx(p) : [p])
    : walkMdx('src/content/docs');

  let totalFilesChanged = 0;
  let totalFormulas = 0;

  for (const file of files) {
    const { count, changed } = processFile(file, dryRun);
    if (changed) {
      totalFilesChanged++;
      totalFormulas += count;
      console.log(`[fix-display-math] ${file}: ${count} formula(s) rewritten`);
    }
  }

  console.log(`\nfix-display-math summary:`);
  console.log(`  Scanned: ${files.length} file(s)`);
  console.log(`  Modified: ${totalFilesChanged} file(s)`);
  console.log(`  Formulas rewritten: ${totalFormulas}`);
  if (dryRun) {
    console.log(`  (Dry run: no files modified on disk)`);
  }
}

// Run CLI when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
