// Linux: quarter-share the ASR worker's CPU without stopping the capture threads.
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const expand=text=>text.trim().split(',').flatMap(part=>{const [a,b]=part.split('-').map(Number);return b===undefined?[a]:Array.from({length:b-a+1},(_,i)=>a+i)});
export async function throttleWorker(page,browser){
 const browserCDP=await browser.newBrowserCDPSession();
 const {processInfo}=await browserCDP.send('SystemInfo.getProcessInfo');
 const renderers=processInfo.filter(row=>row.type==='renderer');
 if(renderers.length!==1)throw Error('Worker isolation requires exactly one renderer');
 const pid=renderers[0].id;
 const allowed=expand(fs.readFileSync(`/proc/${pid}/status`,'utf8').match(/^Cpus_allowed_list:\s*(.+)$/m)[1]);
 if(allowed.length<2)throw Error('Need a separate CPU for capture threads');
 const cpu=allowed.at(-1),others=allowed.filter(value=>value!==cpu);
 execFileSync('taskset',['-apc',others.join(','),String(pid)],{stdio:'ignore'});
 if(Number(execFileSync('ps',['-o','ni=','-p',String(process.pid)],{encoding:'utf8'}).trim())!==5)throw Error('Launcher must have nice 5 to match the Chromium worker');
 const executable=process.env.STT_CPU_BURNER ?? '/tmp/stt-thread-throttle/burn';
 const burners=Array.from({length:3},()=>spawn('taskset',['-c',String(cpu),executable],{stdio:'ignore',detached:true}));
 try {
 await Promise.all(burners.map(child=>new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)})));
 const evidence={method:'One ASR worker plus three nice-5 CPU burners share one logical CPU; all other renderer threads exclude that CPU',rendererPID:pid,workerCPU:cpu,captureCPUs:others,rate:4,workers:[],failure:null};
 const cdp=await page.context().newCDPSession(page);let closing=false;
 const resume=sessionId=>cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:1,method:'Runtime.runIfWaitingForDebugger'})});
 cdp.on('Target.attachedToTarget',async event=>{
  try{
   if(event.targetInfo.type==='worker'){
    let tids=[];
    for(let attempt=0;attempt<100&&!tids.length;attempt++){
     tids=fs.readdirSync(`/proc/${pid}/task`).filter(tid=>{
      try{return fs.readFileSync(`/proc/${pid}/task/${tid}/comm`,'utf8').trim()==='DedicatedWorker'}catch{return false}
     });
     if(!tids.length)await sleep(20);
    }
    if(!tids.length)throw Error('DedicatedWorker thread not identified');
    for(const tid of tids){
     const stat=fs.readFileSync(`/proc/${pid}/task/${tid}/stat`,'utf8');
     const nice=Number(stat.slice(stat.lastIndexOf(')')+2).split(/\s+/)[16]);
     if(nice!==5)throw Error(`Unexpected worker nice=${nice}; cannot claim equal CPU shares`);
     execFileSync('taskset',['-pc',String(cpu),tid],{stdio:'ignore'});
    }
    evidence.workers.push({target:event.targetInfo.targetId,tids:tids.map(Number),nice:5,at:new Date().toISOString()});
   }
   await resume(event.sessionId);
  }catch(error){if(!closing){evidence.failure=String(error);console.error(evidence.failure);await browser.close().catch(()=>{})}}
 });
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:false});
 return {evidence,stop:()=>{closing=true;for(const child of burners)child.kill('SIGTERM')}};
 } catch(error) {for(const child of burners)child.kill('SIGTERM');throw error;}
}
