import fs from 'node:fs';
const root='scripts/speech-accuracy/';
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
function group(rows){
 const errors=rows.reduce((s,r)=>s+(r.wer?.edits??0),0),words=rows.reduce((s,r)=>s+(r.wer?.words??0),0);
 const matched=rows.reduce((s,r)=>s+(r.termScore?.matched??0),0),terms=rows.reduce((s,r)=>s+(r.termScore?.total??0),0);
 return {clips:rows.length,errors,words,werPct:words?100*errors/words:null,matched,terms,termAccuracyPct:terms?100*matched/terms:null,meanFinalMs:mean(rows.map(r=>r.finishMs??r.wallMs).filter(Number.isFinite)),decisions:rows.reduce((s,r)=>{const d=r.metrics?.refinementDecision;if(d)s[d]=(s[d]??0)+1;return s;},{})};
}
const summary={};
for(const file of fs.readdirSync(root).filter(f=>/^tier-.*\.json$/.test(f)&&!['tier-summary.json','tier-license-evidence.json','tier-model-metadata.json'].includes(f))){
 const j=JSON.parse(fs.readFileSync(root+file));if(!Array.isArray(j.results))continue;
 summary[file]={completed:j.completed===true,loads:j.loads??null,error:j.error??j.unavailable??null,modelBytes:j.modelDownloadBytes||j.init?.downloadBytes||null,peakBrowserRSSMiB:j.peakBrowserRSSMB??null,cgroupPeakBytes:j.cgroup?.peakBytes??null,cgroup:j.cgroup??null,loadWallMs:j.loadWallMs??null,all:group(j.results.filter(r=>r.corpus==='corpus')),indian:group(j.results.filter(r=>r.corpus==='corpus'&&r.accent==='Indian')),terms:group(j.results.filter(r=>r.corpus==='human-terms')),sequence:group(j.results.filter(r=>r.corpus==='sequence')),long:j.results.filter(r=>r.corpus?.startsWith('capture-')).map(r=>({id:r.id,...group([r])})),nonReadRequests:j.nonReadRequests?.length??null};
}
fs.writeFileSync(root+'tier-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
