import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pickDaily, type DailyQuestion } from '../../lib/interview/daily';

export default function DailyInterviewQuestion() {
  const [daily, setDaily] = useState<DailyQuestion | null>(null);

  useEffect(() => {
    let live = true;
    // Loaded after the page so the question bank stays out of the home page bundle.
    void import('../../data/interviewPractice.json').then((m) => {
      const all = m.default.topics.flatMap((t) => t.questions.map((q) => ({ id: q.id, title: q.title, topic: t.title })));
      if (live) setDaily(pickDaily(all));
    });
    return () => {
      live = false;
    };
  }, []);

  if (!daily) return null;
  return (
    <section style={{ padding: 'clamp(2rem, 4vw, 3rem) 0', borderBottom: '1px solid var(--nb-rule)' }}>
      <div className="nm-landing-shell">
        <p className="nb-hand" style={{ margin: 0, color: 'var(--nb-ink-soft)', fontSize: '0.9rem' }}>
          Today's interview question · {daily.topic}
        </p>
        <h2 className="nb-heading" style={{ fontSize: 'clamp(1.2rem, 2.4vw, 1.6rem)', margin: '0.4rem 0 1rem', maxWidth: '60ch' }}>
          {daily.title}
        </h2>
        <Link className="nm-text-link" to={`/interview?q=${encodeURIComponent(daily.id)}`} style={{ color: 'var(--nb-cobalt)' }}>
          Answer it out loud →
        </Link>
      </div>
    </section>
  );
}
