// Run sequentially under with-memory-floor.mjs. Uses the deployed judge's model IDs,
// q8 weights and WASM backend; no inference doubles are used for this measurement.
import fs from 'node:fs';
import { chromium } from 'playwright';
const base = process.env.RUBRIC_BASE_URL ?? 'http://localhost:5173';
const sample = JSON.parse(fs.readFileSync('docs/evidence/interview/rubric-sample.json', 'utf8'));
const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf8'));
const questions = practice.topics.flatMap(t => t.questions);
const browser = await chromium.launch({headless:true, args:['--disable-dev-shm-usage']});
try {
  const page = await browser.newPage();
  // A blank Vite page keeps the application and speech models out of the measurement.
  await page.route(`${base}/__rubric_bench`, route => route.fulfill({contentType:'text/html',body:'<html><body>Rubric measurement</body></html>'}));
  await page.goto(`${base}/__rubric_bench`);
  const results = await page.evaluate(async ({ examples, questions }) => {
    const { judgePracticeAnswer } = await import('/src/lib/answerJudge.ts');
    const { loadJudge, embed, nli } = await import('/src/lib/mockInterview/engine.ts');
    await loadJudge();
    const rows = [];
    for (const example of examples) {
      const question = questions.find(q => q.id === example.questionId);
      const start = performance.now();
      const result = await judgePracticeAnswer(example.answer, question, {embed,nli});
      rows.push({id:example.id, handHits:example.handHits, modelHits:result.points.map(p => p.verdict === 'covered'), verdicts:result.points.map(p => p.verdict), milliseconds:Math.round(performance.now()-start)});
    }
    return rows;
  }, {examples:sample.examples,questions});
  let tp=0,tn=0,fp=0,fn=0,exact=0;
  for(const row of results){
    if(JSON.stringify(row.handHits)===JSON.stringify(row.modelHits))exact++;
    row.handHits.forEach((hit,i)=>{if(hit && row.modelHits[i])tp++;else if(hit)fn++;else if(row.modelHits[i])fp++;else tn++;});
  }
  const report={measuredAt:new Date().toISOString(),backend:'Browser WASM, q8, all-MiniLM-L6-v2 and mobilebert-uncased-mnli',sampleSize:results.length,exactAnswers:exact,tp,tn,fp,fn,pointAgreement:(tp+tn)/(tp+tn+fp+fn),falsePositiveRate:fp/(fp+tn),recall:tp/(tp+fn),results};
  fs.writeFileSync('docs/evidence/interview/rubric-results.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,results:undefined},null,2));
} finally { await browser.close(); }
