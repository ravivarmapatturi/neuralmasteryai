#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_TARGET_DIRS = [
  'src/components/content',
  'src/components/notebook',
];

const EXTRA_FILES = [
  'src/components/labs.css',
];

// Exempt contexts: code, controls, diagram labels, navigation
const EXEMPT_SELECTORS_RE = /\b(pre|code|editor|gutter|shiki|token|keyword|button|btn|input|select|control|slider|toggle|tabs?|svg|text|axis|legend|diagram|viz|graph|chart|sketch|nav|toc|sidebar|breadcrumbs?|pagination)\b/i;

const HEADING_OR_TABLE_TAG_RE = /\b(h[1-6]|th|td|table|thead|tbody)\b/i;

/**
 * Checks a TSX/JSX string for inline fontSize / fontWeight on heading/table elements.
 */
export function checkJsxTypography(source, filePath = 'anonymous.tsx') {
  const violations = [];
  const lines = source.split('\n');

  // Match JSX opening tags: e.g. <h1 style={{ fontSize: 24 }}> or <td style={{ ... }}>
  // We match opening tags with multiline style prop
  const tagRe = /<([A-Za-z0-9_.:-]+)\b([^>]*?)>/gs;

  for (const match of source.matchAll(tagRe)) {
    const tagName = match[1];
    const attrs = match[2];

    // If tag is not a heading/table element, skip
    if (!HEADING_OR_TABLE_TAG_RE.test(tagName)) continue;

    // If inside exempt tag like <text> or <pre>, skip
    if (EXEMPT_SELECTORS_RE.test(tagName)) continue;

    // Check if style attribute exists
    const styleMatch = attrs.match(/\bstyle\s*=\s*\{\{([\s\S]*?)\}\}/);
    if (!styleMatch) continue;

    const styleContent = styleMatch[1];
    const offset = match.index;
    const lineNumber = source.slice(0, offset).split('\n').length;

    // Check for fontSize or font-size
    const fontSizeMatch = styleContent.match(/\b(?:fontSize|font-size)\s*:\s*([^,}]+)/);
    if (fontSizeMatch) {
      const val = fontSizeMatch[1].trim();
      // Allow var(--nm-type-...)
      if (!val.includes('--nm-type-')) {
        violations.push({
          path: filePath,
          line: lineNumber,
          role: tagName.toLowerCase(),
          property: 'font-size',
          value: val,
          message: `Inline font-size "${val}" on <${tagName}> in content component; use shared tokens var(--nm-type-*)`,
        });
      }
    }

    // Check for fontWeight or font-weight
    const fontWeightMatch = styleContent.match(/\b(?:fontWeight|font-weight)\s*:\s*([^,}]+)/);
    if (fontWeightMatch) {
      const val = fontWeightMatch[1].trim();
      // Allow var(--nm-type-...)
      if (!val.includes('--nm-type-')) {
        violations.push({
          path: filePath,
          line: lineNumber,
          role: tagName.toLowerCase(),
          property: 'font-weight',
          value: val,
          message: `Inline font-weight "${val}" on <${tagName}> in content component; use shared tokens var(--nm-type-*)`,
        });
      }
    }
  }

  return violations;
}

/**
 * Checks a CSS string for font-size / font-weight overrides on heading/table selectors.
 */
export function checkCssTypography(source, filePath = 'anonymous.css') {
  const violations = [];

  // Strip CSS comments
  const cleanSource = source.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));

  // Match CSS rule blocks: selector { declarations }
  const ruleRe = /([^{}]+)\{([^{}]+)\}/g;

  for (const match of cleanSource.matchAll(ruleRe)) {
    const rawSelector = match[1].trim();
    const declsBlock = match[2];
    const offset = match.index;
    const lineNumber = source.slice(0, offset).split('\n').length;

    // Split compound selectors: e.g. "h1, h2, h3"
    const selectors = rawSelector.split(',').map((s) => s.trim());

    for (const sel of selectors) {
      // Check if selector targets heading or table roles
      if (!HEADING_OR_TABLE_TAG_RE.test(sel)) continue;

      // Check if selector is exempt (code, controls, diagram labels, navigation)
      if (EXEMPT_SELECTORS_RE.test(sel)) continue;

      // Check declarations
      const decls = declsBlock.split(';').map((d) => d.trim()).filter(Boolean);
      for (const decl of decls) {
        const [prop, ...valParts] = decl.split(':');
        if (!prop || !valParts.length) continue;
        const property = prop.trim().toLowerCase();
        const val = valParts.join(':').trim();

        if (property === 'font-size' || property === 'font-weight') {
          // If value uses var(--nm-type-...) or inherit, allow it
          if (val.includes('--nm-type-') || val.includes('inherit')) continue;

          violations.push({
            path: filePath,
            line: lineNumber,
            role: sel,
            property,
            value: val,
            message: `CSS ${property} "${val}" on "${sel}" in content component; use shared tokens var(--nm-type-*)`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Validates source based on file extension.
 */
export function checkTypographySource(source, filePath) {
  if (filePath.endsWith('.css')) {
    return checkCssTypography(source, filePath);
  }
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    return checkJsxTypography(source, filePath);
  }
  return [];
}

function walkFiles(dir, exts = ['.tsx', '.jsx', '.css']) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkFiles(full, exts)
      : entry.isFile() && exts.some((ext) => full.endsWith(ext))
      ? [full]
      : [];
  });
}

export function scanTypographyFiles(targetDirs = DEFAULT_TARGET_DIRS, extraFiles = EXTRA_FILES) {
  const files = [
    ...targetDirs.flatMap((d) => walkFiles(path.join(ROOT, d))),
    ...extraFiles.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
  ];

  const allViolations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file).split(path.sep).join('/');
    const violations = checkTypographySource(content, relPath);
    allViolations.push(...violations);
  }
  return { filesScanned: files.length, violations: allViolations };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { filesScanned, violations } = scanTypographyFiles();
  if (violations.length > 0) {
    console.error(`\n❌ Static Typography Guard: ${violations.length} override violation(s) found across ${filesScanned} files:`);
    for (const v of violations) {
      console.error(`  ${v.path}:${v.line} - ${v.message}`);
    }
    process.exit(1);
  } else {
    console.log(`✓ Static Typography Guard: ${filesScanned} content files clean (0 heading/table overrides).`);
    process.exit(0);
  }
}
