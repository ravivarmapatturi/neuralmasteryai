import type { ReactNode } from 'react';

/**
 * Renders the small subset of Markdown that problem statements use:
 * paragraphs, "- " bullet lists, "1. " numbered lists, ``` fences, `code`
 * and **bold**. Problem specs are full of exact strings and numbered rules,
 * and flattening them into one <p> made the precise ones unreadable.
 * Anything else stays plain text.
 */
export default function PlainMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i += 1;
      blocks.push(
        <pre key={blocks.length} style={preStyle}>
          {body.join('\n')}
        </pre>,
      );
      continue;
    }
    const bullet = /^\s*- /;
    const numbered = /^\s*\d+\. /;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: { text: string; subs: string[] }[] = [];
      const nested = /^\s{2,}- /;
      while (i < lines.length && lines[i].trim()) {
        const current = items[items.length - 1];
        if (current && nested.test(lines[i])) {
          current.subs.push(lines[i].replace(nested, ''));
        } else if (marker.test(lines[i])) {
          items.push({ text: lines[i].replace(marker, ''), subs: [] });
        } else if (current) {
          if (current.subs.length) current.subs[current.subs.length - 1] += ` ${lines[i].trim()}`;
          else current.text += ` ${lines[i].trim()}`;
        }
        i += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={blocks.length} style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          {items.map((item, k) => (
            <li key={k} style={{ marginBottom: 4 }}>
              {inline(item.text)}
              {item.subs.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {item.subs.map((sub, j) => (
                    <li key={j} style={{ marginBottom: 3 }}>
                      {inline(sub)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !bullet.test(lines[i]) && !numbered.test(lines[i]) && !lines[i].trim().startsWith('```')) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(
      <p key={blocks.length} style={{ margin: '0 0 10px' }}>
        {inline(para.join(' '))}
      </p>,
    );
  }
  return <>{blocks}</>;
}

const preStyle = {
  margin: '0 0 10px',
  padding: '8px 12px',
  borderRadius: 6,
  background: 'var(--nm-surface-alt)',
  border: '1px solid var(--nm-border)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  overflowX: 'auto' as const,
  whiteSpace: 'pre' as const,
};

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      out.push(
        <code
          key={out.length}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.92em',
            padding: '1px 5px',
            borderRadius: 4,
            background: 'var(--nm-surface-alt)',
            border: '1px solid var(--nm-border)',
            overflowWrap: 'anywhere',
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<strong key={out.length}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index! + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
