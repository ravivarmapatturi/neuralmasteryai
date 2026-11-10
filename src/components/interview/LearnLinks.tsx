// "I don't know this yet": the learn pages that teach a question, opened in a new tab so the question stays here.
import { useState } from 'react';
import links from '../../data/interviewLearnLinks.json';

type Link = { path: string; title: string };
const byQuestion = links as Record<string, Link[]>;

/** Pages for a question, or the pages its topic links to most when it has none of its own. */
export function learnLinksFor(questionId: string, topicQuestionIds: string[]): Link[] {
  const own = byQuestion[questionId] ?? [];
  if (own.length) return own;
  const counts = new Map<string, { link: Link; n: number }>();
  for (const id of topicQuestionIds) for (const link of byQuestion[id] ?? []) {
    const c = counts.get(link.path) ?? { link, n: 0 };
    counts.set(link.path, { link, n: c.n + 1 });
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 3).map(c => c.link);
}

export function LearnLinks({ questionId, topicQuestionIds }: { questionId: string; topicQuestionIds: string[] }) {
  const [open, setOpen] = useState(false);
  const pages = learnLinksFor(questionId, topicQuestionIds);
  if (!pages.length) return null;
  return (
    <div className="si-learn">
      <button type="button" className="si-link si-learn-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        I don't know this yet
      </button>
      {open && (
        <div className="si-learn-panel">
          <p>Learn it first, then come back and answer.</p>
          <ul>
            {pages.map(p => (
              <li key={p.path}><a href={p.path} target="_blank" rel="noopener">{p.title}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
