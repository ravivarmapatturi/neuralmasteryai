import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='scripts/speech-accuracy';
let total=0;
for(const name of ['corpus','human-terms','terms','sequence']){
 const rows=JSON.parse(fs.readFileSync(`${root}/${name}.json`));
 for(const row of rows){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${root}/${row.path}`)).digest('hex'),row.sha256,row.id);
  assert(row.license && row.source || row.sourceClipIds);
  if(name==='human-terms'){
   assert.equal(row.split,'heldout');assert.equal(row.realSpeech,true);
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${root}/sources/${row.id}.vtt`)).digest('hex'),row.captionSHA256);
  }
  total++;
 }
 if(name==='human-terms')assert.deepEqual(new Set(rows.flatMap(r=>r.terms)),new Set(['XGBoost','RAG','LoRA','embeddings','BM25']));
}
console.log(`Verified ${total} audio hashes, including all five human technical terms and their caption hashes.`);
