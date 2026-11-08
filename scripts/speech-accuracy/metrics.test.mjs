import {test} from 'vitest';
import assert from 'node:assert/strict';
import {wordErrors,termMatches,summarize} from './metrics.mjs';
test('insertions can exceed 100% WER and deletions are counted',()=>{
 assert.deepEqual(wordErrors('a','a b c'),{edits:2,words:1});
 assert.deepEqual(wordErrors('keep the last word','keep last'),{edits:2,words:4});
});
test('technical terms require whole tokens',()=>{
 assert.deepEqual(termMatches(['RAG','LoRA','BM25'],'ragged exploration BM25'),{matched:1,total:3});
});
test('technical orthographic variants are accepted without substring matches',()=>{
 assert.deepEqual(termMatches(['XGBoost','BM25'],'XG Boost and BM-25'),{matched:2,total:2});
});
test('missing term labels are unavailable and a split mismatch fails closed',()=>{
 const c=[{id:'one',split:'heldout',reference:'one two',terms:[]}];
 assert.equal(summarize(c,{split:'heldout',results:[{id:'one',text:'one'}]}).termAccuracyPct,null);
 assert.throws(()=>summarize(c,{split:'tune',results:[{id:'one',text:'one'}]}),/Split mismatch/);
});
