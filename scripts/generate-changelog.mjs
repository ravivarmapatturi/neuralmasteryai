// Builds src/data/changelog.generated.json from git history: user-facing
// commits (feat, fix, perf) grouped by day, plus per-day commit counts for
// the release heatmap. CI checks out a shallow clone, so when history is
// shallow we keep the committed file instead of overwriting it with one day.
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'src', 'data', 'changelog.generated.json');
const git = (args) => execSync(`git -c safe.directory='*' ${args}`, { cwd: root, maxBuffer: 1024 * 1024 * 64 }).toString();

if (git('rev-parse --is-shallow-repository').trim() === 'true' && existsSync(output)) {
  console.log('Changelog: shallow clone, keeping the committed file.');
  process.exit(0);
}

const SHOWN = { feat: 'New', fix: 'Fixed', perf: 'Faster' };
const SCOPES = { labs: 'Labs', learn: 'Learn', interview: 'Interview', home: 'Home', atlas: 'Atlas', blog: 'Blog', viz: 'Diagrams', nav: 'Navigation', search: 'Search', 'study-plans': 'Study plans', leaderboard: 'Leaderboard', changelog: 'Changelog' };
const days = {};
const entries = [];
for (const line of git('log --no-merges --format=%h%x09%as%x09%s').split('\n')) {
  if (!line) continue;
  const [sha, date, subject] = line.split('\t');
  days[date] = (days[date] ?? 0) + 1;
  const match = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/.exec(subject);
  if (!match || !SHOWN[match[1]] || entries.length >= 400) continue;
  const text = match[3].charAt(0).toUpperCase() + match[3].slice(1);
  entries.push({ sha, date, kind: SHOWN[match[1]], area: SCOPES[match[2]] ?? null, text });
}
writeFileSync(output, JSON.stringify({ entries, days }) + '\n');
console.log(`Changelog: ${entries.length} entries over ${Object.keys(days).length} days.`);
