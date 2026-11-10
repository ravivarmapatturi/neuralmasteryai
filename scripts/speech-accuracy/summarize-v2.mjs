// Re-score stored transcripts against the manifests and print one table row per run and group.
// Usage: node scripts/speech-accuracy/summarize-v2.mjs scripts/speech-accuracy/tier-v2-*.json
import fs from 'node:fs';
import { wordErrors, termMatches } from './metrics.mjs';
const dir = 'scripts/speech-accuracy/';
const rows = new Map(['heldout-v2', 'human-terms', 'terms'].flatMap(name => JSON.parse(fs.readFileSync(`${dir}${name}.json`)).map(row => [row.id, { ...row, corpus: name }])));
console.log('| Run | Prompt | Group | Clips | Word errors | Word error rate | Terms heard | Prompt terms invented | Mean seconds per clip |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const file of process.argv.slice(2)) {
  const run = JSON.parse(fs.readFileSync(file));
  const promptTerms = run.promptText ? run.promptText.replace(/\.$/, '').split(', ') : [];
  const groups = new Map();
  for (const result of run.results) {
    const row = rows.get(result.id);
    if (!row) throw Error('Unknown clip ' + result.id);
    const name = row.corpus === 'heldout-v2' ? `${row.accent}, ${row.condition}` : row.corpus === 'terms' ? 'Synthetic voice, ML terms' : 'Conference talk, ML terms';
    const g = groups.get(name) ?? { clips: 0, edits: 0, words: 0, matched: 0, total: 0, invented: 0, ms: 0, scoreWords: row.corpus !== 'human-terms' };
    const e = wordErrors(row.reference, result.text ?? '');
    const t = termMatches(row.terms ?? [], result.text ?? '');
    // A prompt term counts as invented when the transcript has it and the reference does not.
    const invented = promptTerms.filter(term => termMatches([term], result.text ?? '').matched && !termMatches([term], row.reference).matched).length;
    groups.set(name, { ...g, clips: g.clips + 1, edits: g.edits + e.edits, words: g.words + e.words, matched: g.matched + t.matched, total: g.total + t.total, invented: g.invented + invented, ms: g.ms + (result.inferMs ?? result.wallMs ?? 0) });
  }
  for (const [name, g] of groups) {
    console.log(`| ${run.id} | ${run.prompt} | ${name} | ${g.clips} | ${g.scoreWords ? `${g.edits} of ${g.words}` : 'not scored'} | ${g.scoreWords ? (100 * g.edits / g.words).toFixed(1) + '%' : 'not scored'} | ${g.total ? `${g.matched} of ${g.total}` : 'none labelled'} | ${promptTerms.length ? g.invented : 'no prompt'} | ${(g.ms / g.clips / 1000).toFixed(1)} |`);
  }
}
