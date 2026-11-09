// One fresh browser and one model at a time. GPU absence is a result, never WASM disguised as GPU.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { wordErrors, termMatches } from './metrics.mjs';
const metadata=JSON.parse(fs.readFileSync('scripts/speech-accuracy/tier-model-metadata.json'));
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const candidates=args.capture ? [[`capture-${args.capture}`,'onnx-community/whisper-base.en','wasm','q8']] : [['turbo-gpu','onnx-community/whisper-large-v3-turbo','webgpu','q4'],['distil-small-wasm','distil-whisper/distil-small.en','wasm','q8'],['whisper-base-wasm','onnx-community/whisper-base.en','wasm','q8'],['small-gpu','onnx-community/whisper-small.en','webgpu','q8'],['small-wasm','onnx-community/whisper-small.en','wasm','q8'],['base-live','onnx-community/moonshine-base-ONNX','wasm','q8']].filter(c=>!args.only||c[0]===args.only);
const rows=['corpus','human-terms','sequence'].flatMap(name=>JSON.parse(fs.readFileSync(`scripts/speech-accuracy/${name}.json`)).filter(r=>r.split==='heldout').map(r=>({...r,corpus:name})));
if(args.capture){
 const long=JSON.parse(fs.readFileSync('scripts/speech-accuracy/capture-cases.json'))[0];
 rows.push({...long,corpus:'capture-long'}, {...long,id:'capture-long-quiet-tail',corpus:'capture-quiet-tail',quietAfterSeconds:35,quietGain:0.03});
}
const baselineRevision='8c57a6c4f7ee498a1be17c8f839fadce2ac56d58';
const oldFiles=new Set(['engines.ts','refinementPolicy.ts','audioPreparation.ts','qualitySettings.ts','moonshineSingleThreadWorker.ts','modelVersions.ts']);
const baselinePlugin={name:'before-capture',setup(build){build.onLoad({filter:/\.ts$/},args2=>{
 if(args.capture!=='before'||!oldFiles.has(path.basename(args2.path)))return;
 const relative=path.relative(process.cwd(),args2.path);
 return {contents:execFileSync('git',['show',`${baselineRevision}:${relative}`],{encoding:'utf8'}),loader:'ts',resolveDir:path.dirname(args2.path)};
});}};
const hostAvailableMB=()=>Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+)/m)[1])/1024;
if(hostAvailableMB()<2048)throw Error('Less than 2 GiB available; refusing compilation/browser launch');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nm-speech-tier-'));
await build({entryPoints:{worker:'src/workers/moonshineSingleThreadWorker.ts',preparation:'src/lib/speechTest/audioPreparation.ts',quality:'src/lib/interviewRoom/qualitySettings.ts',prompt:'src/lib/interviewRoom/speechPrompt.ts'},bundle:true,format:'esm',platform:'browser',target:'es2022',outdir:temp,logLevel:'error',plugins:[baselinePlugin]});
fs.copyFileSync('src/workers/speechCaptureWorklet.js',path.join(temp,'capture-worklet.js'));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 let file;
 if(url.pathname==='/tier-harness'){res.setHeader('Content-Type','text/html');res.end('<title>Model tier benchmark</title>');return;}
 if(url.pathname==='/prompt.js')file=path.join(temp,'prompt.js');
 else if(url.pathname==='/src/workers/moonshineSingleThreadWorker.ts')file=path.join(temp,'worker.js');
 else if(url.pathname==='/src/workers/speechCaptureWorklet.js')file=path.join(temp,'capture-worklet.js');
 else if(url.pathname==='/src/lib/interviewRoom/qualitySettings.ts')file=path.join(temp,'quality.js');
 else if(url.pathname==='/src/lib/speechTest/audioPreparation.ts')file=path.join(temp,'preparation.js');
 else if(url.pathname.startsWith('/scripts/speech-accuracy/audio/')&&!url.pathname.includes('..'))file=path.join(process.cwd(),url.pathname.slice(1));
 else if(url.pathname.endsWith('.mjs'))file=path.join(process.cwd(),'node_modules/onnxruntime-web/dist',path.basename(url.pathname));
 else {res.statusCode=404;res.end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.wav')?'audio/wav':'text/javascript');fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);}catch{res.statusCode=404;res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5193,resolve)});
try {for(const [id,model,device,dtype] of candidates){
 const file=`scripts/speech-accuracy/tier-${args.name??id}.json`;
 if(fs.existsSync(file)&&!args.repeat)throw Error('Refusing to overwrite '+file);
 const availableMB=()=>Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+)/m)[1])/1024;
 if(availableMB()<2048)throw Error('Less than 2 GiB available; refusing heavy model run');
 const out={bundleHashes:Object.fromEntries(['worker','quality','preparation','prompt','capture-worklet'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(temp,name+'.js'))).digest('hex')])),workerBundleSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(temp,'worker.js'))).digest('hex'),transformersVersion:JSON.parse(fs.readFileSync('node_modules/@huggingface/transformers/package.json')).version,ortVersion:JSON.parse(fs.readFileSync('node_modules/onnxruntime-web/package.json')).version,prompt:args.prompt??'off',cpuBrowser:args.cpuBrowser==='true',capture:args.capture??null,baselineRevision:args.capture==='before'?baselineRevision:null,harness:'esbuild-bundled production worker over static HTTP; no Vite/dev server during inference',availableBeforeMB:availableMB(),id,model,device,dtype,revision:metadata[model].revision,timestamp:new Date().toISOString(),results:[],browserRSSLimitMB:2304,memoryMetric:'Peak sampled total Chromium process RSS (includes shared pages more than once); not GPU/OS peak memory',peakBrowserRSSMB:null,nonReadRequests:[],responseContentLengths:{}};
 let browser,timer;
 const save=()=>{try{const group=fs.readFileSync('/proc/self/cgroup','utf8').trim().split('::')[1];const base='/sys/fs/cgroup'+group;out.cgroup={path:group,memoryMax:fs.readFileSync(base+'/memory.max','utf8').trim(),swapMax:fs.readFileSync(base+'/memory.swap.max','utf8').trim(),peakBytes:Number(fs.readFileSync(base+'/memory.peak','utf8').trim())};}catch{}fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');};
 try {
  browser=await chromium.launch({headless:args.headed!=='true',args:['--autoplay-policy=no-user-gesture-required',...(args.cpuBrowser==='true'?['--disable-gpu']:[])]});out.browser=browser.version();
  const page=await browser.newPage();page.on('response',r=>{if(r.status()===200){const n=Number(r.headers()['content-length']);out.responseContentLengths[new URL(r.url()).origin+new URL(r.url()).pathname]=Number.isFinite(n)&&n>0?n:null;}});page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method()))out.nonReadRequests.push({url:new URL(r.url()).origin,method:r.method()});});
  await page.goto('http://localhost:5193/tier-harness');
  out.capability=await page.evaluate(async()=>({memoryGB:navigator.deviceMemory??null,adapter:!!(await navigator.gpu?.requestAdapter()),isolated:crossOriginIsolated}));
  if(device==='webgpu'&&!out.capability.adapter){out.loads=false;out.unavailable='No WebGPU adapter; no download or inference attempted';save();console.log(id,out.unavailable);continue;}
  const cdp=await browser.newBrowserCDPSession();
  let sampling=false;timer=setInterval(async()=>{if(sampling)return;sampling=true;try{const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');let kb=0;for(const p of processInfo){try{const m=fs.readFileSync(`/proc/${p.id}/status`,'utf8').match(/^VmRSS:\s+(\d+)/m);kb+=Number(m?.[1]??0);}catch{}}out.peakBrowserRSSMB=Math.max(out.peakBrowserRSSMB??0,kb/1024);if(out.peakBrowserRSSMB>2304||availableMB()<2048){out.memoryLimitExceeded=true;out.availableAtStopMB=availableMB();out.memoryStop='Stopped: exceeded 2.25 GiB browser RSS or host available RAM fell below 2 GiB';save();await browser.close();}}catch{}finally{sampling=false;}},500);
  const t=Date.now();
  out.init=await page.evaluate(async({model,device,dtype,revision,capture})=>{
   if(capture){const {createASREngineForQuality}=await import('/src/lib/interviewRoom/qualitySettings.ts');window.engine=createASREngineForQuality('better');await window.engine.load();return window.engine.getMetrics();}
   window.w=new Worker(new URL('/src/workers/moonshineSingleThreadWorker.ts',location.href),{type:'module'});
   window.counter=0;window.progressFiles={};
   window.w.addEventListener('message',e=>{if(e.data.type==='progress')window.progressFiles[e.data.file]={loaded:e.data.loaded,total:e.data.total};});
   window.rpc=(op,payload)=>new Promise((resolve,reject)=>{const id=++window.counter;const timer=setTimeout(()=>{window.w.removeEventListener('message',onmessage);reject(Error('Model operation exceeded 10 minutes'));},600000);const onmessage=e=>{if(e.data.id!==id||['model_ready','progress'].includes(e.data.type))return;clearTimeout(timer);window.w.removeEventListener('message',onmessage);e.data.type==='error'?reject(Error(e.data.error)):resolve(e.data);};window.w.addEventListener('message',onmessage);window.w.postMessage({id,op,payload});});
   return await window.rpc('init',{modelId:model,device,dtype,revision});
  },{model,device,dtype,revision:out.revision,capture:args.capture});
  out.loadWallMs=Date.now()-t;out.loads=true;
  out.downloadFiles=await page.evaluate(()=>window.progressFiles??{});out.modelDownloadBytes=Object.values(out.downloadFiles).reduce((s,f)=>s+(f.total||f.loaded||0),0);save();
  const previous = args.remainingFrom ? JSON.parse(fs.readFileSync(args.remainingFrom)) : null;
  if(previous)out.remainingFrom={file:args.remainingFrom,sha256:crypto.createHash('sha256').update(fs.readFileSync(args.remainingFrom)).digest('hex'),note:'New engine instance; completed source cases omitted, no decoder state restored'};
  const completedIds=new Set(previous?.results?.map(row=>row.id)??[]);
  const selectedRows = rows.filter(row =>
    !completedIds.has(row.id) &&
    !(args.skipLong === 'true' && row.corpus.startsWith('capture-')) &&
    (!args.corpus || row.corpus === args.corpus || (args.corpus === 'long' && row.corpus.startsWith('capture-'))));
  for(const row of selectedRows){
   const bytes=fs.readFileSync('scripts/speech-accuracy/'+row.path);if(crypto.createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Corrupt corpus '+row.id);
   const result=await page.evaluate(async ({row,capture,prompt})=>{
    if(capture){
      const ctx=new AudioContext({sampleRate:48000});await ctx.resume();
      const audio=await ctx.decodeAudioData(await(await fetch('/scripts/speech-accuracy/'+row.path)).arrayBuffer());
      if(row.quietAfterSeconds){const pcm=audio.getChannelData(0);for(let i=row.quietAfterSeconds*48000;i<pcm.length;i++)pcm[i]*=row.quietGain;}
      const dest=ctx.createMediaStreamDestination();const source=ctx.createBufferSource();source.buffer=audio;source.connect(dest);
      const engine=window.engine;engine.reset();await engine.start(dest.stream);
      const {questionSpeechPrompt}=await import('/prompt.js');engine.setQuestionPrompt(questionSpeechPrompt(row.questionTitle??''));
      let live='';const off=engine.subscribe(m=>{live=m.partialText||m.finalText||'';});const started=performance.now();
      await new Promise(resolve=>{source.onended=resolve;source.start();});const liveAtEnd=live;const ended=performance.now();
      await engine.stop();const finishMs=performance.now()-ended;const metrics=engine.getMetrics();off();dest.stream.getTracks().forEach(t=>t.stop());await ctx.close();
      return {text:metrics.finalText,finishMs,wallMs:finishMs,playbackWallMs:ended-started,liveAtEnd,metrics};
    }
    const ctx=new AudioContext({sampleRate:16000});const buffer=await ctx.decodeAudioData(await(await fetch('/scripts/speech-accuracy/'+row.path)).arrayBuffer());const pcm=buffer.getChannelData(0);const {normalizeQuietAudio}=await import('/src/lib/speechTest/audioPreparation.ts');const start=performance.now();const {questionSpeechPrompt}=await import('/prompt.js');const result=await window.rpc('batch',{audio:normalizeQuietAudio(pcm),initialPrompt:prompt==='question'?questionSpeechPrompt(row.questionTitle??''):''});await ctx.close();return {...result,wallMs:performance.now()-start};},{row,capture:args.capture,prompt:args.prompt});
   out.results.push({corpus:row.corpus,accent:row.accent,sourceSHA256:row.sha256,quietAfterSeconds:row.quietAfterSeconds,quietGain:row.quietGain,...result,id:row.id,...(row.corpus==='human-terms'?{termScore:termMatches(row.terms,result.text)}:{wer:wordErrors(row.reference,result.text)})});save();console.log(id,row.id,Math.round(result.wallMs));
  }
  out.completed=true;save();
 }catch(e){out.error=String(e);out.loads??=false;save();console.error(id,out.error);}finally{clearInterval(timer);await browser?.close();}
 console.log('free memory:',execFileSync('free',['-g'],{encoding:'utf8'}));
}}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
