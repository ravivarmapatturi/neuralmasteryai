/** Project the existing MDX banks into the Interview UI. No content is copied by hand. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import matter from 'gray-matter';
const root = resolve(import.meta.dirname, '../..');
const folder = resolve(root, 'src/content/docs/interview-prep');
const parser = unified().use(remarkParse).use(remarkMdx);
const questions = [], guides = [];
function attr(node, name) {
  const value = node.attributes.find(a => a.name === name)?.value;
  if (value && typeof value === 'object') return JSON.parse(value.value);
  return value;
}
for (const filename of readdirSync(folder).filter(f => f.endsWith('.mdx')).sort()) {
  const slug = filename.replace(/\.mdx$/, '');
  const { data, content } = matter(readFileSync(resolve(folder, filename), 'utf8'));
  const tree = parser.parse(content);
  const guide = { slug, title: data.title, description: data.description, route: `/docs/interview-prep/${slug}`, position: data.sidebar_position ?? 99 };
  guides.push(guide);
  let section = data.title;
  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) section = node.children.map(n => n.value ?? '').join('');
    if (!['QA', 'Choice', 'Calc'].includes(node.name)) continue;
    const title = attr(node, 'q');
    if (typeof title !== 'string' || !title.trim() || !node.children.length) throw new Error(`Incomplete question in ${filename}`);
    const id = attr(node, 'id') ?? createHash('sha1').update(title).digest('hex').slice(0,12);
    const item = { id: `${slug}:${id}`, bank: slug, area: data.title.replace(/ Interview Questions.*$/, '').replace('Interview Q&A Quick Reference', 'LLMs and agents'), section, title, context: 'Answer in your own words, then compare with the worked explanation.', criteria: ['Answer the question directly and accurately.', 'Explain the mechanism or calculation behind your answer.', 'Address the assumptions and trade-offs that matter here.'], answer: content.slice(node.children[0].position.start.offset, node.children.at(-1).position.end.offset).trim(), followup: 'What assumptions does your answer depend on, and when would you choose a different approach?', sourceRoute: guide.route, kind: node.name === 'Choice' ? 'choice' : node.name === 'Calc' ? 'calculation' : 'explanation' };
    if (node.name === 'Choice') {
      item.options = attr(node, 'options'); item.correctOption = attr(node, 'answer');
      if (!Array.isArray(item.options) || !Number.isInteger(item.correctOption) || !item.options[item.correctOption]) throw new Error(`Invalid options: ${item.id}`);
    }
    if (node.name === 'Calc') { item.numericAnswer = attr(node, 'answer'); item.tolerance = attr(node, 'tolerance') ?? 0.02; item.unit = attr(node, 'unit') ?? ''; if (!Number.isFinite(item.numericAnswer) || !Number.isFinite(item.tolerance)) throw new Error(`Invalid numeric answer: ${item.id}`); }
    questions.push(item);
  }
}
if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error('Duplicate question IDs');
const result = JSON.stringify({ questions, guides: guides.sort((a,b) => a.position-b.position) }, null, 2) + '\n';
const output = resolve(root, 'src/data/interviewCatalog.generated.json');
if (process.argv.includes('--check')) { if (readFileSync(output, 'utf8') !== result) throw new Error('Interview catalogue is stale. Run npm run generate:interviews.'); }
else writeFileSync(output, result);
console.log(`Interview catalogue: ${questions.length} questions, ${guides.length} preparation guides.`);
