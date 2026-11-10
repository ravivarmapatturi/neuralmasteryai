// Links every interview question to the learn pages that teach it, for the "I don't know this yet" option.
// Embeds each learn page (title, description, section headings) and each question (title and key points)
// with all-MiniLM-L6-v2 and keeps the closest pages. Runs on a GitHub runner (.github/workflows/learn-links.yml).
// Usage: node scripts/interview-learn-links.mjs   (writes src/data/interviewLearnLinks.json)
import fs from 'node:fs';
import { pipeline } from '@huggingface/transformers';

const meta = JSON.parse(fs.readFileSync('src/data/pageMeta.generated.json', 'utf8')).pages;
const practice = JSON.parse(fs.readFileSync('src/data/interviewPractice.json', 'utf8'));
const SKIP = new Set(['interview-prep', 'practice-problems', 'cli-reference', 'getting-started']);

const pages = Object.entries(meta)
  .filter(([, p]) => !SKIP.has(p.section) && p.title && !/roadmap|simulator|case studies|overview|^guides$|cheat ?sheet|hub$/i.test(p.title))
  .map(([path, p]) => {
    const file = `src/content/docs/${p.slug}.mdx`;
    const headings = fs.existsSync(file) ? (fs.readFileSync(file, 'utf8').match(/^#{2,3} .+$/gm) ?? []).map(h => h.replace(/^#+ /, '')).join('; ') : '';
    return { path, title: p.title, text: `${p.title}. ${p.description ?? ''} ${headings}`.slice(0, 1200) };
  });
const questions = practice.topics.flatMap(t => t.questions.map(q => ({ id: q.id, text: `${q.title} ${(q.keyPoints ?? []).join('. ')}`.slice(0, 1200) })));

const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
async function vectors(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const t = await embed(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
    out.push(...t.tolist());
    console.log(`${Math.min(i + 32, texts.length)}/${texts.length}`);
  }
  return out;
}
const pageVecs = await vectors(pages.map(p => p.text));
const questionVecs = await vectors(questions.map(q => q.text));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

const links = {};
questions.forEach((q, qi) => {
  const scored = pages.map((p, pi) => ({ path: p.path, title: p.title, score: dot(questionVecs[qi], pageVecs[pi]) })).sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  links[q.id] = scored.filter((p, i) => i < 3 && p.score >= Math.max(0.35, best - 0.08)).map(({ path, title }) => ({ path, title }));
});
fs.writeFileSync('src/data/interviewLearnLinks.json', JSON.stringify(links) + '\n');
const counts = Object.values(links).map(l => l.length);
console.log(`${counts.length} questions, ${counts.filter(Boolean).length} with at least one learn page`);
