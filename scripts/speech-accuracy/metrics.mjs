// WER deliberately does not apply domain corrections to references or hypotheses.
// Contractions are the one exception: "it's" and "it is" are the same spoken answer, so both sides are expanded.
const contractions = {
 "it's":'it is',"that's":'that is',"there's":'there is',"what's":'what is',"here's":'here is',"let's":'let us',
 "i'm":'i am',"you're":'you are',"we're":'we are',"they're":'they are',
 "i've":'i have',"you've":'you have',"we've":'we have',"they've":'they have',
 "i'll":'i will',"you'll":'you will',"we'll":'we will',"they'll":'they will',"it'll":'it will',
 "isn't":'is not',"aren't":'are not',"wasn't":'was not',"weren't":'were not',"don't":'do not',"doesn't":'does not',"didn't":'did not',
 "can't":'can not',"cannot":'can not',"couldn't":'could not',"won't":'will not',"wouldn't":'would not',"shouldn't":'should not',"haven't":'have not',"hasn't":'has not',
};
export function words(text) {
 return text.normalize('NFKC').replace(/[\u2018\u2019]/g,"'").toLowerCase().replace(/[^a-z0-9']/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).flatMap(w=>(contractions[w]??w).split(' '));
}
export function wordErrors(reference,hypothesis) {
 const a=words(reference),b=words(hypothesis);let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));prev=row;}
 return {edits:prev[b.length],words:a.length};
}
const termVariants = { xgboost: ['XGBoost','XG Boost','X G Boost'], bm25: ['BM25','BM 25','B M 25'] };
export function termMatches(terms,hypothesis) {
 const hyp=' '+words(hypothesis).join(' ')+' ';
 return {matched:terms.filter(t=>(termVariants[t.toLowerCase()] ?? [t]).some(variant=>hyp.includes(' '+words(variant).join(' ')+' '))).length,total:terms.length};
}
export function summarize(corpus,run,key='text') {
 let edits=0,count=0,matched=0,total=0;const byId=new Map(corpus.map(r=>[r.id,r]));
 for(const result of run.results){const row=byId.get(result.id);if(!row||row.split!==run.split)throw Error('Split mismatch');const e=wordErrors(row.reference,result[key]??'');edits+=e.edits;count+=e.words;const t=termMatches(row.terms,result[key]??'');matched+=t.matched;total+=t.total;}
 const mean=key=>{const nums=run.results.map(r=>r[key]).filter(x=>typeof x==='number');return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;};
 return {clips:run.results.length,edits,referenceWords:count,werPct:run.corpus==='human-terms'?null:100*edits/count,...(run.corpus==='human-terms'?{captionAgreementWER:100*edits/count}:{}),termsMatched:matched,termsTotal:total,termAccuracyPct:total?100*matched/total:null,liveOutputClips:run.results.filter(r=>typeof r.firstWordMs==='number').length,meanFirstWordMs:mean('firstWordMs'),meanFinishMs:mean('finishMs'),meanInferenceMs:mean('inferMs')};
}
