import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
const protocol=JSON.parse(fs.readFileSync('scripts/speech-accuracy/followup-protocol.json'));
for(const [file,hash] of Object.entries(protocol.sourceHashes))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Registered source changed: '+file);
for(const job of protocol.jobs){
 if(fs.existsSync(job.out)){if(JSON.parse(fs.readFileSync(job.out)).completed){console.log('Retaining',job.out);continue}throw Error('Inspect incomplete run: '+job.out)}
 console.log(execFileSync('free',['-g'],{encoding:'utf8'}));
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/speech-accuracy/run.mjs',...job.args,`--out=${job.out}`],{stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Run failed (${code}): ${job.out}`)))});
}
