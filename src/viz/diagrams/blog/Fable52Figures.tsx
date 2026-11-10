import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

// Every number below is copied from Anthropic's launch post, 9 November 2026:
// https://www.anthropic.com/claude-fable-and-mythos-5-2 (benchmarks table).
// Scores are each model's highest available effort, safeguards on, unless the
// post notes otherwise.
export const BENCHMARKS = [
  { name: 'FrontierCode 2.0', area: 'Agentic coding', fable52: 49.1, fable51: 32.4, opus55: 45.5 },
  { name: 'FrontierSWE v2', area: 'Agentic coding', fable52: 69.9, fable51: 56.3, opus55: 62.3 },
  { name: 'Terminal-Bench-Science 0.1', area: 'Scientific research', fable52: 74.6, fable51: 52.6, opus55: 58.7 },
  { name: 'WANDR (relaxed)', area: 'Agentic search', fable52: 82.1, fable51: 68.7, opus55: 72.3 },
  { name: 'OSWorld 2.1', area: 'Computer use', fable52: 89.3, fable51: 83.5, opus55: 87.2 },
  { name: 'RoboDojo Sim', area: 'Robotics', fable52: 64.9, fable51: 27.6, opus55: 39.4 },
  { name: 'Remote Labor Index', area: 'Knowledge work', fable52: 41.3, fable51: 17.9, opus55: 21.3 },
  { name: "Humanity's Last Exam (tools)", area: 'Reasoning', fable52: 74.2, fable51: 65.6, opus55: 67.7 },
  { name: 'Chartography (no tools)', area: 'Vision', fable52: 73.4, fable51: 44.8, opus55: 64.4 },
] as const;

type Key = 'fable52' | 'fable51' | 'opus55';

/** Percentage-point gain of Fable 5.2 over another model on one benchmark. */
export function gainOver(row: (typeof BENCHMARKS)[number], other: Exclude<Key, 'fable52'>) {
  return Math.round((row.fable52 - row[other]) * 10) / 10;
}

export function Fable52Benchmarks() {
  const t = useVizTokens();
  const [other, setOther] = useState<Exclude<Key, 'fable52'>>('fable51');
  const label = other === 'fable51' ? 'Fable 5.1' : 'Opus 5.5';
  const W = 560, labelW = 200, barW = W - labelW - 50, rowH = 34;
  const x = (v: number) => labelW + (v / 100) * barW;

  return (
    <VisualizationContainer
      title="Launch benchmarks"
      footer="Scores as published by Anthropic in its launch post (9 November 2026). Anthropic ran most of these evaluations itself; RoboDojo Sim was run internally. Highest available effort unless the post says otherwise."
    >
      <VisualizationHeader
        eyebrow="FROM ANTHROPIC'S TABLE"
        title={`Fable 5.2 against ${label}`}
        description="Pick the comparison. The darker bar is Fable 5.2; the number on the right is the gap in percentage points."
      />
      <div role="group" aria-label="Compare against" style={{ display: 'flex', gap: 8, margin: '0.5rem 0 1rem' }}>
        {(['fable51', 'opus55'] as const).map(k => (
          <button
            key={k}
            type="button"
            aria-pressed={other === k}
            onClick={() => setOther(k)}
            style={{
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${t.accentPrimary}`,
              background: other === k ? t.accentPrimary : 'transparent',
              color: other === k ? t.surface : t.textPrimary,
            }}
          >
            vs {k === 'fable51' ? 'Fable 5.1' : 'Opus 5.5'}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${BENCHMARKS.length * rowH + 10}`} width="100%" role="img" aria-label={`Fable 5.2 compared with ${label} on ${BENCHMARKS.length} benchmarks from Anthropic's launch post.`}>
        {BENCHMARKS.map((row, i) => {
          const y = i * rowH + 4;
          return (
            <g key={row.name}>
              <text x={0} y={y + 12} fontSize={12} fill={t.textPrimary}>{row.name}</text>
              <text x={0} y={y + 25} fontSize={10} fill={t.textSecondary}>{row.area}</text>
              <rect x={labelW} y={y + 2} width={x(row.fable52) - labelW} height={12} rx={3} fill={t.accentPrimary} />
              <rect x={labelW} y={y + 16} width={x(row[other]) - labelW} height={10} rx={3} fill={t.accentSecondary} opacity={0.7} />
              <text x={W - 2} y={y + 18} textAnchor="end" fontSize={12} fontWeight={700} fill={t.textPrimary}>+{gainOver(row, other)}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}

/** One model, two products: how a request reaches Fable 5.2 or Mythos 5.2. */
export function FableMythosRouting() {
  const t = useVizTokens();
  const box = (x: number, y: number, w: number, h: number, fill: string, lines: string[]) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} opacity={0.16} stroke={fill} />
      {lines.map((l, i) => (
        <text key={l} x={x + w / 2} y={y + h / 2 + (i - (lines.length - 1) / 2) * 15 + 4} textAnchor="middle" fontSize={12} fontWeight={i === 0 ? 700 : 400} fill={t.textPrimary}>{l}</text>
      ))}
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, label?: string) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.textSecondary} strokeWidth={1.5} markerEnd="url(#fm-arrow)" />
      {label && <text x={(x1 + x2) / 2 + 6} y={(y1 + y2) / 2 - 4} fontSize={11} fill={t.textSecondary}>{label}</text>}
    </g>
  );
  return (
    <VisualizationContainer
      title="Fable and Mythos"
      footer="Drawn by Neural Mastery from Anthropic's description in the launch post. Mythos 5.2 is the same underlying model without certain cybersecurity and biology safeguards, for organisations accepted into Anthropic's verification programs."
    >
      <VisualizationHeader
        eyebrow="HOW ACCESS WORKS"
        title="Same weights, different safeguards"
        description="Fable 5.2 runs behind classifiers. A blocked cyber request is answered by Opus 4.8, a blocked biology request by Opus 5."
      />
      <svg viewBox="0 0 560 300" width="100%" role="img" aria-label="Diagram: one underlying model served as Fable 5.2 with safety classifiers for all paid users, and as Mythos 5.2 for verified organisations. Blocked cybersecurity requests fall back to Opus 4.8 and blocked biology requests to Opus 5.">
        <defs>
          <marker id="fm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={t.textSecondary} />
          </marker>
        </defs>
        {box(180, 8, 200, 44, t.accentPurple, ['One underlying model', 'Fable 5.2 = Mythos 5.2'])}
        {arrow(240, 52, 120, 92)}
        {arrow(320, 52, 440, 92)}
        {box(20, 94, 210, 52, t.accentPrimary, ['Claude Fable 5.2', 'all paid plans and the API'])}
        {box(330, 94, 210, 52, t.accentTeal, ['Claude Mythos 5.2', 'verified cyber / life-science orgs'])}
        {arrow(125, 146, 125, 180)}
        {box(20, 182, 210, 40, t.accentWarn, ['Cyber and biology classifiers'])}
        {arrow(70, 222, 50, 252, 'cyber')}
        {arrow(125, 222, 125, 252, 'bio')}
        {arrow(180, 222, 230, 252, 'allowed')}
        {box(0, 254, 100, 40, t.accentDanger, ['Opus 4.8'])}
        {box(105, 254, 80, 40, t.accentDanger, ['Opus 5'])}
        {box(190, 254, 120, 40, t.accentPrimary, ['Fable 5.2 answers'])}
        {arrow(435, 146, 435, 180)}
        {box(330, 182, 210, 40, t.accentTeal, ['Full cyber and bio capability'])}
      </svg>
    </VisualizationContainer>
  );
}

/** A credited link card for an official post. We link rather than re-host media. */
export function OfficialPost({ href, author, date, children }: { href: string; author: string; date: string; children: React.ReactNode }) {
  const t = useVizTokens();
  return (
    <figure style={{ border: `1px solid ${t.textSecondary}55`, borderRadius: 10, padding: '12px 16px', margin: '1.25rem 0' }}>
      <figcaption style={{ fontSize: 13, color: t.textSecondary, marginBottom: 6 }}>
        {author} on X, {date}
      </figcaption>
      <div style={{ color: t.textPrimary }}>{children}</div>
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600 }}>
        Watch or view it on X →
      </a>
    </figure>
  );
}
