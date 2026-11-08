// Focused browser harness, not the full Playwright suite. One worker/model at a time.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const arg = Object.fromEntries(process.argv.slice(2).map(x => { const [k,v] = x.replace(/^--/,'').split('='); return [k,v ?? true]; }));
const split = arg.split ?? 'tune';
if (!['tune','heldout'].includes(split)) throw Error('Use --split=tune or --split=heldout');
const model = arg.model ?? 'moonshine-base-ONNX';
const device = arg.device ?? 'wasm';
const mode = arg.mode ?? 'live';
const throttle = Number(arg.throttle ?? 1);
const cpuLimit = Number(arg.cpuLimit ?? 100);
const root = path.resolve('scripts/speech-accuracy');
const corpusBytes = fs.readFileSync(path.join(root,arg.corpus === 'terms' ? 'terms.json' : arg.corpus === 'sequence' ? 'sequence.json' : arg.corpus === 'human-terms' ? 'human-terms.json' : 'corpus.json'));
const rows = JSON.parse(corpusBytes).filter(x => x.split === split).slice(0, Number(arg.limit ?? Infinity));
const baselineFiles=new Map(arg.revision ? ['src/lib/speechTest/engines.ts','src/workers/moonshineSingleThreadWorker.ts','src/lib/interviewRoom/dialogue.ts','src/lib/interviewRoom/qualitySettings.ts'].map(file=>[path.resolve(file),execFileSync('git',['show',`${arg.revision}:${file}`],{encoding:'utf8'})]) : []);
if(split==='heldout' && !arg.revision && typeof JSON.parse(fs.readFileSync(path.join(root,'frozen-corpus.json'))).selection !== 'object') throw Error('Freeze selection before running heldout candidate');
const server = await createServer({ configFile:false, root:process.cwd(), server:{port:5193,strictPort:true}, optimizeDeps:{include:['@huggingface/transformers']}, esbuild:{target:'es2022'}, worker:{format:'es'}, plugins:[{name:'baseline',enforce:'pre',load(id){return baselineFiles.get(id.split('?')[0]);}},{name:'blank', configureServer(s){ s.middlewares.use((req,res,next)=>{if(req.url==='/stt-harness'){res.setHeader('Content-Type','text/html');res.end('<title>Speech accuracy harness</title>');}else next();});}}] });
let browser;
let limiter;
const output = { timestamp:new Date().toISOString(), model, device, mode, throttle, cpuLimit, split, corpusSHA256:crypto.createHash('sha256').update(corpusBytes).digest('hex'), corpus:arg.corpus ?? 'human', revision:arg.revision ?? 'working-tree', sourceHashes:Object.fromEntries(['src/lib/speechTest/engines.ts','src/workers/moonshineSingleThreadWorker.ts','src/lib/interviewRoom/dialogue.ts','src/lib/interviewRoom/qualitySettings.ts'].map(file=>[file,crypto.createHash('sha256').update(baselineFiles.get(path.resolve(file)) ?? fs.readFileSync(file)).digest('hex')])), environment:{node:process.version,transformers:JSON.parse(fs.readFileSync('node_modules/@huggingface/transformers/package.json')).version,rootOnnxruntimeWeb:JSON.parse(fs.readFileSync('node_modules/onnxruntime-web/package.json')).version}, results:[] };
output.modelVersions=JSON.parse(fs.readFileSync(path.join(root,'model-versions.json')));
const out = arg.out ?? `${root}/results-${split}-${model}-${mode}-${device}-${throttle}.json`;
try {
 await server.listen();
 browser = await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page = await browser.newPage();
 output.nonReadRequests=[];
 page.on('request',request=>{if(!['GET','HEAD','OPTIONS'].includes(request.method()))output.nonReadRequests.push({method:request.method(),origin:new URL(request.url()).origin,bodyBytes:request.postDataBuffer()?.length ?? 0});});
 await page.route('https://huggingface.co/**',route=>{
  const request=route.request();const url=request.url();const repo=new URL(url).pathname.split('/resolve/')[0].slice(1);const pin=output.modelVersions[repo]?.revision;
  return pin && url.includes('/resolve/main/') ? route.continue({url:url.replace('/resolve/main/',`/resolve/${pin}/`)}) : route.continue();
 });
 page.on('console',m=>{if(m.type()==='error') console.error(m.text().slice(0,250));});
 await page.goto('http://localhost:5193/stt-harness');
 if(cpuLimit < 100) {
   const browserCDP=await browser.newBrowserCDPSession();
   const {processInfo}=await browserCDP.send('SystemInfo.getProcessInfo');
   const renderers=processInfo.filter(p=>p.type==='renderer');
   if(renderers.length!==1) throw Error('Expected one renderer for CPU limit');
   output.environment.limitedRendererPID=renderers[0].id;
   limiter=spawn(arg.cpulimit ?? 'cpulimit',['-q','-l',String(cpuLimit),'-p',String(renderers[0].id)],{stdio:'ignore'});
   await new Promise((resolve,reject)=>{limiter.once('spawn',resolve);limiter.once('error',reject)});
 }
 const cdp = await page.context().newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
 output.environment.browser = browser.version();
 output.prepare = arg.prepare ?? 'trim';
 output.captureDrainMs=Number(arg.drain ?? 0);
 output.finalModel=arg.finalModel ?? null;
 output.environment.capability = await page.evaluate(async()=>({isolated:crossOriginIsolated, adapter: navigator.gpu ? (await navigator.gpu.requestAdapter())?.info ?? null : null}));
 if(output.environment.capability.isolated) throw Error('No-header test unexpectedly cross-origin isolated');
 output.environment.workerCalibration = await page.evaluate(async()=>{
 const worker=new Worker(URL.createObjectURL(new Blob(['onmessage=()=>{const t=performance.now();let x=0;for(let i=0;i<500000000;i++)x+=Math.sqrt(i);postMessage({ms:performance.now()-t,x})}'],{type:'text/javascript'})));
 return new Promise(resolve=>{worker.onmessage=e=>{worker.terminate();resolve(e.data)};worker.postMessage(1)});
 });
 console.log(JSON.stringify(output.environment));
 await page.evaluate(async ({model,device,mode,prepare,drain,finalModel,finalDevice,profile})=>{
   window.engineModule = await import('/src/lib/speechTest/engines.ts');
   window.engine = profile ? (await import('/src/lib/interviewRoom/qualitySettings.ts')).createASREngineForQuality(profile) : new window.engineModule.SingleThreadASREngine({modelId:'onnx-community/'+model,device,normalizeAudio:prepare==='normalize',captureDrainMs:Number(drain),finalModelId:finalModel ? 'onnx-community/'+finalModel : undefined,finalDevice:finalDevice ?? device});
   await window.engine.load();
   if(mode!=='live') {
     window.worker = window.engine.worker;
     let id=0;
     window.rpc = (op,payload)=>new Promise((resolve,reject)=>{
       const req=++id;const timer=setTimeout(()=>{window.worker.removeEventListener('message',listener);reject(Error('Worker timeout '+op));},180000);
       const listener=e=>{if(e.data.id!==req)return;clearTimeout(timer);window.worker.removeEventListener('message',listener);e.data.type==='error'?reject(Error(e.data.error)):resolve(e.data);};
       window.worker.addEventListener('message',listener);window.worker.postMessage({id:req,op,payload});
     });
     window.initResult = window.engine.getMetrics();
   }
 },{model,device,mode,prepare:arg.prepare ?? 'trim',drain:arg.drain ?? 0,finalModel:arg.finalModel,finalDevice:arg.finalDevice,profile:arg.profile});
 output.initialEngineMetrics=await page.evaluate(()=>window.engine.getMetrics());
 output.engineConfig=await page.evaluate(()=>({id:window.engine.id,modelId:window.engine.modelId,finalModelId:window.engine.finalModelId ?? null,device:window.engine.device,dtype:window.engine.dtype,expectedDownloadBytes:window.engine.expectedDownloadBytes}));
 output.profile=arg.profile ?? null;
 output.promptMode=arg.prompt ?? 'off';
 for (const row of rows) {
   if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.path))).digest('hex')!==row.sha256) throw Error('Corrupt audio '+row.id);
   const result=await page.evaluate(async({row,mode,prepare,promptMode})=>{
     const ctx=new AudioContext({sampleRate:16000});await ctx.resume();
     const bytes=await(await fetch('/scripts/speech-accuracy/'+row.path)).arrayBuffer();
     const audio=await ctx.decodeAudioData(bytes);const pcm=audio.getChannelData(0);
     if(mode==='live') {
       const engine=window.engine;engine.reset();
       const dest=ctx.createMediaStreamDestination();const source=ctx.createBufferSource();source.buffer=audio;source.connect(dest);
       await engine.start(dest.stream);
       const {questionSpeechPrompt}=await import('/src/lib/interviewRoom/speechPrompt.ts');
       engine.setQuestionPrompt?.(promptMode === 'question' ? questionSpeechPrompt(row.questionTitle ?? '') : promptMode === 'negative' ? questionSpeechPrompt('Explain XGBoost, RAG, LoRA, embeddings and BM25') : '');
       const start=performance.now();let first=null;let firstOutput=null;let acceptingLive=true;let live='';const updates=[];
       const off=engine.subscribe(m=>{if(m.partialText){if(firstOutput===null)firstOutput=performance.now()-start;if(acceptingLive){if(first===null)first=performance.now()-start;live=m.partialText;updates.push({atMs:performance.now()-start,text:live,inferenceMs:m.lagBehindSpeechMs});}}});
       await new Promise(resolve=>{source.onended=resolve;source.start();});
       const atEnd=live;acceptingLive=false;const end=performance.now();await engine.stop();const metrics=engine.getMetrics();off();dest.stream.getTracks().forEach(t=>t.stop());await ctx.close();
       return {text:metrics.batchTranscript || metrics.finalText,liveText:atEnd,firstWordMs:first,firstOutputMs:firstOutput,playbackWallMs:end-start,sourceSamples:audio.length,capturedSamples:engine.totalSessionSamples,finishMs:performance.now()-end,updates,metrics};
     }
     const {normalizeQuietAudio}=await import('/src/lib/speechTest/audioPreparation.ts');
     const prepared=prepare==='none'?pcm:window.engineModule.trimAudioSilence(prepare==='normalize'?normalizeQuietAudio(pcm):pcm);
     const start=performance.now();const res=await window.rpc('batch',{audio:prepared});await ctx.close();return {text:res.text,inferMs:res.inferMs,wallMs:performance.now()-start,sampleCount:res.sampleCount};
   },{row,mode,prepare:arg.prepare ?? 'trim',promptMode:arg.prompt ?? 'off'});
   const correctedText=await page.evaluate(async({text,id,title})=>{const {correctInterviewTerms}=await import('/src/lib/interviewRoom/dialogue.ts');return correctInterviewTerms(text,id,title);},{text:result.text ?? '',id:row.id,title:row.questionTitle});
   output.results.push({id:row.id,...result,correctedText});
   fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
   console.log(row.id, split === 'heldout' ? '[heldout transcript saved]' : JSON.stringify(result.text), Math.round(result.finishMs??result.wallMs));
 }
 if(output.nonReadRequests.length)throw Error('Unexpected non-read network requests; inspect recorded metadata');
 output.completed=true;fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
} catch(e) { output.error=String(e);fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');throw e; }
finally {limiter?.kill('SIGINT');await browser?.close();await server.close();}
