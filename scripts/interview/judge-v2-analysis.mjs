import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const dir=process.env.JUDGE_V2_DIR??'docs/evidence/interview';
const compiled=await build({entryPoints:['src/lib/answerJudgeV2.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {decideV2}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const read=file=>JSON.parse(fs.readFileSync(`${dir}/${file}`));
const hash=file=>createHash('sha256').update(fs.readFileSync(`${dir}/${file}`)).digest('hex');
function predictions(report,thresholds) {
 return report.rows.map(row=>({...row,modelHits:(row.judgement??decideV2(row.raw,thresholds)).points.map(point=>point.verdict==='covered'),
  ...(row.raw?{decision:decideV2(row.raw,thresholds)}:{})}));
}
function metrics(rows) {
 let tp=0,tn=0,fp=0,fn=0,exactAnswers=0;
 for(const row of rows){
  if(row.handHits.length!==row.modelHits.length)throw Error('Point count mismatch');
  if(row.handHits.every((hit,i)=>hit===row.modelHits[i]))exactAnswers++;
  row.handHits.forEach((hit,i)=>{if(hit&&row.modelHits[i])tp++;else if(hit)fn++;else if(row.modelHits[i])fp++;else tn++;});
 }
 return {answers:rows.length,points:tp+tn+fp+fn,tp,tn,fp,fn,exactAnswers,recall:tp+fn?tp/(tp+fn):null,
  precision:tp+fp?tp/(tp+fp):null,falsePositiveRate:fp+tn?fp/(fp+tn):null,agreement:tp+tn+fp+fn?(tp+tn)/(tp+tn+fp+fn):null};
}
const q=(values,quantile)=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;const at=(sorted.length-1)*quantile;const lo=Math.floor(at),hi=Math.ceil(at);return sorted[lo]+(at-lo)*(sorted[hi]-sorted[lo]);};
function summarize(rows) {
 const result={overall:metrics(rows),byStrength:{},bySource:{},coverageDistributions:{}};
 for(const strength of ['strong','partial','weak']){
  const group=rows.filter(row=>row.strength===strength);
  result.byStrength[strength]=metrics(group);
  const values=group.map(row=>row.modelHits.filter(Boolean).length/row.modelHits.length);
  result.coverageDistributions[strength]={values,minimum:q(values,0),q25:q(values,.25),median:q(values,.5),q75:q(values,.75),maximum:q(values,1),mean:values.reduce((a,b)=>a+b,0)/values.length};
 }
 for(const source of ['rubric','reference'])result.bySource[source]=metrics(rows.filter(row=>row.source===source));
 return result;
}
function bootstrap(baseline,candidate) {
 let state=0x20261109;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 const gains=[];
 for(let run=0;run<10000;run++){
  let before=0,after=0,positives=0;
  for(let sample=0;sample<baseline.length;sample++){
   const index=Math.floor(next()*baseline.length);const b=baseline[index],c=candidate.find(row=>row.id===b.id);
   b.handHits.forEach((hit,i)=>{if(hit){positives++;before+=Number(b.modelHits[i]);after+=Number(c.modelHits[i]);}});
  }
  if(positives)gains.push((after-before)/positives);
 }
 return {unit:'answer-cluster paired bootstrap',resamples:10000,seed:'0x20261109',lower95:q(gains,.025),upper95:q(gains,.975)};
}
const mode=process.argv[2];
if(mode==='tune'){
 if(['baseline','marco','stsb'].some(name=>fs.existsSync(`${dir}/judge-v2-${name}-heldout.json`)))throw Error('Held-out inference has started; this experiment cannot be retuned');
 const baseline=read('judge-v2-baseline-dev.json');if(baseline.status!=='complete')throw Error('Baseline development incomplete');
 const baselineSummary=summarize(predictions(baseline));
 if(JSON.stringify([baselineSummary.overall.tp,baselineSummary.overall.tn,baselineSummary.overall.fp,baselineSummary.overall.fn])!==JSON.stringify([27,64,2,36]))throw Error('Baseline no longer reproduces original counts; investigate before tuning');
 const grid={similarity:[.25,.35,.45],cross:[.25,.5,.7,.85,.95],entails:[.5,.65,.8,.9],conflict:[.8]};
 const output={frozenAt:new Date().toISOString(),developmentSampleSha256:hash('rubric-sample.json'),heldoutSampleSha256:hash('judge-v2-heldout.json'),grid,
  rule:'Maximize development recall with false positives <=2; ties: precision, then stricter summed thresholds.',shipRule:{minimumHeldoutRecallGain:.1,pairedBootstrapLower95AboveZero:true,noFalsePositiveIncreaseOverallAndPerSource:true},baseline:baselineSummary,candidates:{}};
 for(const candidate of ['marco','stsb']){
  const report=read(`judge-v2-${candidate}-dev.json`);if(report.status!=='complete')throw Error(candidate+' development incomplete');
  const trials=[];
  for(const similarity of grid.similarity)for(const cross of grid.cross)for(const entails of grid.entails)for(const conflict of grid.conflict){
   const thresholds={similarity,cross,entails,conflict};const rows=predictions(report,thresholds);trials.push({thresholds,summary:summarize(rows)});
  }
  const eligible=trials.filter(row=>row.summary.overall.fp<=2).sort((a,b)=>b.summary.overall.recall-a.summary.overall.recall
   ||(b.summary.overall.precision??0)-(a.summary.overall.precision??0)
   ||Object.values(b.thresholds).reduce((a,b)=>a+b,0)-Object.values(a.thresholds).reduce((a,b)=>a+b,0));
  if(!eligible.length)throw Error('No eligible setting for '+candidate);
  output.candidates[candidate]={...eligible[0],developmentRawSha256:hash(`judge-v2-${candidate}-dev.json`),trials};
 }
 fs.writeFileSync(`${dir}/judge-v2-thresholds.json`,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({baseline:output.baseline.overall,candidates:Object.fromEntries(Object.entries(output.candidates).map(([key,value])=>[key,{thresholds:value.thresholds,metrics:value.summary.overall}]))},null,2));
}else if(mode==='report'){
 const settings=read('judge-v2-thresholds.json');if(settings.heldoutSampleSha256!==hash('judge-v2-heldout.json'))throw Error('Held-out set changed after thresholds were frozen');
 const baselineReport=read('judge-v2-baseline-heldout.json');if(baselineReport.status!=='complete')throw Error('Incomplete baseline held-out run');
 const baselineRows=predictions(baselineReport);const baseline=summarize(baselineRows);
 const output={measuredAt:new Date().toISOString(),settingsSha256:hash('judge-v2-thresholds.json'),baseline,candidates:{}};
 for(const candidate of ['marco','stsb']){
  const report=read(`judge-v2-${candidate}-heldout.json`);if(report.status!=='complete')throw Error('Incomplete '+candidate);
  if(report.frozenSettingsSha256!==output.settingsSha256)throw Error('Settings changed during held-out runs');
  const rows=predictions(report,settings.candidates[candidate].thresholds),summary=summarize(rows),interval=bootstrap(baselineRows,rows);
  const recallGain=summary.overall.recall-baseline.overall.recall;
  const passes=recallGain>=.1 && interval.lower95>0 && summary.overall.fp<=baseline.overall.fp
   && ['rubric','reference'].every(source=>summary.bySource[source].fp<=baseline.bySource[source].fp);
  const assets=Object.assign({},...report.attempts.map(attempt=>attempt.assets));
  const modelBytes=Object.entries(assets).filter(([name])=>/^\/(Xenova|cross-encoder)\//.test(name)).reduce((sum,[,asset])=>sum+asset.bytes,0);
  const runtimeBytes=Object.entries(assets).filter(([name])=>name.startsWith('/runtime/')).reduce((sum,[,asset])=>sum+asset.bytes,0);
  const milliseconds=report.rows.map(row=>row.milliseconds);
  output.candidates[candidate]={thresholds:settings.candidates[candidate].thresholds,summary,recallGain,pairedRecallGain:interval,passesShipAccuracyGate:passes,
   memory:{peakBrowserRssBytes:report.peakBrowserRssBytes,peakBrowserPssBytes:report.peakBrowserPssBytes,cgroup:report.cgroup,
    standardCoResidencyProven:false,requiresOptIn:true},downloads:{uniqueModelAssetBytes:modelBytes,runtimeBytes},
   timePerAnswerMs:{median:q(milliseconds,.5),p95:q(milliseconds,.95),mean:milliseconds.reduce((a,b)=>a+b,0)/milliseconds.length,values:milliseconds},
   rows:rows.map(row=>({id:row.id,source:row.source,handHits:row.handHits,modelHits:row.modelHits,decision:row.decision}))};
 }
 fs.writeFileSync(`${dir}/judge-v2-summary.json`,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({...output,candidates:Object.fromEntries(Object.entries(output.candidates).map(([key,{rows,...value}])=>[key,value]))},null,2));
}else throw Error('Use tune or report');
