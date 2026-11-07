import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { relatedProblemsById } from '../../lib/problemIndex';

const KEY = (id: string) => `nm-problem-notes:${id}`;

function readNotes(id: string): string {
  try { return window.localStorage.getItem(KEY(id)) ?? ''; } catch { return ''; }
}

/** Private notes for one problem, kept in this browser only. */
export function ProblemNotes({ problemId }: { problemId: string }) {
  const [text, setText] = useState(() => readNotes(problemId));
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setText(readNotes(problemId)); setSaved(true); }, [problemId]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (value: string) => {
    setText(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        if (value.trim()) window.localStorage.setItem(KEY(problemId), value);
        else window.localStorage.removeItem(KEY(problemId));
      } catch { /* storage blocked: notes stay for this visit only */ }
      setSaved(true);
    }, 400);
  };

  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--nm-border)' }}>
      <label htmlFor={`notes-${problemId}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: 6 }}>
        <span>Your notes</span>
        <span style={{ fontWeight: 500, textTransform: 'none' }} aria-live="polite">{saved ? 'Saved in this browser' : 'Saving…'}</span>
      </label>
      <textarea
        id={`notes-${problemId}`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="What tripped you up, the key idea, what to check next time."
        style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13.5, padding: 10, color: 'var(--nm-text-primary)', background: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: 4, resize: 'vertical' }}
      />
    </div>
  );
}

/** Problems to try next: the rest of this track first. */
export function RelatedProblems({ problemId }: { problemId: string }) {
  const related = relatedProblemsById(problemId);
  if (!related.length) return null;
  return (
    <nav aria-label="Related problems" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--nm-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: 8 }}>Related problems</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
        {related.map((r) => (
          <li key={r.page.route} style={{ fontSize: 13.5 }}>
            <Link to={r.page.route} style={{ color: 'var(--nm-text-primary)' }}>{r.page.title}</Link>
            <span style={{ color: 'var(--nm-text-muted)', fontSize: 12 }}> · {r.page.difficulty ?? 'open'} · {r.points} points</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
