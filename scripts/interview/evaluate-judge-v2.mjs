import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [candidate='baseline', split='dev']=process.argv.slice(2);
if(!['baseline','marco','stsb'].includes(candidate)||!['dev','heldout'].includes(split))throw Error('Use baseline|marco|stsb dev|heldout');
const dir='docs/evidence/interview';
const sampleFile=`${dir}/${split==='dev'?'rubric-sample.json':'judge-v2-heldout.json'}`;
const source=fs.readFileSync(sampleFile);
const sample=JSON.parse(source);
const groundTruth=JSON.parse(fs.readFileSync(`${dir}/judge-v2-ground-truth.json`));
const manifest=JSON.parse(fs.readFileSync(`${dir}/judge-v2-model-manifest.json`));
const settingsFile=`${dir}/judge-v2-thresholds.json`;
if(split==='heldout'&&!fs.existsSync(settingsFile))throw Error('Freeze development thresholds before held-out inference');
const manifestSha256=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const output=`${dir}/judge-v2-${candidate}-${split}.json`;
const previous=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):null;
const hash=createHash('sha256').update(source).digest('hex');
const workerSha256=createHash('sha256').update(fs.readFileSync((process.env.JUDGE_MODEL_CACHE??'/tmp/neuralmastery-judge-v2-models')+'/scripts/interview/judge-v2-worker.ts')).digest('hex');
if(previous&&previous.manifestSha256!==manifestSha256)throw Error('Model manifest changed since partial measurement');
if(previous&&previous.workerSha256!==workerSha256)throw Error('Compiled worker changed since partial measurement');
if(previous&&previous.sampleSha256!==hash)throw Error('Sample changed since partial measurement');
const report=previous??{candidate,split,sampleSha256:hash,workerSha256,manifestSha256,startedAt:new Date().toISOString(),backend:'Browser WASM, one thread',status:'incomplete',rows:[],attempts:[],peakBrowserRssBytes:0,peakBrowserPssBytes:0,peakHarnessRssBytes:0};
if(report.status==='complete'){console.log('Already complete:',output);process.exit(0);}
const attempt={startedAt:new Date().toISOString(),peakBrowserRssBytes:0,peakBrowserPssBytes:0,peakHarnessRssBytes:0,minAvailableMiB:Infinity,assets:{}};
report.attempts.push(attempt);
const save=()=>{
 try {
  const group=fs.readFileSync('/proc/self/cgroup','utf8').trim().split('::')[1];
  const base='/sys/fs/cgroup'+group;
  report.cgroup={path:group,memoryMax:fs.readFileSync(base+'/memory.max','utf8').trim(),swapMax:fs.readFileSync(base+'/memory.swap.max','utf8').trim(),peakBytes:Number(fs.readFileSync(base+'/memory.peak','utf8').trim())};
 } catch {}
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
};
function memory(root) {
 const rows=[];
 for(const pid of fs.readdirSync('/proc').filter(name=>/^\d+$/.test(name)))try {
  const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8').split(') ')[1].split(' ');
  rows.push({pid:Number(pid),ppid:Number(stat[1]),rss:Number(stat[21])*4096});
 }catch{}
 const ids=new Set([root]);let changed=true;
 while(changed){changed=false;for(const row of rows)if(ids.has(row.ppid)&&!ids.has(row.pid)){ids.add(row.pid);changed=true;}}
 let rss=0,pss=0;for(const row of rows)if(ids.has(row.pid)){
  rss+=row.rss;
  try{pss+=Number(fs.readFileSync(`/proc/${row.pid}/smaps_rollup`,'utf8').match(/^Pss:\s+(\d+)/m)[1])*1024;}catch{}
 }
 return {rss,pss,harness:rows.find(row=>row.pid===process.pid)?.rss??0};
}
let server,browser,timer;
try {
 server=await chromium.launchServer({headless:true,args:['--disable-dev-shm-usage']});
 browser=await chromium.connect(server.wsEndpoint());
 timer=setInterval(()=>{
  const m=memory(server.process().pid);
  attempt.peakBrowserRssBytes=Math.max(attempt.peakBrowserRssBytes,m.rss);
  attempt.peakBrowserPssBytes=Math.max(attempt.peakBrowserPssBytes,m.pss);
  attempt.peakHarnessRssBytes=Math.max(attempt.peakHarnessRssBytes,m.harness);
  attempt.minAvailableMiB=Math.min(attempt.minAvailableMiB,Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+)/m)[1])/1024);
  report.peakBrowserRssBytes=Math.max(report.peakBrowserRssBytes,attempt.peakBrowserRssBytes);
  report.peakBrowserPssBytes=Math.max(report.peakBrowserPssBytes,attempt.peakBrowserPssBytes);
  report.peakHarnessRssBytes=Math.max(report.peakHarnessRssBytes,attempt.peakHarnessRssBytes);
 },100);
 const page=await browser.newPage();
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('response',async response=>{
  if(!response.url().startsWith('http://127.0.0.1:5188/'))return;
  const headers=await response.allHeaders();
  if(response.ok())attempt.assets[new URL(response.url()).pathname]={bytes:Number(headers['content-length']??0),status:response.status()};
 });
 const base=process.env.RUBRIC_BASE_URL??'http://127.0.0.1:5173';
 await page.route(`${base}/__judge_v2`,route=>route.fulfill({contentType:'text/html',body:'<html><body>Judge v2 WASM measurement</body></html>'}));
 await page.goto(`${base}/__judge_v2`);
 await page.evaluate(()=>{
  const worker=new Worker('/scripts/interview/judge-v2-worker.ts',{type:'module'});
  let seq=0;const pending=new Map();
  worker.onmessage=event=>{const {id,ok,result,error}=event.data;const call=pending.get(id);if(!call)return;pending.delete(id);ok?call.resolve(result):call.reject(Error(error));};
  worker.onerror=event=>{for(const call of pending.values())call.reject(Error(event.message));pending.clear();};
  window.judgeV2Call=(op,payload)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});worker.postMessage({id,op,payload});});
 });
 const loadStart=Date.now();
 attempt.load=await page.evaluate(({candidate,manifest})=>window.judgeV2Call('load',{candidate,manifest}),{candidate,manifest});
 attempt.loadMilliseconds=Date.now()-loadStart;save();
 console.log(`${candidate}/${split} loaded in ${attempt.loadMilliseconds}ms`);
 for(const example of sample.examples) {
  if(report.rows.some(row=>row.id===example.id))continue;
  const question=groundTruth[example.questionId];
  const measured=await page.evaluate(payload=>window.judgeV2Call('score',payload),{answer:example.answer,question});
  if((measured.raw?.points??measured.judgement?.points)?.length!==example.handHits.length)throw Error('Ground-truth point count mismatch: '+example.id);
  report.rows.push({source:question.keyPoints?.length?'rubric':'reference',id:example.id,questionId:example.questionId,strength:example.strength,handHits:example.handHits,...measured});
  save();console.log(`${candidate}/${split} ${report.rows.length}/${sample.examples.length} ${example.id}: ${Math.round(measured.milliseconds)}ms`);
 }
 report.pageErrors=pageErrors;report.status='complete';report.completedAt=new Date().toISOString();
 if(split==='heldout')report.frozenSettingsSha256=createHash('sha256').update(fs.readFileSync(settingsFile)).digest('hex');
} catch(error) {attempt.error=String(error);save();throw error;}
finally {
 clearInterval(timer);
 attempt.finishedAt=new Date().toISOString();save();
 await browser?.close();await server?.close();
}
console.log(JSON.stringify({candidate,split,status:report.status,answers:report.rows.length,peakBrowserRssBytes:report.peakBrowserRssBytes,peakBrowserPssBytes:report.peakBrowserPssBytes,output},null,2));
