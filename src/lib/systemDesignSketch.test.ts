import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import references from '../data/systemDesignReferences.json';
import practice from '../data/interviewPractice.json';
import { normalizeSketch } from './systemDesignSketch';
import { mergeInterviewAttempts } from './interviewAttempts';

it('validates all 15 hand-authored reference diagrams against their model answers and round', () => {
  expect(Object.keys(references)).toHaveLength(15);
  const questions = practice.topics.flatMap(t => t.questions);
  for (const [id, diagram] of Object.entries(references)) {
    const q = questions.find(q => q.id === id)!;
    expect(q.rounds).toContain('system-design');
    expect(q.answer).toContain(diagram.answerExcerpt);
    expect(createHash('sha256').update(q.answer).digest('hex')).toBe(diagram.reviewedAnswerSha256);
    expect(normalizeSketch(diagram)?.nodes.length).toBe(diagram.nodes.length);
    expect(diagram.edges.length).toBeGreaterThan(0);
  }
});
it('preserves sketches through review updates, merge and JSON backup restore', () => {
  const sketch = Object.values(references)[0];
  const attempt = { id:'a', questionId:'q', time:1, transcript:'test', points:[], source:'rubric', status:'unchecked', sketch };
  const restored = mergeInterviewAttempts(JSON.parse(JSON.stringify([attempt])));
  expect(restored[0].sketch).toEqual(normalizeSketch(sketch));
  expect(mergeInterviewAttempts(restored, [{...attempt, status:'checked', revision:2}])[0].sketch).toEqual(normalizeSketch(sketch));
  expect(mergeInterviewAttempts([{...attempt, sketch:undefined}])[0].sketch).toBeUndefined();
});
it('omits malformed graphs without discarding the attempt', () => {
  const graph = {nodes:[{id:'n', label:'API',x:0,y:0}],edges:[]};
  expect(normalizeSketch(graph)).toEqual(graph);
  for (const bad of [{}, {...graph,nodes:[...graph.nodes,...graph.nodes]}, {...graph,edges:[{from:'n',to:'missing'}]},
    {...graph,nodes:[{...graph.nodes[0],x:NaN}]}, {...graph,nodes:Array(25).fill(graph.nodes[0])}]) expect(normalizeSketch(bad)).toBeUndefined();
});
