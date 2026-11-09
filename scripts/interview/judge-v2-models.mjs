// Offline mirror of exact upstream files, outside the repository. No conversion.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
export const root = process.env.JUDGE_MODEL_CACHE ?? '/tmp/neuralmastery-judge-v2-models';
export const models = {
 embed: {id:'Xenova/all-MiniLM-L6-v2',revision:'751bff37182d3f1213fa05d7196b954e230abad9',file:'model_quantized.onnx',dtype:'q8'},
 baseline: {id:'Xenova/mobilebert-uncased-mnli',revision:'8b0ea66ab7b190bba77418ba03b67d69cfc9a1ee',file:'model_quantized.onnx',dtype:'q8'},
 marco: {id:'Xenova/ms-marco-MiniLM-L-6-v2',revision:'a09144355adeed5f58c8ed011d209bf8ee5a1fec',file:'model_quantized.onnx',dtype:'q8'},
 stsb: {id:'cross-encoder/stsb-TinyBERT-L4',revision:'1f478482145797a0cac02d6b9ab3c65c9d25fb1e',file:'model_qint8_avx512.onnx',dtype:'fp32',model_file_name:'model_qint8_avx512'},
 nliSmall: {id:'Xenova/nli-deberta-v3-small',revision:'6bc2a55c7c0f7e2bc68de60bb248e523e2612abb',file:'model_quantized.onnx',dtype:'q8'},
 nli: {id:'Xenova/nli-deberta-v3-xsmall',revision:'2a4f614a701367a02d51389039afc998faeda637',file:'model_quantized.onnx',dtype:'q8'},
};
async function prepare() {
 const manifest={preparedAt:new Date().toISOString(),models:{}};
 for(const [key, config] of Object.entries(models)) {
  const response=await fetch(`https://huggingface.co/api/models/${config.id}?blobs=true`);
  if(!response.ok)throw Error(`${config.id}: ${response.status}`);
  const info=await response.json();
  const revision=config.revision??info.sha;
  const files=info.siblings.filter(f=>/^[^/]+\.json$/.test(f.rfilename)||f.rfilename===`onnx/${config.file}`);
  const row={...config,revision,licence:info.cardData?.license??null,files:[]};
  for(const file of files) {
   const dest=path.join(root,config.id,file.rfilename);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   if(!fs.existsSync(dest)||fs.statSync(dest).size!==file.size) {
    const url=`https://huggingface.co/${config.id}/resolve/${revision}/${file.rfilename}`;
    const r=await fetch(url); if(!r.ok)throw Error(`${url}: ${r.status}`);
    await pipeline(Readable.fromWeb(r.body),fs.createWriteStream(dest+'.part'));
    fs.renameSync(dest+'.part',dest);
   }
   const hash=createHash('sha256');for await(const chunk of fs.createReadStream(dest))hash.update(chunk);
   row.files.push({file:file.rfilename,bytes:fs.statSync(dest).size,sha256:hash.digest('hex')});
  }
  manifest.models[key]=row;
  console.log(`Prepared ${key}: ${row.files.reduce((n,f)=>n+f.bytes,0)} bytes at ${revision}`);
 }
 fs.writeFileSync('docs/evidence/interview/judge-v2-model-manifest.json',JSON.stringify(manifest,null,2)+'\n');
}
function serve() {
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const runtime=pathname.startsWith('/runtime/');
  const base=runtime?path.resolve('node_modules/onnxruntime-web/dist'):root;
  const file=path.resolve(base,'.'+(runtime?pathname.slice('/runtime'.length):pathname));
  if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) {res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.json')?'application/json':(file.endsWith('.mjs')||file.endsWith('.ts'))?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');
  res.setHeader('Content-Length',fs.statSync(file).size);
  fs.createReadStream(file).pipe(res);
 });
 server.listen(5188,'127.0.0.1',()=>console.log('Pinned model mirror: http://127.0.0.1:5188'));
}
if(process.argv[2]==='compile') {
 const {build}=await import('esbuild');
 await build({entryPoints:['scripts/interview/judge-v2-worker.ts'],outfile:path.join(root,'scripts/interview/judge-v2-worker.ts'),bundle:true,format:'esm',platform:'browser',target:'es2022'});
 console.log('Compiled experiment worker for the static mirror');
}
else if(process.argv[2]==='prepare')await prepare();
else if(process.argv[2]==='serve')serve();
