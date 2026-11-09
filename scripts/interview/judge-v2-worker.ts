/// <reference lib="webworker" />
// Experiment-only worker, never imported by the live interview screen.
import { AutoModelForSequenceClassification, AutoTokenizer, env, pipeline } from '@huggingface/transformers';
import { collectV2Scores, groundTruthPoints } from '../../src/lib/answerJudgeV2';
import { judgePracticeAnswer } from '../../src/lib/answerJudge';
let embedder: any; let crossModel: any; let crossTokenizer: any; let nliModel: any; let nliTokenizer: any;
let candidate = '';
const download = new Map<string, number>();
const progress_callback = (event: any) => {
  if(event.status==='progress' && event.total) download.set(`${event.name}/${event.file}`, event.total);
};
async function classify(model: any, tokenizer: any, pairs: [string,string][]) {
  const scores: number[][]=[];
  for(const [text,text_pair] of pairs) {
    const result=await model(tokenizer(text,{text_pair,truncation:true,max_length:256}));
    scores.push(Array.from(result.logits.data) as number[]);
  }
  return scores;
}
async function embed(texts: string[]) {
  const result=await embedder(texts,{pooling:'mean',normalize:true}); return result.tolist();
}
async function cross(pairs: [string,string][]) {
  const rows=await classify(crossModel,crossTokenizer,pairs);
  // Both exports expose regression logits. STS-B uses sigmoid in CrossEncoder,
  // while MARCO uses identity. A monotone sigmoid gives a common bounded axis;
  // thresholds are fitted separately, never interpreted as probabilities.
  return rows.map(row=>1/(1+Math.exp(-row[0])));
}
async function nli(pairs: [string,string][]) {
  const labels=nliModel.config.id2label as Record<string,string>;
  return (await classify(nliModel,nliTokenizer,pairs)).map(row=>{
    const max=Math.max(...row);const exp=row.map(value=>Math.exp(value-max));const total=exp.reduce((a,b)=>a+b,0);
    const values:Record<string,number>={}; exp.forEach((value,i)=>{values[labels[i].toLowerCase()]=value/total;});
    if(values.entailment===undefined||values.contradiction===undefined)throw Error('Unknown NLI labels');
    return {entails:values.entailment,conflicts:values.contradiction};
  });
}
self.onmessage=async(event:MessageEvent)=>{
  const {id,op,payload}=event.data;
  try {
    let result:unknown;
    if(op==='load') {
      candidate=payload.candidate;
      env.allowLocalModels=true;env.allowRemoteModels=false;env.useBrowserCache=false;
      env.localModelPath='http://127.0.0.1:5188/';
      env.backends.onnx.wasm.numThreads=1;
      env.backends.onnx.wasm.wasmPaths='http://127.0.0.1:5188/runtime/';
      const manifest=payload.manifest.models;
      const options=(key:string)=>({device:'wasm' as const,dtype:manifest[key].dtype,progress_callback,
        ...(manifest[key].model_file_name?{model_file_name:manifest[key].model_file_name}:{})});
      embedder=await pipeline('feature-extraction',manifest.embed.id,options('embed'));
      const nliKey=candidate==='baseline'?'baseline':'nli';
      nliTokenizer=await AutoTokenizer.from_pretrained(manifest[nliKey].id,{progress_callback});
      nliModel=await AutoModelForSequenceClassification.from_pretrained(manifest[nliKey].id,options(nliKey));
      if(candidate!=='baseline') {
        crossTokenizer=await AutoTokenizer.from_pretrained(manifest[candidate].id,{progress_callback});
        crossModel=await AutoModelForSequenceClassification.from_pretrained(manifest[candidate].id,options(candidate));
      }
      result={candidate,downloads:[...download],labels:nliModel.config.id2label};
    } else if(op==='score') {
      const start=performance.now();
      result=candidate==='baseline'
        ? {judgement:await judgePracticeAnswer(payload.answer,payload.question,{embed,nli}),milliseconds:performance.now()-start}
        : {raw:await collectV2Scores(payload.answer,groundTruthPoints(payload.question),{embed,cross,nli}),milliseconds:performance.now()-start};
    } else throw Error('Unknown experiment operation');
    self.postMessage({id,ok:true,result});
  } catch(error) {self.postMessage({id,ok:false,error:String(error)});}
};
