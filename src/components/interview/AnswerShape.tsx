export const ANSWER_MOVES = [
  { key: 'clarify', label: 'Clarify', starter: 'First, I would clarify ', hint: 'Who uses it, what "good" means, the constraints.' },
  { key: 'approach', label: 'Approach', starter: 'My approach would be ', hint: 'The design or fix, and why it addresses the cause.' },
  { key: 'tradeoff', label: 'Trade-off', starter: 'The trade-off is ', hint: 'What it costs, and when another option wins.' },
  { key: 'verify', label: 'Verify', starter: 'I would verify it by ', hint: 'The test, metric or experiment that proves it worked.' },
] as const;

/** Which moves the answer already contains (by their starter phrase or a close variant). Structure only, not correctness. */
export function movesUsed(answer: string): boolean[] {
  const a = answer.toLowerCase();
  return [
    /\b(clarify|clarifying|first, i would|i'd ask|assum)/.test(a),
    /\b(approach|i would (build|use|start|design)|my design|i'd (build|use))/.test(a),
    /\b(trade-?off|downside|cost|instead|alternatively|unless)\b/.test(a),
    // Verification intent, not any use of the word "test" ("testing on the weeks after" is part of the approach).
    /\b(verify|verified|measure|evaluate (it|whether|the (fix|change|result))|metric|monitor|a\/b|i would (test|check|confirm)|i'd (test|check|confirm)|to confirm|check (that|whether))/.test(a),
  ];
}

export default function AnswerShape({ answer, onInsert }: { answer: string; onInsert: (text: string) => void }) {
  const t = { accentPrimary: 'var(--nm-accent-primary)', border: 'var(--nm-border)', surface: 'var(--nm-surface)', textPrimary: 'var(--nm-text-primary)', textSecondary: 'var(--nm-text-secondary)' };
  const used = movesUsed(answer);
  const count = used.filter(Boolean).length;
  const w = 560, step = w / 4;
  return (
    <figure className="nm-answer-shape" aria-label={`Answer structure: ${count} of 4 moves used`}>
      <svg viewBox={`0 0 ${w} 74`} width="100%" role="img" aria-label={ANSWER_MOVES.map((m, i) => `${m.label} ${used[i] ? 'used' : 'not yet'}`).join(', ')}>
        {ANSWER_MOVES.map((m, i) => {
          const cx = step * i + step / 2;
          const on = used[i];
          return (
            <g key={m.key}>
              {i < 3 && <line x1={cx + 22} y1={24} x2={cx + step - 22} y2={24} stroke={used[i] && used[i + 1] ? t.accentPrimary : t.border} strokeWidth={2} strokeDasharray={used[i] && used[i + 1] ? undefined : '5 5'} />}
              <circle cx={cx} cy={24} r={18} fill={on ? t.accentPrimary : t.surface} stroke={on ? t.accentPrimary : t.border} strokeWidth={2} />
              <text x={cx} y={29} textAnchor="middle" fontSize={14} fontWeight={700} fill={on ? t.surface : t.textSecondary}>{on ? '✓' : i + 1}</text>
              <text x={cx} y={64} textAnchor="middle" fontSize={14} fontFamily="'Kalam', 'Comic Sans MS', cursive" fill={on ? t.textPrimary : t.textSecondary}>{m.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="nm-answer-shape-starters">
        {ANSWER_MOVES.map((m, i) => (
          <button key={m.key} type="button" className={used[i] ? 'is-used' : ''} onClick={() => onInsert(m.starter)} title={m.hint}>
            <strong>{m.label}</strong><span>{m.hint}</span>
          </button>
        ))}
      </div>
      <figcaption>Strong answers usually make these four moves. Tap one to start that part of your answer. This tracks the shape of your answer, not whether it is correct.</figcaption>
    </figure>
  );
}
