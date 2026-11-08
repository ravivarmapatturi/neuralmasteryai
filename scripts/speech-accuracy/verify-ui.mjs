// Focused UI/lifecycle test with a protocol stub, not ASR accuracy evidence.
import {createServer} from 'vite';
import {chromium} from 'playwright';
import fs from 'node:fs';
const server=await createServer({server:{port:5194,strictPort:true}});
let browser;
const evidence={kind:'stub-worker UI and fake-microphone test',views:[],checks:[]};
try {
 await server.listen();
 browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 for(const theme of ['light','dark'])for(const width of [375,1440]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['microphone']});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.addInitScript(theme=>{
    localStorage.setItem('neural-mastery-theme',theme);
    window.micCalls=0;
    window.speechAudio=[];window.audioContextRates=[];window.audioPlays=[];
    const nativePlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){window.audioPlays.push({loop:this.loop,micActive:window.micTracks?.some(track=>track.readyState==='live')??false});return nativePlay.call(this)};
    const NativeAudio=window.Audio;
    window.Audio=function(...args){const audio=new NativeAudio(...args);window.speechAudio.push(audio);return audio};
    const NativeContext=window.AudioContext;
    window.AudioContext=class extends NativeContext {constructor(options){super(options);window.audioContextRates.push(this.sampleRate)}};
    window.readyEvents=[];
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker { constructor(url,options){super(url,options);this.addEventListener('message',event=>{if(event.data.type==='init_done'){window.readyEvents.push({url:String(url),at:Date.now()});if(String(url).includes('moonshineSingleThreadWorker')&&!window.workerReadyAt)window.workerReadyAt=Date.now()}});} };
    const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=(...args)=>{window.micCalls++;window.micRequestedAt=Date.now();window.requestedConstraints=args[0];return get(...args).then(stream=>{window.micTracks=stream.getTracks();window.actualTrackSettings=stream.getAudioTracks()[0].getSettings();return stream})};
  },theme);
  await page.route('**/audio/**',route=>route.fulfill({contentType:'audio/wav',body:fs.readFileSync('scripts/speech-accuracy/audio/p248_030.wav')}));
  await page.route('**/src/workers/moonshineSingleThreadWorker.ts?*',route=>route.fulfill({contentType:'text/javascript',body:`
    self.onmessage=({data:{id,op}})=>{
      if(op==='init'){
        setTimeout(()=>postMessage({type:'progress',file:'model.onnx',loaded:14000000,total:28000000}),500);
        setTimeout(()=>postMessage({id,type:'init_done',device:'wasm'}),4000);
      } else if(op==='batch'){postMessage({id,type:'model_ready',device:'wasm'});setTimeout(()=>postMessage({id,type:'batch_result',text:'Final test words',inferMs:10}),3000);} else if(op==='transcribe'||op==='commit')setTimeout(()=>postMessage({id,type:op==='transcribe'?'result':op+'_result',text:'Test words',inferMs:10}),20);
    };
  `}));
  await page.goto('http://localhost:5194/interview');
  await page.waitForFunction(()=>window.speechAudio.some(audio=>audio.loop && audio.getAttribute('src')));
  await page.evaluate(async()=>{await window.speechAudio.find(audio=>audio.loop && audio.getAttribute('src')).play()});
  await page.locator('#start-topic').click();
  await page.waitForFunction(()=>window.speechAudio.some(audio=>!audio.loop && audio.currentTime>0));
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByRole('status').filter({hasText:/Preparing speech recognition/}).waitFor();
  if(await page.evaluate(()=>window.micCalls>0 && (!window.workerReadyAt || window.micRequestedAt<window.workerReadyAt)))throw Error('Mic acquired before model ready');
  await page.getByRole('status').filter({hasText:/Listening/}).waitFor({timeout:20000});
  if(!await page.evaluate(()=>window.speechAudio.every(audio=>audio.paused)))throw Error('Question or focus audio still playing during microphone capture');
  await page.waitForTimeout(700);
  await page.locator('#done').click();
  await page.getByRole('heading',{name:'Your answer',exact:true}).waitFor({timeout:20000});
  await page.getByRole('heading',{name:'Model answer',exact:true}).waitFor({timeout:1000});
  await page.getByRole('status').filter({hasText:'Finalizing your transcript'}).waitFor({timeout:1000});
  await page.waitForFunction(()=>window.micTracks.every(track=>track.readyState==='ended'),{timeout:1500});
  await page.waitForFunction(()=>document.querySelector('.si-yours')?.textContent==='Final test words',{timeout:10000});
  if(await page.evaluate(()=>window.audioPlays.some(event=>!event.loop&&event.micActive)))throw Error('Answer audio started before microphone release');
  if(await page.locator('.si-note, .si-keys').count())throw Error('Fine print remains');
  await page.waitForFunction(()=>window.speechAudio.some(audio=>audio.loop&&!audio.paused));
  const view=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,constraints:window.requestedConstraints,actualTrackSettings:window.actualTrackSettings,audioContextRates:window.audioContextRates,workerReadyAt:window.workerReadyAt,readyEvents:window.readyEvents,micRequestedAt:window.micRequestedAt,theme:document.documentElement.dataset.theme}));
  if(!view.workerReadyAt || view.micRequestedAt<view.workerReadyAt)throw Error('Microphone preceded ready event: '+JSON.stringify(view));
  if(!view.audioContextRates.includes(16000))throw Error('No 16 kHz capture AudioContext');
  if(view.scrollWidth>width)throw Error('Overflow '+JSON.stringify(view));
  if(errors.length)throw Error(errors.join('\n'));
  if(view.theme!==theme)throw Error('Theme not applied');
  fs.mkdirSync('scratch/stt-ui',{recursive:true});
  await page.screenshot({path:`scratch/stt-ui/${theme}-${width}.png`,fullPage:true});
  evidence.views.push({...view,requestedTheme:theme,errors});
  await context.close();
 }
 // Cancellation while downloading and permission-denied typed fallback.
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.addInitScript(()=>{
   window.micCalls=0;
   navigator.mediaDevices.getUserMedia=async()=>{window.micCalls++;throw new DOMException('Denied for test','NotAllowedError')};
 });
 await page.route('**/audio/interview-voice/**',route=>route.fulfill({contentType:'audio/wav',body:fs.readFileSync('scripts/speech-accuracy/audio/p248_030.wav')}));
 await page.route('**/src/workers/moonshineSingleThreadWorker.ts?*',route=>route.fulfill({contentType:'text/javascript',body:`self.onmessage=({data:{id,op}})=>{if(op==='init')setTimeout(()=>postMessage({id,type:'init_done',device:'wasm'}),4000);}` }));
 await page.goto('http://localhost:5194/interview');
 await page.locator('#start-topic').click();
 await page.getByRole('button',{name:'Skip to answering'}).click();
 await page.getByRole('button',{name:'← Topics',exact:true}).click();
 await page.waitForTimeout(4500);
 if(await page.evaluate(()=>window.micCalls)!==0)throw Error('Cancelled start acquired microphone');
 await page.locator('#start-topic').click();
 await page.getByRole('button',{name:'Skip to answering'}).click();
 await page.getByRole('textbox',{name:'Your answer'}).waitFor({timeout:15000});
 await page.getByRole('textbox',{name:'Your answer'}).fill('Typed answer');
 await page.locator('#done').click();
 await page.getByRole('heading',{name:'Your answer',exact:true}).waitFor();
 if(await page.locator('.si-yours').innerText()!=='Typed answer')throw Error('Typed fallback lost answer');
 evidence.checks.push('cancelled load never acquired microphone; denied microphone retained typed answer');
 await context.close();
 evidence.checks.push('4 theme/viewport combinations: loading before microphone, listening, immediate model answer with deferred final transcript, capture stopped before answer playback, no fine print, final transcript, question and focus audio stopped during capture, focus audio restored afterwards, 48 kHz fake device to 16 kHz context, requested audio constraints, no horizontal overflow, no uncaught page errors');
 fs.writeFileSync('scripts/speech-accuracy/ui-verification.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence));
}finally{await browser?.close();await server.close()}
