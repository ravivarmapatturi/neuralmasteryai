import http from 'node:http';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {throttleWorker} from './thread-throttle.mjs';
const server=http.createServer((req,res)=>res.end('<title>Worker CPU calibration</title>'));
let browser,controller;
const evidence={runs:[]};
try{
 await new Promise(resolve=>server.listen(5196,'127.0.0.1',resolve));
 browser=await chromium.launch();const page=await browser.newPage();await page.goto('http://127.0.0.1:5196');
 for(const rate of [1,4]){
  if(rate===4)controller=await throttleWorker(page,browser);
  const result=await page.evaluate(async()=>{
   const worker=new Worker(URL.createObjectURL(new Blob(['onmessage=()=>{const t=performance.now();let x=0;for(let i=0;i<500000000;i++)x+=Math.sqrt(i);postMessage({ms:performance.now()-t,x})}'],{type:'text/javascript'})));
   return new Promise(resolve=>{worker.onmessage=e=>{worker.terminate();resolve(e.data)};worker.postMessage(1)});
  });evidence.runs.push({rate,result});
 }
 evidence.throttle=controller.evidence;evidence.measuredRatio=evidence.runs[1].result.ms/evidence.runs[0].result.ms;
 if(evidence.throttle.failure)throw Error(evidence.throttle.failure);
 evidence.completed=true;
}finally{evidence.throttle=controller?.evidence ?? null;controller?.stop();await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync('scripts/speech-accuracy/worker-throttle-calibration.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence))}
