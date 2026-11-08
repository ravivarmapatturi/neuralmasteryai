import {test,expect} from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const root=path.resolve('scripts/speech-accuracy');
const bytes=fs.readFileSync(path.join(root,'corpus.json'));
const rows=JSON.parse(bytes);
const frozen=JSON.parse(fs.readFileSync(path.join(root,'frozen-corpus.json')));
test('the fixed human corpus has 36 distinct, licensed, intact utterances with disjoint speakers and references',()=>{
 expect(rows).toHaveLength(36);
 expect(new Set(rows.map(r=>r.id)).size).toBe(36);
 expect(new Set(rows.map(r=>r.reference)).size).toBe(36);
 expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(frozen.corpusSHA256);
 const sets=['tune','heldout'].map(split=>new Set(rows.filter(r=>r.split===split).map(r=>r.speaker)));
 expect([...sets[0]].filter(s=>sets[1].has(s))).toEqual([]);
 for(const split of ['tune','heldout']){
  expect(rows.filter(r=>r.split===split)).toHaveLength(18);
  expect(rows.some(r=>r.split===split&&r.accent==='Indian')).toBe(true);
 }
 for(const row of rows){
  expect(row.license).toBe('CC-BY-4.0');expect(row.sourceMember).toMatch(/\.wav$/);
  expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.path))).digest('hex')).toBe(row.sha256);
 }
});
