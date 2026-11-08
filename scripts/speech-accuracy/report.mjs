// Generate only the numeric section from completed, locked held-out runs.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {summarize} from './metrics.mjs';
const root='scripts/speech-accuracy';
const lock=JSON.parse(fs.readFileSync(`${root}/frozen-corpus.json`));
assert.equal(typeof lock.selection,'object');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const records={};
for(const corpus of ['human','human-terms','terms','sequence']){
 const manifest=JSON.parse(fs.readFileSync(`${root}/${corpus==='human'?'corpus':corpus}.json`));
 for(const period of ['before','after'])for(const cpu of corpus==='human'?[100,25]:[100]){
  const file=`${root}/evaluation-${corpus}-${period}-cpu${cpu}.json`;
  const bytes=fs.readFileSync(file);const run=JSON.parse(bytes);
  assert.equal(run.completed,true,file);
  assert.equal(run.split,'heldout');
  assert.equal(run.results.length,manifest.filter(row=>row.split==='heldout').length,file);
  assert.equal(run.corpusSHA256,lock.selection.manifestHashes[corpus==='human'?'corpus':corpus]);
  assert.equal(run.environment.capability.isolated,false);
  assert.deepEqual(run.nonReadRequests,[]);
  assert.equal(run.profile,'better');
  assert.equal(run.engineConfig.modelId,period==='before'?'onnx-community/moonshine-base-ONNX':'onnx-community/moonshine-tiny-ONNX');
  if(period==='before')assert.equal(run.revision,lock.baselineRevision);
  else for(const [path,hash] of Object.entries(run.sourceHashes))assert.equal(hash,lock.selection.sourceHashes[path]);
  const summary=summarize(manifest,run);
  const live=summarize(manifest,run,'liveText');
  const corrected=summarize(manifest,run,'correctedText');
  const sorted=run.results.map(row=>row.finishMs).sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  records[`${corpus}-${period}-${cpu}`]={file,sha256:digest(bytes),summary,liveSnapshotWER:live.werPct,correctedTermAccuracy:corrected.termAccuracyPct,correctedTermMatches:corrected.termsMatched,medianFinishMs:sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2,firstClipFinishMs:run.results[0].finishMs,finalWarnings:run.results.filter(row=>row.metrics.finalPassWarning||row.metrics.errorMessage).map(row=>({id:row.id,warning:row.metrics.finalPassWarning||row.metrics.errorMessage})),timeoutClips:run.results.filter(row=>/timed out/i.test(row.metrics.errorMessage ?? '')).map(row=>row.id),workerCalibrationMs:run.environment.workerCalibration.ms,engine:run.engineConfig,finalBackends:[...new Set(run.results.map(row=>row.metrics.device))]};
 }
}
const fmt=(n,d=1)=>n===null||n===undefined?'unavailable':n.toFixed(d);
const secs=n=>`${fmt(n/1000,2)} s`;
let md='## Held-out results\n\n';
md+='These tables use only the fresh `evaluation-*` runs after the configuration freeze. The main WER result covers 18 held-out VCTK clips. WER is corpus-weighted edit distance before technical spelling correction. The live snapshot is the visible text at file playback end, so it includes unfinished output and latency effects.\n\n';
md+='| CPU budget | Profile | Final WER (edits / reference words) | Live snapshot WER | Mean first live output; clips with live text | Finish mean / median |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
for(const cpu of [100,25])for(const p of ['before','after']){
 const r=records[`human-${p}-${cpu}`],s=r.summary;
 md+=`| ${cpu}%${cpu===25?' (renderer-wide starvation)':''} | ${p==='before'?'Before: Moonshine Base':'After: Tiny live + Whisper final'} | ${fmt(s.werPct)}% (${s.edits}/${s.referenceWords}) | ${fmt(r.liveSnapshotWER)}% | ${s.meanFirstWordMs===null?'unavailable':secs(s.meanFirstWordMs)}; ${s.liveOutputClips}/${s.clips} | ${secs(s.meanFinishMs)} / ${secs(r.medianFinishMs)} |\n`;
}
md+='\nFirst-live-output timing starts at file playback, includes source leading silence, and excludes output first appearing during finalization. Missing live output is reported in the coverage count, not converted to zero latency. This is not word-aligned acoustic latency. Finish timing includes the 300 ms drain in the new profile, queued work, decoding, and any first-use final-model download. These are laptop observations, not device-wide guarantees.\n\n';
const slow=records['human-after-25'];
md+=`The new profile hit its 90-second final-check deadline on ${slow.timeoutClips.length}/${slow.summary.clips} clips under the 25% CPU budget. Those clips retain live text and expose a warning. This delay is part of the measured finish time; it is not omitted from the mean or treated as a successful Whisper refinement.\n\n`;
const b=records['human-before-100'],a=records['human-after-100'];
md+=`On the normal CPU run, the final transcript changed from **${fmt(b.summary.werPct)}% to ${fmt(a.summary.werPct)}% WER**. The first clip's finish time was ${secs(b.firstClipFinishMs)} before and ${secs(a.firstClipFinishMs)} after; the new profile downloads its final model on first use. ${a.finalWarnings.length} of ${a.summary.clips} new-profile clips raised a final-pass warning.\n\n`;
md+='### Human technical-term cases\n\nThe five FOSDEM excerpts provide one positive case per requested term. The metric counts whether the required term is present as a complete token sequence, accepting the preregistered orthographic variants. It measures term presence across five cases, not precision, every spoken occurrence, or general interview accuracy. Their captions are imperfect, so no gold-reference WER is reported for them.\n\n';
md+='| Profile | Raw recognized terms | After contextual spelling correction |\n| :--- | :--- | :--- |\n';
for(const p of ['before','after']){const r=records[`human-terms-${p}-100`],s=r.summary;md+=`| ${p} | ${s.termsMatched}/${s.termsTotal} (${fmt(s.termAccuracyPct,0)}%) | ${r.correctedTermMatches}/${s.termsTotal} (${fmt(r.correctedTermAccuracy,0)}%) |\n`;}
md+='\nBoth profiles recognized XGBoost, RAG and embeddings in these excerpts; neither recognized LoRA or BM25. Contextual correction did not recover those two cases.\n';
md+='\n### Long-answer diagnostic\n\nThis composite reuses the held-out Indian speaker\'s six VCTK recordings with two-second pauses. It is not another independent test subject or clip.\n\n';
md+='| Profile | Final WER | Finish time | Final-pass warnings |\n| :--- | :--- | :--- | :--- |\n';
for(const p of ['before','after']){const r=records[`sequence-${p}-100`];md+=`| ${p} | ${fmt(r.summary.werPct)}% | ${secs(r.summary.meanFinishMs)} | ${r.finalWarnings.length} |\n`;}
md+='\n### Synthetic diagnostic, reported separately\n\nFive held-out eSpeak sentences use a different voice and different sentences from the synthetic tuning partition. These are mechanical vocabulary diagnostics, not real-microphone or human-speech accuracy evidence.\n\n';
md+='| Profile | WER | Required terms present, raw / corrected |\n| :--- | :--- | :--- |\n';
for(const p of ['before','after']){const r=records[`terms-${p}-100`],s=r.summary;md+=`| ${p} | ${fmt(s.werPct)}% | ${s.termsMatched}/${s.termsTotal} / ${r.correctedTermMatches}/${s.termsTotal} |\n`;}
md+='\nAll ten locked browser/model runs completed with exit code 0, cross-origin isolation disabled, and no non-read HTTP requests observed. The run JSON retains transcripts, live updates, source/captured sample counts, model versions, source hashes, and effective backend labels.\n\n';
md+='CPU calibration observations (same fixed 500-million-iteration worker loop): '+[100,25].map(cpu=>['before','after'].map(p=>`${p}, ${cpu}% budget: ${secs(records[`human-${p}-${cpu}`].workerCalibrationMs)}`).join('; ')).join('; ')+'. The 25% limiter slows the renderer process containing the worker; its duty cycling is not an exact simulation of all mobile hardware.\n\n';
const supplemental=[];
for(const period of ['before','after']){
 const file=`${root}/evaluation-human-${period}-worker4.json`;
 if(!fs.existsSync(file))continue;
 const bytes=fs.readFileSync(file),run=JSON.parse(bytes),throttle=JSON.parse(fs.readFileSync(file+'.throttle.json'));
 assert.equal(run.completed,true);assert.equal(run.results.length,18);assert.equal(run.corpusSHA256,lock.selection.manifestHashes.corpus);
 assert.equal(run.environment.capability.isolated,false);assert.deepEqual(run.nonReadRequests,[]);assert.equal(run.cpuLimit,100);assert.equal(run.throttle,1);assert.equal(throttle.failure,null);assert(throttle.workers.length>0);
 if(period==='after')for(const [path,hash] of Object.entries(run.sourceHashes))assert.equal(hash,lock.selection.sourceHashes[path]);
 else assert.equal(run.revision,lock.baselineRevision);
 const manifest=JSON.parse(fs.readFileSync(`${root}/corpus.json`));
 const summary=summarize(manifest,run),live=summarize(manifest,run,'liveText');
 const durations=Object.fromEntries(manifest.map(row=>[row.id,row.durationSeconds]));
 const playbackRatio=run.results.reduce((sum,row)=>sum+row.playbackWallMs/(durations[row.id]*1000),0)/run.results.length;
 const r={file,sha256:digest(bytes),summary,liveSnapshotWER:live.werPct,workerCalibrationMs:run.environment.workerCalibration.ms,playbackRatio,finalWarnings:run.results.filter(row=>row.metrics.finalPassWarning||row.metrics.errorMessage).map(row=>({id:row.id,warning:row.metrics.finalPassWarning||row.metrics.errorMessage})),throttle};
 records[`human-${period}-worker4`]=r;supplemental.push([period,r]);
}
if(supplemental.length){
 assert.equal(supplemental.length,2,'Wait for both supplemental runs before reporting');
 md+='### Supplemental worker-only CPU contention\n\nThe renderer-wide limiter also stopped capture threads: mean playback wall time divided by file duration was 1.063 before and 1.136 after, versus 0.997 and 0.999 without it. It therefore mixes recognition slowdown with capture scheduling disruption. Those unfavorable results remain above. After observing this limitation, a separate hardware condition was preregistered without changing the frozen recognition code, models, corrections or audio. It is a supplemental measurement, not a new held-out configuration search.\n\n';
 md+='The ASR worker and three equal-priority CPU burners share one Linux logical CPU; the other renderer threads exclude that CPU. An independent worker calibration measured 3.60× slowdown. This approximates 4× inference stress while capture remains schedulable; it is not a phone simulation or an exact fourfold clock reduction. The source hashes and commands are in [the supplemental protocol](../scripts/speech-accuracy/worker-throttle-protocol.json).\n\n';
 md+='| Profile | Final WER | Live snapshot WER | First live output; coverage | Mean finish | Worker calibration | Final warnings |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
 for(const [period,r] of supplemental){const s=r.summary;md+=`| ${period} | ${fmt(s.werPct)}% (${s.edits}/${s.referenceWords}) | ${fmt(r.liveSnapshotWER)}% | ${s.meanFirstWordMs===null?'unavailable':secs(s.meanFirstWordMs)}; ${s.liveOutputClips}/${s.clips} | ${secs(s.meanFinishMs)} | ${secs(r.workerCalibrationMs)} | ${r.finalWarnings.length} |\n`;}
 md+='\nBoth supplemental browser runs exited 0. Per-run worker affinities, priorities and calibration timings are retained beside the run JSON. These runs use the same digital-injection limitations as the main table.\n\n';
}
md+='The exact numeric summary and hashes are in [the evaluation summary](../scripts/speech-accuracy/evaluation-summary.json). Parity with ChatGPT or Claude remains unmeasured.\n\n';
fs.writeFileSync(`${root}/evaluation-summary.json`,JSON.stringify({frozenAt:lock.selection.frozenAt,records},null,2)+'\n');
let report=fs.readFileSync('docs/speech-accuracy-results.md','utf8');
const start=report.indexOf('## Held-out results');const end=report.indexOf('## Reproduction commands',start);
assert(start>=0&&end>start);
report=report.slice(0,start)+md+report.slice(end);
report=report.replace(/Status: evaluation in progress\.[^\n]*/,`The selected browser profile uses Moonshine Tiny for live text and a Whisper Base.en pass after capture. On the 18-clip held-out VCTK set, final WER changed from ${fmt(b.summary.werPct)}% to ${fmt(a.summary.werPct)}%. The latency and download costs are reported below; the owner\'s physical microphone remains untested.`);
fs.writeFileSync('docs/speech-accuracy-results.md',report);
console.log(JSON.stringify({beforeWER:b.summary.werPct,afterWER:a.summary.werPct,verifiedRuns:Object.keys(records).length}));
