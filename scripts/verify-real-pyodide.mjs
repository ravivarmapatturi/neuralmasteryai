import { chromium } from 'playwright';
import fs from 'node:fs';

const buildAnAgent = JSON.parse(fs.readFileSync('src/data/practice/buildAnAgent.generated.json', 'utf-8'));
const svd = JSON.parse(fs.readFileSync('src/data/practice/specifyVerifyDebug.generated.json', 'utf-8'));
const problemSets = JSON.parse(fs.readFileSync('src/data/practice/problemSets.generated.json', 'utf-8'));
const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf-8'));

const allProblems = new Map();
for (const p of [...buildAnAgent, ...svd, ...problemSets]) allProblems.set(p.id, p);

const codingProblems = [];
for (const t of practice.topics) {
  for (const q of t.questions) {
    if (q.problemId) {
      const prob = allProblems.get(q.problemId);
      if (prob) {
        codingProblems.push({
          qId: q.id,
          problemId: prob.id,
          title: prob.title,
          functionName: prob.functionName,
          solution: prob.solution,
          testCases: prob.testCases,
        });
      }
    }
  }
}

console.log(`Loaded ${codingProblems.length} coding problems with reference solutions.`);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/');

  console.log('Page loaded. Running all 20 reference solutions through real Pyodide worker...');

  const results = await page.evaluate(async (problems) => {
    const worker = new Worker(new URL('/src/workers/pyodideWorker.ts', window.location.href), { type: 'module' });

    let nextId = 0;
    const pending = new Map();

    worker.onmessage = (e) => {
      const msg = e.data;
      if (pending.has(msg.id)) {
        const { resolve } = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    };

    function runProblem(prob) {
      return new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, { resolve });
        worker.postMessage({
          id,
          type: 'run-cases',
          code: prob.solution,
          cases: prob.testCases.map((tc) => ({
            id: tc.id,
            functionName: prob.functionName,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            expectError: tc.expectError,
          })),
        });
      });
    }

    const problemResults = [];
    for (const prob of problems) {
      const start = performance.now();
      const res = await runProblem(prob);
      const durationMs = Math.round(performance.now() - start);
      problemResults.push({
        problemId: prob.problemId,
        functionName: prob.functionName,
        totalCases: prob.testCases.length,
        passedCases: (res.caseResults || []).filter((c) => c.passed).length,
        failedCases: (res.caseResults || []).filter((c) => !c.passed).length,
        error: res.error || null,
        durationMs,
        details: res.caseResults || [],
      });
    }

    worker.terminate();
    return problemResults;
  }, codingProblems);

  await browser.close();

  let totalCases = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let problemsPassed = 0;

  for (const r of results) {
    totalCases += r.totalCases;
    totalPassed += r.passedCases;
    totalFailed += r.failedCases;
    const allPass = r.passedCases === r.totalCases && !r.error;
    if (allPass) problemsPassed++;
    console.log(
      `${allPass ? '✓' : '✗'} ${r.problemId} (${r.functionName}): ${r.passedCases}/${r.totalCases} passed (${r.durationMs}ms)${
        r.error ? ` ERROR: ${r.error}` : ''
      }`
    );
    if (!allPass) {
      console.log('Failed cases:', r.details.filter(c => !c.passed));
    }
  }

  console.log('--- SUMMARY ---');
  console.log(`Problems: ${problemsPassed}/${results.length} passed completely`);
  console.log(`Cases: ${totalPassed}/${totalCases} passed`);
  console.log(`Failures: ${totalFailed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
