// Same frozen source and settings; headed browser platform evaluation only.
import {chromium} from 'playwright';
import fs from 'node:fs';
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,headless:false});
const out=process.argv.find(arg=>arg.startsWith('--out='))?.slice(6);
if(!out)throw Error('Pass an explicit --out= file for a headed platform evaluation');
fs.writeFileSync(out+'.launch.json',JSON.stringify({headless:false,flags:'same as the primary harness, no unsafe WebGPU flags',models:'unchanged frozen profile'},null,2)+'\n');
await import('./run.mjs');
