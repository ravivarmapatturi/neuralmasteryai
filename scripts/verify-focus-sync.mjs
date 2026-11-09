// Temporary tooling never changes the repository's package manifest or lockfile.
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const temp = mkdtempSync(join(tmpdir(), 'nm-focus-sync-'));
const root = process.cwd();
function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${cmd} exited ${result.status}`);
}
try {
  run('java', ['-version']);
  run('npm', ['install', '--prefix', temp, '--no-audit', '--no-fund', 'firebase-tools@15.35.0', '@firebase/rules-unit-testing@5.0.2']);
  writeFileSync(join(temp, 'firebase.json'), JSON.stringify({ firestore: { rules: resolve('firestore.rules') }, emulators: { firestore: { host: '127.0.0.1', port: 8087 }, ui: { enabled: false }, singleProjectMode: true } }));
  writeFileSync(join(temp, 'vitest.config.mjs'), `export default ${JSON.stringify({ root, resolve: { alias: { '../lib/firebase': join(root, 'scripts/focus-firebase.emulator.ts') } }, test: { environment: 'jsdom', include: ['scripts/verify-focus-sync.emulator.tsx'], testTimeout: 180000, hookTimeout: 120000, maxWorkers: 1, disableConsoleIntercept: true, reporters: ['verbose'] } })}`);
  const runner = join(temp, 'run-test.cjs');
  writeFileSync(runner, `const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ${JSON.stringify([join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(temp, 'vitest.config.mjs')])}, { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: ${JSON.stringify('--require=' + join(root, 'scripts/focus-emulator-network-guard.cjs'))} } });
process.exit(result.status ?? 1);`);
  run(join(temp, 'node_modules/.bin/firebase'), ['emulators:exec', '--config', join(temp, 'firebase.json'), '--only', 'firestore', '--project', 'demo-neuralmastery', `${JSON.stringify(process.execPath)} ${JSON.stringify(runner)}`], { FOCUS_RULES_TOOLS: temp, JAVA_TOOL_OPTIONS: '-Xmx512m', CHOKIDAR_USEPOLLING: 'true' });
} finally { rmSync(temp, { recursive: true, force: true }); }
