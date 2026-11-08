// Preregistered supplemental platform condition; no recognition tuning.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
const root='scripts/speech-accuracy';
const protocol=JSON.parse(fs.readFileSync(`${root}/worker-throttle-protocol.json`));
const frozen=JSON.parse(fs.readFileSync(`${root}/frozen-corpus.json`));
for(const [file,hash] of Object.entries({...frozen.selection.sourceHashes,...protocol.sourceHashes}))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Source changed: '+file);
for(const job of protocol.jobs){
 if(fs.existsSync(job.out)){if(JSON.parse(fs.readFileSync(job.out)).completed){console.log('Retaining',job.out);continue}throw Error('Inspect incomplete run '+job.out)}
 console.log(execFileSync('free',['-g'],{encoding:'utf8'}));
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[`${root}/run-worker-throttled.mjs`,...job.args,`--out=${job.out}`],{stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Supplemental run exited '+code)))});
}
