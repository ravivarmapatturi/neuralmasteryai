// Supplemental scheduling condition only. Recognition source/settings stay frozen.
import {chromium} from 'playwright';
import fs from 'node:fs';
import {throttleWorker} from './thread-throttle.mjs';
const out=process.argv.find(arg=>arg.startsWith('--out='))?.slice(6);
if(!out || fs.existsSync(out))throw Error('Pass an explicit new --out= file');
const calibration=JSON.parse(fs.readFileSync('scripts/speech-accuracy/worker-throttle-calibration.json'));
if(!calibration.completed || calibration.measuredRatio<3.5 || calibration.measuredRatio>4.5)throw Error('Need verified approximately 4x worker slowdown');
const launch=chromium.launch.bind(chromium);let controller;
chromium.launch=async options=>{
 const browser=await launch(options);const newPage=browser.newPage.bind(browser);
 browser.newPage=async(...args)=>{
  const page=await newPage(...args);const goto=page.goto.bind(page);
  page.goto=async(...args)=>{const response=await goto(...args);controller=await throttleWorker(page,browser);return response};
  return page;
 };
 return browser;
};
try{await import('./run.mjs')}
finally{
 controller?.stop();
 if(controller){fs.writeFileSync(out+'.throttle.json',JSON.stringify({calibrationRatio:calibration.measuredRatio,...controller.evidence},null,2)+'\n');if(controller.evidence.failure)throw Error(controller.evidence.failure)}
}
