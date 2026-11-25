import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface TopicPick {
  id: string;
  title: string;
  count: number;
  question: { id: string; title: string; level?: string; points: number };
}

const ROTATE_MS = 3500;

/** Same day -> same pick, so the card is stable within a visit but changes daily. */
function dayIndex(n: number, salt: number) {
  const day = Math.floor(Date.now() / 86_400_000);
  return n ? (day * 31 + salt * 7) % n : 0;
}

/**
 * Home "Practice interview questions" band: every interview topic on the left,
 * and a card on the right that rotates through one real question per topic,
 * highlighting the topic it came from.
 */
export default function HomeInterviewTopics() {
  const [topics, setTopics] = useState<TopicPick[] | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    // Loaded after first paint so the question bank stays out of the home bundle.
    void import('../../data/interviewPractice.json').then((m) => {
      const picks = m.default.topics
        .filter((t) => t.questions.length > 0)
        .map((t, i) => {
          const q = t.questions[dayIndex(t.questions.length, i)] as { id: string; title: string; level?: string; keyPoints?: unknown[] };
          return { id: t.id, title: t.title, count: t.questions.length, question: { id: q.id, title: q.title, level: q.level, points: q.keyPoints?.length ?? 0 } };
        });
      if (live) setTopics(picks);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduced(Boolean(m?.matches));
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = Boolean(topics) && !paused && inView && !reduced;
  useEffect(() => {
    if (!running || !topics) return undefined;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % topics.length), ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [running, active, topics]);

  const pick = topics?.[active];
  const total = topics?.reduce((s, t) => s + t.count, 0) ?? 0;

  return (
    <div ref={root} className="nm-home-ivt" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="nm-home-ivt-topics">
        <p className="nm-home-ivt-sub">{topics ? `${topics.length} topics · ${total} questions` : 'Loading topics…'}</p>
        <ol className="nm-home-ivt-list">
          {topics?.map((t, i) => (
            <li key={t.id} className={i === active ? 'is-active' : undefined}>
              <Link to={`/interview?topic=${t.id}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
                <span className="nm-home-ivt-name">{t.title}</span>
                <span className="nm-home-ivt-count">{t.count}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="nm-home-ivt-side">
        {pick && (
          <Link key={pick.id} to={`/interview/q/${encodeURIComponent(pick.question.id.replaceAll(':', '__'))}`} state={{ autostart: true }} className="nm-home-ivt-card" aria-live="polite">
            <span className="nm-home-tape nm-home-tape--l" style={{ top: '-0.7rem' }} aria-hidden="true" />
            <span className="nm-home-ivt-topic">{pick.title}</span>
            <span className="nm-home-ivt-q"><b>Q.</b> {pick.question.title}</span>
            <span className="nm-home-ivt-meta">
              {pick.question.level && <span className="nm-home-ivt-level">{pick.question.level}</span>}
              {pick.question.points > 0 && <span>a strong answer covers {pick.question.points} points</span>}
            </span>
            <span className="nm-home-ivt-go">Answer it, then compare →</span>
          </Link>
        )}
        {topics && (
          <div className="nm-home-ivt-dots" aria-hidden="true">
            {topics.map((t, i) => <i key={t.id} className={i === active ? 'is-on' : undefined} />)}
          </div>
        )}
      </div>
    </div>
  );
}
