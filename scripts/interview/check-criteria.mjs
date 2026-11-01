#!/usr/bin/env node
// Quality gate for src/data/interviewCriteria.json. Fails on criteria that are
// copied answer text rather than short, checkable points. See
// .agents/skills/interview-question/SKILL.md.
import { readFileSync } from 'node:fs';

const criteria = JSON.parse(readFileSync(new URL('../../src/data/interviewCriteria.json', import.meta.url)));
const { questions } = JSON.parse(readFileSync(new URL('../../src/data/interviewCatalog.generated.json', import.meta.url)));
const byId = new Map(questions.map(q => [q.id, q]));
const GENERIC = /assumptions does your answer depend on|answer the question directly|explain the mechanism or calculation behind/i;
const LABEL = /^[A-Z][a-z]+:\s/; // "States: ...", "Explains: ..."
const VERB = /^[A-Z][a-z]+s\b/; // starts with a third-person verb: "Computes", "Names"
const problems = [];

for (const [id, entry] of Object.entries(criteria)) {
  if (id === '_about') continue;
  const q = byId.get(id);
  if (!q) { problems.push(`${id}: no such question`); continue; }
  const n = entry.criteria?.length ?? 0;
  const [min, max] = q.kind === 'calculation' ? [2, 4] : [3, 5];
  if (n < min || n > max) problems.push(`${id}: ${n} criteria (want ${min}-${max} for ${q.kind})`);
  const answer = q.answer.replace(/\s+/g, ' ').toLowerCase();
  for (const c of entry.criteria ?? []) {
    if (LABEL.test(c)) problems.push(`${id}: labelled fragment, rewrite as a checkable point: "${c.slice(0, 60)}…"`);
    else if (!VERB.test(c)) problems.push(`${id}: should start with a verb like "Explains" or "Computes": "${c.slice(0, 60)}…"`);
    if (c.length > 160) problems.push(`${id}: ${c.length} chars (max 160): "${c.slice(0, 60)}…"`);
    // Copied text: a 14-word run lifted verbatim from the model answer (short shared phrases and arithmetic are fine).
    const words = c.toLowerCase().replace(/[^\w\s×/.-]/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i + 14 <= words.length; i++) {
      const run = words.slice(i, i + 14).join(' ');
      if (!/\d/.test(run) && answer.includes(run)) { problems.push(`${id}: copies the answer verbatim: "${run}"`); break; }
    }
    if (GENERIC.test(c)) problems.push(`${id}: generic criterion`);
  }
  if (!entry.followup || GENERIC.test(entry.followup)) problems.push(`${id}: missing or generic follow-up`);
}
const covered = Object.keys(criteria).filter(k => k !== '_about').length;
console.log(`check-criteria: ${covered} of ${questions.length} questions have criteria; ${problems.length} problem(s).`);
const all = process.argv.includes('--all');
for (const p of all ? problems : problems.slice(0, 40)) console.log('  ' + p);
if (!all && problems.length > 40) console.log(`  …and ${problems.length - 40} more`);
process.exit(problems.length ? 1 : 0);
