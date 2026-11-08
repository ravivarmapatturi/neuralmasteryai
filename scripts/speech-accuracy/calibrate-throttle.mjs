// Verify page-only CDP throttling does not slow this Chromium's ASR worker.
import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch();
const output={browser:browser.version(),runs:[],workerProtocol:[]};
try {
 const page=await browser.newPage();const cdp=await page.context().newCDPSession(page);
 cdp.on('Target.attachedToTarget',async event=>{
  for(const [id,method,params] of [[1,'Emulation.setCPUThrottlingRate',{rate:4}],[2,'Runtime.runIfWaitingForDebugger',{}]]) {
   await cdp.send('Target.sendMessageToTarget',{sessionId:event.sessionId,message:JSON.stringify({id,method,params})});
  }
 });
 cdp.on('Target.receivedMessageFromTarget',event=>{const msg=JSON.parse(event.message);if(msg.id===1)output.workerProtocol.push(msg);});
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:false});
 for(const rate of [1,4]){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  const result=await page.evaluate(async()=>{
   const worker=new Worker(URL.createObjectURL(new Blob(['onmessage=()=>{let x=0;const t=performance.now();for(let i=0;i<50000000;i++)x+=Math.sqrt(i);postMessage({ms:performance.now()-t,x})}'],{type:'text/javascript'})));
   return new Promise(resolve=>{worker.onmessage=e=>{worker.terminate();resolve(e.data)};worker.postMessage(1)});
  });
  output.runs.push({pageRate:rate,result});
 }
 fs.writeFileSync('scripts/speech-accuracy/throttle-calibration.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify(output));
} finally {await browser.close()}
