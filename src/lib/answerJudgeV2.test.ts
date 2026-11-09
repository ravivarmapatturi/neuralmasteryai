import {expect,it} from 'vitest';
import {collectV2Scores,decideV2,groundTruthPoints,type V2Raw} from './answerJudgeV2';
const thresholds={similarity:0.35,cross:0.5,entails:0.7,conflict:0.8};
const raw=(entails=0.9,conflicts=0.01,cross=0.9):V2Raw=>({points:[{point:'A claim',candidates:[{text:'My evidence',similarity:0.8,cross,entails,conflicts}]}],reverse:[]});
it('requires entailment as well as cross-encoder relevance and returns actual user evidence',()=>{
 expect(decideV2(raw(),thresholds).points[0]).toMatchObject({verdict:'covered',evidence:'My evidence'});
 expect(decideV2(raw(0.2),thresholds).points[0].verdict).toBe('missed');
 expect(decideV2(raw(0.9,0.01,0.2),thresholds).points[0].verdict).toBe('missed');
});
it('vetoes a detected point when another candidate contradicts it',()=>{
 const input=raw();input.points[0].candidates.push({text:'The contrary claim',similarity:0.7,cross:0.9,entails:0.01,conflicts:0.95});
 expect(decideV2(input,thresholds).points[0]).toMatchObject({verdict:'conflict',evidence:'The contrary claim'});
});
it('uses the rubric when present and otherwise uses at most six model-answer sentences',()=>{
 expect(groundTruthPoints({answer:'Alpha is correct. Beta is correct.',keyPoints:['Our rubric']})).toEqual(['Our rubric']);
 expect(groundTruthPoints({answer:'Alpha is correct. Beta is correct.'})).toEqual(['Alpha is correct.','Beta is correct.']);
});
it('collects forward and reverse relations in their correct directions and keeps at most three candidates',async()=>{
 const nliPairs:[string,string][][]=[];
 const result=await collectV2Scores('Alpha has a property. This produces a consequence. An unrelated sentence appears.', ['The ground truth claim'],{
  embed:async texts=>texts.map(()=>[1]),cross:async pairs=>pairs.map(()=>0.9),
  nli:async pairs=>{nliPairs.push(pairs);return pairs.map(()=>({entails:0.9,conflicts:0.01}));},
 });
 expect(result.points[0].candidates).toHaveLength(3);
 expect(nliPairs[0][0]).toEqual(['Alpha has a property.','The ground truth claim']);
 expect(nliPairs[1][0]).toEqual(['The ground truth claim','Alpha has a property.']);
 expect(result.reverse).toHaveLength(3);
});
it('handles an empty answer without inference and exposes unmatched reverse signals without calling them errors',async()=>{
 const fail=async()=>{throw Error('must not infer');};
 expect(await collectV2Scores('', ['A claim'],{embed:fail,cross:fail,nli:fail})).toEqual({points:[{point:'A claim',candidates:[]}],reverse:[]});
 const input=raw();input.reverse=[{text:'Extra detail',against:'A claim',similarity:0.2,cross:0.2,entails:0.1,conflicts:0.1}];
 expect(decideV2(input,thresholds).reverse[0].signal).toBe('unmatched');
});
