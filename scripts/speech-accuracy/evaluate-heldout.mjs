// Locked evaluation. Selection must already be frozen; no model choice is made here.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
const root='scripts/speech-accuracy';
const frozen=JSON.parse(fs.readFileSync(`${root}/frozen-corpus.json`));
if(typeof frozen.selection!=='object')throw Error('Freeze selection before evaluation');
for(const [file,hash] of Object.entries(frozen.selection.sourceHashes)){
 if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Frozen source changed: '+file);
}
for(const corpus of ['corpus','terms','sequence','human-terms']){
 if(crypto.createHash('sha256').update(fs.readFileSync(`${root}/${corpus}.json`)).digest('hex')!==frozen.selection.manifestHashes[corpus])throw Error('Frozen corpus changed: '+corpus);
}
const jobs=[];
for(const corpus of ['human','human-terms','terms','sequence']){
 for(const [name,revision] of [['before',frozen.baselineRevision],['after',null]]){
  for(const cpu of corpus==='human'?[100,25]:[100]){
   const file=`${root}/evaluation-${corpus}-${name}-cpu${cpu}.json`;
   const args=[`${root}/run.mjs`,'--split=heldout','--profile=better',`--out=${file}`];
   if(corpus!=='human')args.push(`--corpus=${corpus}`);
   if(revision)args.push(`--revision=${revision}`);
   else args.push('--prepare=normalize','--drain=300');
   if(cpu<100)args.push(`--cpuLimit=${cpu}`,`--cpulimit=${process.env.STT_CPULIMIT ?? 'cpulimit'}`);
   jobs.push({file,args});
  }
 }
}
for(const job of jobs){
 if(fs.existsSync(job.file)){
  const existing=JSON.parse(fs.readFileSync(job.file));
  if(existing.completed){console.log('Retaining completed locked run:',job.file);continue;}
  throw Error('Incomplete run requires inspection before retry: '+job.file);
 }
 console.log(execFileSync('free',['-g'],{encoding:'utf8'}));
 console.log('Starting locked evaluation:',job.file);
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,job.args,{stdio:'inherit'});
  child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Evaluation failed (${code ?? signal}): ${job.file}`)));
 });
}
console.log('All locked evaluation processes exited 0.');
