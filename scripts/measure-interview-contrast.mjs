// Script to calculate WCAG 2.1 contrast ratios for interview palette pairs
import fs from 'node:fs';
import path from 'node:path';

function parseHex(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function sRGBtoLin(colorChannel) {
  const c = colorChannel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  return 0.2126 * sRGBtoLin(rgb[0]) + 0.7152 * sRGBtoLin(rgb[1]) + 0.0722 * sRGBtoLin(rgb[2]);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(parseHex(hex1));
  const l2 = relativeLuminance(parseHex(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const lightTheme = {
  name: 'Light Theme (Clean Neutral)',
  bg: '#f8f9fa',
  surface: '#ffffff',
  surfaceAlt: '#f1f3f6',
  line: '#e2e4e9',
  fg: '#111827',
  soft: '#4b5563',
  accent: '#1d4fc4',
  accentHover: '#153ea3',
  onAccent: '#ffffff',
  good: '#15803d',
  warn: '#9a3412',
  bad: '#b91c1c',
};

const darkTheme = {
  name: 'Dark Theme (Neutral Near-Black)',
  bg: '#0f1115',
  surface: '#181a20',
  surfaceAlt: '#20232b',
  line: '#2b2f3a',
  fg: '#f3f4f6',
  soft: '#9ca3af',
  accent: '#2563eb',
  accentText: '#5b96f7',
  onAccent: '#ffffff',
  good: '#34d399',
  warn: '#fbbf24',
  bad: '#f87171',
};

const pairs = [
  // Light Theme
  { theme: 'Light', role: 'Headings / Primary body', fg: lightTheme.fg, bg: lightTheme.surface, minRequired: 4.5 },
  { theme: 'Light', role: 'Primary text on background', fg: lightTheme.fg, bg: lightTheme.bg, minRequired: 4.5 },
  { theme: 'Light', role: 'Primary text on alt surface', fg: lightTheme.fg, bg: lightTheme.surfaceAlt, minRequired: 4.5 },
  { theme: 'Light', role: 'Secondary text on card surface', fg: lightTheme.soft, bg: lightTheme.surface, minRequired: 4.5 },
  { theme: 'Light', role: 'Secondary text on page background', fg: lightTheme.soft, bg: lightTheme.bg, minRequired: 4.5 },
  { theme: 'Light', role: 'Secondary text on alt surface', fg: lightTheme.soft, bg: lightTheme.surfaceAlt, minRequired: 4.5 },
  { theme: 'Light', role: 'Primary action button text', fg: lightTheme.onAccent, bg: lightTheme.accent, minRequired: 4.5 },
  { theme: 'Light', role: 'Accent link / text on surface', fg: lightTheme.accent, bg: lightTheme.surface, minRequired: 4.5 },
  { theme: 'Light', role: 'Accent link / text on background', fg: lightTheme.accent, bg: lightTheme.bg, minRequired: 4.5 },
  { theme: 'Light', role: 'Success / covered text on surface', fg: lightTheme.good, bg: lightTheme.surface, minRequired: 4.5 },
  { theme: 'Light', role: 'Warning / not detected text on surface', fg: lightTheme.warn, bg: lightTheme.surface, minRequired: 4.5 },
  { theme: 'Light', role: 'Danger / error text on surface', fg: lightTheme.bad, bg: lightTheme.surface, minRequired: 4.5 },

  // Dark Theme
  { theme: 'Dark', role: 'Headings / Primary body', fg: darkTheme.fg, bg: darkTheme.surface, minRequired: 4.5 },
  { theme: 'Dark', role: 'Primary text on background', fg: darkTheme.fg, bg: darkTheme.bg, minRequired: 4.5 },
  { theme: 'Dark', role: 'Primary text on alt surface', fg: darkTheme.fg, bg: darkTheme.surfaceAlt, minRequired: 4.5 },
  { theme: 'Dark', role: 'Secondary text on card surface', fg: darkTheme.soft, bg: darkTheme.surface, minRequired: 4.5 },
  { theme: 'Dark', role: 'Secondary text on page background', fg: darkTheme.soft, bg: darkTheme.bg, minRequired: 4.5 },
  { theme: 'Dark', role: 'Secondary text on alt surface', fg: darkTheme.soft, bg: darkTheme.surfaceAlt, minRequired: 4.5 },
  { theme: 'Dark', role: 'Primary action button text', fg: darkTheme.onAccent, bg: darkTheme.accent, minRequired: 4.5 },
  { theme: 'Dark', role: 'Accent text / link on surface', fg: darkTheme.accentText, bg: darkTheme.surface, minRequired: 4.5 },
  { theme: 'Dark', role: 'Accent text / link on background', fg: darkTheme.accentText, bg: darkTheme.bg, minRequired: 4.5 },
  { theme: 'Dark', role: 'Success / covered text on surface', fg: darkTheme.good, bg: darkTheme.surface, minRequired: 4.5 },
  { theme: 'Dark', role: 'Warning / not detected text on surface', fg: darkTheme.warn, bg: darkTheme.surface, minRequired: 4.5 },
  { theme: 'Dark', role: 'Danger / error text on surface', fg: darkTheme.bad, bg: darkTheme.surface, minRequired: 4.5 },
];

let markdown = `# Interview Color Palette WCAG 2.1 Contrast Audit\n\n`;
markdown += `Audited on 10 November 2026 for the revised interview pages palette (Stage 0 / G1).\n\n`;
markdown += `Standard: **WCAG 2.1 AA** (minimum 4.5:1 for body and secondary text, 3:1 for large text/headings).\n\n`;
markdown += `## Measured Contrast Ratios\n\n`;
markdown += `| Theme | Element / Usage | Text Color | Background | Measured Ratio | WCAG AA Body (>=4.5:1) | Status |\n`;
markdown += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

let allPass = true;

for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg);
  const ratioStr = ratio.toFixed(2) + ':1';
  const pass = ratio >= p.minRequired;
  if (!pass) allPass = false;
  markdown += `| ${p.theme} | ${p.role} | \`${p.fg}\` | \`${p.bg}\` | **${ratioStr}** | ${p.minRequired}:1 | ${pass ? 'PASS' : 'FAIL'} |\n`;
}

markdown += `\n## Palette Definitions\n\n`;
markdown += `### Clean Light Theme\n`;
markdown += `- Page Background (\`--bg\`): \`${lightTheme.bg}\`\n`;
markdown += `- Surface Card (\`--surface\`): \`${lightTheme.surface}\`\n`;
markdown += `- Alt Surface (\`--surface-alt\`): \`${lightTheme.surfaceAlt}\`\n`;
markdown += `- Border Line (\`--line\`): \`${lightTheme.line}\`\n`;
markdown += `- Primary Text (\`--fg\`): \`${lightTheme.fg}\`\n`;
markdown += `- Secondary Text (\`--soft\`): \`${lightTheme.soft}\`\n`;
markdown += `- Action Accent (\`--accent\`): \`${lightTheme.accent}\`\n`;
markdown += `- Success (\`--good\`): \`${lightTheme.good}\`\n`;
markdown += `- Warning (\`--warn\`): \`${lightTheme.warn}\`\n`;
markdown += `- Danger (\`--bad\`): \`${lightTheme.bad}\`\n\n`;

markdown += `### Neutral Near-Black Dark Theme\n`;
markdown += `- Page Background (\`--bg\`): \`${darkTheme.bg}\` (neutral near-black, zero blue cast)\n`;
markdown += `- Surface Card (\`--surface\`): \`${darkTheme.surface}\`\n`;
markdown += `- Alt Surface (\`--surface-alt\`): \`${darkTheme.surfaceAlt}\`\n`;
markdown += `- Border Line (\`--line\`): \`${darkTheme.line}\`\n`;
markdown += `- Primary Text (\`--fg\`): \`${darkTheme.fg}\`\n`;
markdown += `- Secondary Text (\`--soft\`): \`${darkTheme.soft}\`\n`;
markdown += `- Action Accent (\`--accent\`): \`${darkTheme.accent}\` (text/link: \`${darkTheme.accentText}\`)\n`;
markdown += `- Success (\`--good\`): \`${darkTheme.good}\`\n`;
markdown += `- Warning (\`--warn\`): \`${darkTheme.warn}\`\n`;
markdown += `- Danger (\`--bad\`): \`${darkTheme.bad}\`\n\n`;

markdown += `## Verification Result\n\n`;
markdown += `All ${pairs.length} measured text and background pairs meet or exceed the mandatory 4.5:1 ratio: **${allPass ? 'ALL PASSED' : 'SOME FAILED'}**.\n`;

const outPath = path.resolve('docs/evidence/interview/audit-2026-11/contrast.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, markdown, 'utf8');

console.log(`Generated ${outPath}`);
if (!allPass) {
  console.error('Some contrast checks failed!');
  process.exit(1);
} else {
  console.log(`All ${pairs.length} contrast checks PASSED (>= 4.5:1)!`);
}
