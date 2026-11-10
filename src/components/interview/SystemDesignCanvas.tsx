import { useId, useRef, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { BOX_TYPES, type SystemDesignSketch } from '../../lib/systemDesignSketch';
import './systemDesignCanvas.css';

export function SystemDesignCanvas({ value, onChange, title = 'Your sketch' }: {
  value: SystemDesignSketch; onChange?: (value: SystemDesignSketch) => void; title?: string;
}) {
  const t = useVizTokens();
  const marker = useId().replace(/:/g, '');
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; before: SystemDesignSketch } | null>(null);
  const [history, setHistory] = useState<SystemDesignSketch[]>([]);
  const [selected, setSelected] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const change = (next: SystemDesignSketch) => {
    setHistory(h => [...h.slice(-49), value]); onChange?.(next);
  };
  const connect = (id: string) => {
    if (!connecting) { setSelected(id); return; }
    if (!selected) { setSelected(id); setMessage('Choose the destination box.'); return; }
    if (selected !== id && !value.edges.some(e => e.from === selected && e.to === id) && value.edges.length < 48) {
      change({ ...value, edges: [...value.edges, { from: selected, to: id }] }); setMessage('Arrow added.');
    }
    setSelected(''); setConnecting(false);
  };
  return <section className="sd-canvas" aria-label={title}>
    <h3>{title}</h3>
    {onChange && <>
      <p>Add boxes, drag to arrange, and draw arrows to connect them.</p>
      <div className="sd-tools" aria-label="Box palette">{BOX_TYPES.map(label => <button type="button" key={label} disabled={value.nodes.length >= 24}
        onClick={() => { const i = value.nodes.length; change({ ...value, nodes: [...value.nodes, { id: crypto.randomUUID(), label, x: (i % 3) * 34, y: Math.floor(i / 3) * 12 }] }); }}>{label}</button>)}</div>
      <div className="sd-tools">
        <button type="button" aria-pressed={connecting} onClick={() => { setConnecting(!connecting); setSelected(''); setMessage('Choose the source box.'); }}>Draw arrow</button>
        <button type="button" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { onChange(previous); setHistory(h => h.slice(0, -1)); setSelected(''); } }}>Undo</button>
        <button type="button" disabled={!value.nodes.length} onClick={() => { change({ nodes: [], edges: [] }); setSelected(''); }}>Clear</button>
        {selected && <label>Box label <input aria-label="Box label" maxLength={100} value={value.nodes.find(n => n.id === selected)?.label ?? ''}
          onChange={e => { if (e.target.value.trim()) change({ ...value, nodes: value.nodes.map(n => n.id === selected ? { ...n, label: e.target.value } : n) }); }} /></label>}
      </div>
      <span role="status">{message}</span>
    </>}
    <div ref={board} className="sd-board" style={{ background: t.surfaceAlt, borderColor: t.border }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${title}: ${value.edges.length} directed connections`} role="img">
        <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={t.textSecondary} /></marker></defs>
        {value.edges.map((edge, i) => {
          const a = value.nodes.find(n => n.id === edge.from), b = value.nodes.find(n => n.id === edge.to);
          if (!a || !b) return null;
          // Route through the gutters so a skipped row does not hide an arrow under another box.
          const sameRow = Math.abs(a.y - b.y) < 10;
          const sameColumn = Math.abs(a.x - b.x) < 5;
          let path: string;
          if (sameRow && Math.abs(a.x - b.x) > 40) {
            const gutterY = Math.min(99, a.y + 18);
            path = `M ${a.x + 14} ${a.y + 12} V ${gutterY} H ${b.x + 14} V ${b.y + 12}`;
          } else if (sameRow) {
            const forward = b.x > a.x;
            path = `M ${a.x + (forward ? 28 : 0)} ${a.y + 6} L ${b.x + (forward ? 0 : 28)} ${b.y + 6}`;
          } else if (sameColumn) {
            const gutter = Math.min(99, a.x + 31);
            path = `M ${a.x + 28} ${a.y + 6} H ${gutter} V ${b.y + 6} H ${b.x + 28}`;
          } else {
            const down = b.y > a.y;
            const gutterY = a.y + (down ? 18 : -4);
            const gutterX = b.x > 2 ? b.x - 3 : b.x + 31;
            const endX = b.x > 2 ? b.x : b.x + 28;
            path = `M ${a.x + 14} ${a.y + (down ? 12 : 0)} V ${gutterY} H ${gutterX} V ${b.y + 6} H ${endX}`;
          }
          return <path key={i} d={path} fill="none" stroke={t.textSecondary} strokeWidth="0.45" markerEnd={`url(#${marker})`}><title>{a.label} → {b.label}{edge.label ? `: ${edge.label}` : ''}</title></path>;
        })}
      </svg>
      {!value.nodes.length && <span className="sd-empty">{onChange ? 'Add a box to begin.' : 'No boxes saved.'}</span>}
      {value.nodes.map(node => <button type="button" key={node.id} className="sd-node" disabled={!onChange} aria-label={`${node.label} box`} aria-pressed={onChange ? selected === node.id : undefined}
        style={{ left: `${node.x}%`, top: `${node.y}%`, color: t.textPrimary, background: t.surface, borderColor: selected === node.id ? t.accentPrimary : t.border }}
        onClick={() => onChange && connect(node.id)}
        onKeyDown={e => {
          if (!onChange) return;
          if (e.key === 'Escape') { setConnecting(false); setSelected(''); return; }
          if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); change({ nodes: value.nodes.filter(n => n.id !== node.id), edges: value.edges.filter(a => a.from !== node.id && a.to !== node.id) }); return; }
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault(); e.stopPropagation();
          setMessage(`Moved ${node.label} ${e.key.replace('Arrow', '').toLowerCase()}.`);
          change({ ...value, nodes: value.nodes.map(n => n.id === node.id ? { ...n, x: Math.max(0, Math.min(72, n.x + (e.key === 'ArrowRight' ? 2 : e.key === 'ArrowLeft' ? -2 : 0))), y: Math.max(0, Math.min(86, n.y + (e.key === 'ArrowDown' ? 2 : e.key === 'ArrowUp' ? -2 : 0))) } : n) });
        }}
        onPointerDown={e => { if (!onChange || connecting) return; drag.current = { id: node.id, x: e.clientX, y: e.clientY, before: value }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => {
          const d = drag.current, rect = board.current?.getBoundingClientRect();
          if (!d || !rect || !onChange) return;
          const original = d.before.nodes.find(n => n.id === d.id)!;
          onChange({ ...d.before, nodes: d.before.nodes.map(n => n.id === d.id ? { ...n, x: Math.max(0, Math.min(72, original.x + (e.clientX - d.x) / rect.width * 100)), y: Math.max(0, Math.min(86, original.y + (e.clientY - d.y) / rect.height * 100)) } : n) });
        }}
        onPointerUp={() => { const d = drag.current; if (d && value !== d.before) setHistory(h => [...h.slice(-49), d.before]); drag.current = null; }}
        onPointerCancel={() => { const d = drag.current; if (d) { onChange?.(d.before); drag.current = null; } }}
      >{node.label}</button>)}
    </div>
    {value.edges.length > 0 && <ul className="sd-connections" aria-label="Connections">{value.edges.map((e, i) => <li key={i}>{value.nodes.find(n => n.id === e.from)?.label} → {value.nodes.find(n => n.id === e.to)?.label}{e.label && `: ${e.label}`}</li>)}</ul>}
  </section>;
}
