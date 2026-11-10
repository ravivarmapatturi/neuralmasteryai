// Keep static interview URLs aligned with SimpleInterviewPage.questionPath.
import { readFileSync } from 'node:fs';
const bank = JSON.parse(readFileSync(new URL('../src/data/interviewPractice.json', import.meta.url), 'utf8'));
export const interviewQuestionRoutes = bank.topics.flatMap(topic => topic.questions.map(q =>
  `/interview/q/${encodeURIComponent(q.id.replaceAll(':', '__'))}`));
