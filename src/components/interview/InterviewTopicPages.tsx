import { Link, useParams } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import NotFoundPage from '../NotFoundPage';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { interviewQuestionRoute } from '../../lib/interviewSearch';
import topics from '../../data/interviewTopics.generated.json';

export const topicName = (title: string) => title.replace(/ Interview Questions.*$/, '').replace('Interview Q&A Quick Reference', 'LLMs and agents');

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="nb-theme" style={{ minHeight: '100%', background: 'var(--nm-bg)' }}><Navbar /><main className="nm-information-page nm-interview-topic">{children}</main></div>;
}

/** /interview/topics: every topic with its question count. */
export function InterviewTopicsPage() {
  const total = topics.reduce((n, t) => n + t.questions.length, 0);
  useDocumentTitle('AI engineering interview questions by topic | Neural Mastery');
  useDocumentMeta('AI engineering interview questions by topic | Neural Mastery', `${total} machine learning and AI engineering interview questions, grouped by topic, each with a worked answer you can practise against.`);
  return (
    <Shell>
      <header>
        <p className="nm-information-eyebrow">INTERVIEW</p>
        <h1>Interview questions by topic</h1>
        <p className="nm-changelog-lead">{total} questions with worked answers. Open a topic to see every question, then practise any of them out loud or in writing.</p>
      </header>
      <ul className="nm-topic-list">
        {topics.map((t) => (
          <li key={t.slug}>
            <Link to={`/interview/topics/${t.slug}`}>{topicName(t.title)}</Link>
            <span>{t.questions.length} questions</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** /interview/topics/:slug: all question titles for one topic, grouped by section, each linking to practice. */
export function InterviewTopicPage() {
  const { slug } = useParams();
  const topic = topics.find((t) => t.slug === slug);
  const name = topic ? topicName(topic.title) : '';
  useDocumentTitle(topic ? `${name} interview questions | Neural Mastery` : 'Not found');
  useDocumentMeta(topic ? `${name} interview questions | Neural Mastery` : 'Not found', topic ? `${topic.questions.length} ${name} interview questions with worked answers. ${topic.description}`.trim() : '');
  if (!topic) return <NotFoundPage />;
  const sections = new Map<string, typeof topic.questions>();
  for (const q of topic.questions) sections.set(q.section, [...(sections.get(q.section) ?? []), q]);
  return (
    <Shell>
      <header>
        <p className="nm-information-eyebrow"><Link to="/interview/topics">INTERVIEW TOPICS</Link></p>
        <h1>{name} interview questions</h1>
        <p className="nm-changelog-lead">{topic.questions.length} questions. Choose one to answer it and compare with a worked explanation, or read the <Link to={topic.guideRoute}>full study guide</Link>.</p>
      </header>
      {[...sections].map(([section, list]) => (
        <section key={section}>
          <h2>{section}</h2>
          <ol>
            {list.map((q) => <li key={q.id}><Link to={interviewQuestionRoute(q.id)}>{q.title}</Link></li>)}
          </ol>
        </section>
      ))}
    </Shell>
  );
}
