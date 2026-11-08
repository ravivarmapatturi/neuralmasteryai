import http from 'node:http';
import fs from 'node:fs';
import {chromium} from 'playwright';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<title>GPU capability probe</title>')});
const output={mode:'headed Chromium, default flags, temporary profile',display:process.env.DISPLAY ?? null};
let browser;
try {
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5195,'127.0.0.1',resolve)});
 browser=await chromium.launch({headless:false});
 output.browser=browser.version();
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5195/');
 output.capability=await page.evaluate(async()=>{
  const gpu=navigator.gpu;if(!gpu)return {secure:isSecureContext,webgpu:false,adapter:null};
  const adapter=await gpu.requestAdapter();
  if(!adapter)return {secure:isSecureContext,webgpu:true,adapter:null};
  return {secure:isSecureContext,webgpu:true,adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description,isFallbackAdapter:adapter.info.isFallbackAdapter ?? adapter.isFallbackAdapter ?? null},features:[...adapter.features]};
 });
 output.completed=true;
}catch(error){output.error=String(error);process.exitCode=1}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync('scripts/speech-accuracy/gpu-capability.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output))}
