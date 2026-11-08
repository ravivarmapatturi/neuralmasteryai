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
  const to = `/interview/q/${encodeURIComponent(daily.id.replaceAll(':', '__'))}`;
  return (
    <section className="nm-daily-strip">
      <div className="nm-landing-shell">
        <Link className="nm-daily-link" to={to} state={{ autostart: true }}>
          <span className="nb-hand nm-daily-label">Today's interview question</span>
          <span className="nm-daily-window">
            <span className="nb-hand nm-daily-text">{daily.title}</span>
          </span>
          <span className="nm-daily-go" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
