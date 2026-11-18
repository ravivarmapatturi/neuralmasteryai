import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStroke } from 'perfect-freehand';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';

/**
 * Teach mode: draw on top of a Learn page while explaining it, the way you
 * would on Excalidraw. Ink is pinned to the page (it scrolls with the
 * content), saved per page in this browser only, and never shown to readers.
 * Tools and shortcuts follow Excalidraw: P pen, H highlighter, L line,
 * A arrow, R box, O ellipse, T text, K laser, E eraser, Ctrl+Z / Ctrl+Shift+Z,
 * Esc to leave.
 */
type Tool = 'pen' | 'highlighter' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'laser' | 'eraser';
type Pt = [number, number, number];
type Item =
  | { id: string; kind: 'pen' | 'highlighter'; color: string; size: number; points: Pt[] }
  | { id: string; kind: 'line' | 'arrow' | 'rect' | 'ellipse'; color: string; size: number; x1: number; y1: number; x2: number; y2: number; seed: number }
  | { id: string; kind: 'text'; color: string; size: number; x: number; y: number; text: string };

const COLORS = ['#1e1e1e', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5'];
const SIZES = [2, 4, 8];
const HAND = "'Kalam', 'Comic Sans MS', cursive";
const KEYS: Record<string, Tool> = { p: 'pen', h: 'highlighter', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', t: 'text', k: 'laser', e: 'eraser' };
const gen = rough.generator();
const uid = () => Math.random().toString(36).slice(2, 10);

function pathFromStroke(points: number[][]): string {
  if (!points.length) return '';
  const d = points.reduce<(string | number)[]>((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return acc;
  }, ['M', ...points[0], 'Q']);
  d.push('Z');
  return d.join(' ');
}

function bbox(it: Item) {
  if ('points' in it) {
    const xs = it.points.map((p) => p[0]); const ys = it.points.map((p) => p[1]);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  if (it.kind === 'text') return { x1: it.x, y1: it.y - it.size * 6, x2: it.x + it.text.length * it.size * 3.2, y2: it.y + 6 };
  return { x1: Math.min(it.x1, it.x2), y1: Math.min(it.y1, it.y2), x2: Math.max(it.x1, it.x2), y2: Math.max(it.y1, it.y2) };
}

function hit(it: Item, x: number, y: number) {
  const b = bbox(it); const pad = 10;
  if (x < b.x1 - pad || x > b.x2 + pad || y < b.y1 - pad || y > b.y2 + pad) return false;
  if ('points' in it) return it.points.some((p) => Math.hypot(p[0] - x, p[1] - y) < 12);
  return true;
}

function roughPaths(it: Extract<Item, { x1: number }>) {
  const o = { stroke: it.color, strokeWidth: it.size, roughness: 1.2, seed: it.seed, bowing: 1 };
  const { x1, y1, x2, y2 } = it;
  let ds: Drawable[] = [];
  if (it.kind === 'rect') ds = [gen.rectangle(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), o)];
  else if (it.kind === 'ellipse') ds = [gen.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1), Math.abs(y2 - y1), o)];
  else {
    ds = [gen.line(x1, y1, x2, y2, o)];
    if (it.kind === 'arrow') {
      const a = Math.atan2(y2 - y1, x2 - x1); const L = 12 + it.size * 2;
      ds.push(gen.line(x2, y2, x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45), o));
      ds.push(gen.line(x2, y2, x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45), o));
    }
  }
  return ds.flatMap((d) => gen.toPaths(d));
}

function Ink({ it }: { it: Item }) {
  if ('points' in it) {
    const hl = it.kind === 'highlighter';
    const outline = getStroke(it.points, { size: hl ? it.size * 4 : it.size * 1.6, thinning: hl ? 0 : 0.55, smoothing: 0.5, streamline: 0.5, simulatePressure: !hl });
    return <path d={pathFromStroke(outline)} fill={it.color} opacity={hl ? 0.35 : 1} />;
  }
  if (it.kind === 'text') {
    return <text x={it.x} y={it.y} fill={it.color} fontFamily={HAND} fontSize={10 + it.size * 4} style={{ whiteSpace: 'pre' }}>{it.text}</text>;
  }
  return <g>{roughPaths(it).map((p, i) => <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />)}</g>;
}

function load(key: string): Item[] { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }

export default function TeachMode({ route }: { route: string }) {
  const storeKey = `nm-teach:${route}`;
  const [active, setActive] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [items, setItems] = useState<Item[]>(() => load(storeKey));
  const [redo, setRedo] = useState<Item[][]>([]);
  const [draft, setDraft] = useState<Item | null>(null);
  const [laser, setLaser] = useState<{ x: number; y: number; t: number }[]>([]);
  const [textAt, setTextAt] = useState<{ x: number; y: number } | null>(null);
  const [docH, setDocH] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const historyRef = useRef<Item[][]>([]);
  const drawing = useRef(false);

  // while teaching, hide pop-ups (sign-in, love) so the screen stays clean for recording
  useEffect(() => {
    document.documentElement.classList.toggle('nm-teaching', active);
    return () => document.documentElement.classList.remove('nm-teaching');
  }, [active]);

  // ink belongs to one page
  useEffect(() => { setItems(load(storeKey)); historyRef.current = []; setRedo([]); }, [storeKey]);
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(items)); } catch { /* storage full or blocked */ } }, [items, storeKey]);

  // the drawing layer covers the whole page, and grows with it
  useEffect(() => {
    const measure = () => setDocH(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const commit = useCallback((next: Item[]) => {
    historyRef.current.push(items);
    setRedo([]);
    setItems(next);
  }, [items]);
  const undo = useCallback(() => {
    // after a reload there is no history yet: undo then removes the last mark
    const prev = historyRef.current.pop() ?? (items.length ? items.slice(0, -1) : undefined);
    if (prev) { setRedo((r) => [...r, items]); setItems(prev); }
  }, [items]);
  const doRedo = useCallback(() => {
    setRedo((r) => { if (!r.length) return r; const next = r[r.length - 1]; historyRef.current.push(items); setItems(next); return r.slice(0, -1); });
  }, [items]);

  // keyboard shortcuts, only while teaching and not typing
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]');
      if (e.key === 'Escape') { if (textAt) setTextAt(null); else setActive(false); return; }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else undo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = KEYS[e.key.toLowerCase()];
      if (t) { e.preventDefault(); setTool(t); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, textAt, undo, doRedo]);

  // laser trail fades out by itself
  useEffect(() => {
    if (!laser.length) return;
    const id = window.setInterval(() => setLaser((l) => l.filter((p) => Date.now() - p.t < 900)), 60);
    return () => window.clearInterval(id);
  }, [laser.length]);

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const x = e.pageX; const y = e.pageY; const p = e.pressure || 0.5;
    // keep focus off the page so the new text box isn't closed straight away
    if (tool === 'text') { e.preventDefault(); setTextAt({ x, y }); return; }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    if (tool === 'laser') { setLaser((l) => [...l, { x, y, t: Date.now() }]); return; }
    if (tool === 'eraser') { const keep = items.filter((it) => !hit(it, x, y)); if (keep.length !== items.length) commit(keep); return; }
    if (tool === 'pen' || tool === 'highlighter') setDraft({ id: uid(), kind: tool, color: tool === 'highlighter' && color === COLORS[0] ? '#fab005' : color, size, points: [[x, y, p]] });
    else setDraft({ id: uid(), kind: tool, color, size, x1: x, y1: y, x2: x, y2: y, seed: Math.floor(Math.random() * 1e6) });
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const x = e.pageX; const y = e.pageY;
    if (tool === 'laser') { setLaser((l) => [...l, { x, y, t: Date.now() }]); return; }
    if (tool === 'eraser') { const keep = items.filter((it) => !hit(it, x, y)); if (keep.length !== items.length) commit(keep); return; }
    setDraft((d) => {
      if (!d) return d;
      if ('points' in d) return { ...d, points: [...d.points, [x, y, e.pressure || 0.5] as Pt] };
      if (!('x1' in d)) return d;
      return { ...d, x2: x, y2: y };
    });
  };
  const onUp = () => {
    drawing.current = false;
    if (draft) {
      const tiny = 'x1' in draft && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 4;
      if (!tiny) commit([...items, draft]);
      setDraft(null);
    }
  };

  const laserPath = useMemo(() => (laser.length > 1 ? pathFromStroke(getStroke(laser.map((p) => [p.x, p.y, 0.5]), { size: 8, thinning: 0.6, streamline: 0.4 })) : ''), [laser]);

  const btn = (on: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 17,
    background: on ? '#e0dfff' : 'transparent', color: on ? '#4338ca' : '#1e1e1e', fontFamily: HAND,
  });
  const TOOLS: { t: Tool; icon: string; name: string; key: string }[] = [
    { t: 'pen', icon: '✎', name: 'Pen', key: 'P' }, { t: 'highlighter', icon: '▮', name: 'Highlighter', key: 'H' },
    { t: 'line', icon: '╱', name: 'Line', key: 'L' }, { t: 'arrow', icon: '➝', name: 'Arrow', key: 'A' },
    { t: 'rect', icon: '▢', name: 'Box', key: 'R' }, { t: 'ellipse', icon: '◯', name: 'Ellipse', key: 'O' },
    { t: 'text', icon: 'A', name: 'Text', key: 'T' }, { t: 'laser', icon: '✦', name: 'Laser pointer', key: 'K' },
    { t: 'eraser', icon: '⌫', name: 'Eraser', key: 'E' },
  ];

  const layer = (
    <svg
      aria-hidden={!active}
      onPointerDown={active ? onDown : undefined}
      onPointerMove={active ? onMove : undefined}
      onPointerUp={active ? onUp : undefined}
      onPointerCancel={active ? onUp : undefined}
      style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: docH, zIndex: active ? 45 : 15, pointerEvents: active ? 'auto' : 'none',
        cursor: !active ? 'default' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair', touchAction: active ? 'none' : 'auto' }}>
      {items.map((it) => <Ink key={it.id} it={it} />)}
      {draft && <Ink it={draft} />}
      {laserPath && <path d={laserPath} fill="#ff2d55" opacity={0.85} style={{ filter: 'drop-shadow(0 0 4px #ff2d55)' }} />}
    </svg>
  );

  return (
    <>
      {createPortal(layer, document.body)}

      {textAt && createPortal(
        <input autoFocus ref={(el) => { if (el) window.setTimeout(() => el.focus(), 0); }} aria-label="Type text, then press Enter"
          style={{ position: 'absolute', left: textAt.x, top: textAt.y - (10 + size * 4), zIndex: 46, font: `${10 + size * 4}px ${HAND}`, color, border: '1px dashed #4338ca', background: 'transparent', outline: 'none', minWidth: 120 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (v) commit([...items, { id: uid(), kind: 'text', color, size, x: textAt.x, y: textAt.y, text: v }]); setTextAt(null); }
          }}
          onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v) commit([...items, { id: uid(), kind: 'text', color, size, x: textAt.x, y: textAt.y, text: v }]); setTextAt(null); }}
        />, document.body)}

      {active && createPortal(
        <div role="toolbar" aria-label="Teach mode tools"
          style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 60,
            display: 'flex', alignItems: 'center', gap: 4, padding: 6, background: '#fff', borderRadius: 12, boxShadow: '0 4px 18px rgba(0,0,0,.18)', flexWrap: 'wrap', maxWidth: 'calc(100vw - 24px)', fontFamily: HAND }}>
          {TOOLS.map((x) => (
            <button key={x.t} type="button" title={`${x.name} (${x.key})`} aria-label={x.name} aria-pressed={tool === x.t} onClick={() => setTool(x.t)} style={btn(tool === x.t)}>{x.icon}</button>
          ))}
          <span style={{ width: 1, height: 26, background: '#ddd', margin: '0 4px' }} />
          {COLORS.map((c) => (
            <button key={c} type="button" title="Colour" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
              style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer', border: color === c ? '2px solid #4338ca' : '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }} />
          ))}
          <span style={{ width: 1, height: 26, background: '#ddd', margin: '0 4px' }} />
          {SIZES.map((s) => (
            <button key={s} type="button" title="Stroke width" aria-label={`Stroke width ${s}`} aria-pressed={size === s} onClick={() => setSize(s)} style={btn(size === s)}>
              <span style={{ width: 16, height: s, background: '#1e1e1e', borderRadius: s, display: 'block' }} />
            </button>
          ))}
          <span style={{ width: 1, height: 26, background: '#ddd', margin: '0 4px' }} />
          <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={undo} style={btn(false)}>↶</button>
          <button type="button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!redo.length} onClick={doRedo} style={{ ...btn(false), opacity: redo.length ? 1 : 0.35 }}>↷</button>
          <button type="button" title="Clear the page" aria-label={confirmClear ? 'Confirm clear' : 'Clear the page'}
            onClick={() => { if (confirmClear) { commit([]); setConfirmClear(false); } else { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 2500); } }}
            style={{ ...btn(false), width: 'auto', padding: '0 10px', fontSize: 15, color: confirmClear ? '#e03131' : '#1e1e1e' }}>
            {confirmClear ? 'Sure? Clear' : 'Clear'}
          </button>
          <button type="button" title="Leave teach mode (Esc)" aria-label="Leave teach mode" onClick={() => setActive(false)}
            style={{ ...btn(false), width: 'auto', padding: '0 12px', fontSize: 15, background: '#4338ca', color: '#fff' }}>Done</button>
        </div>, document.body)}

      {!active && createPortal(
        <button type="button" onClick={() => setActive(true)} title="Teach mode: draw on this page while you explain"
          className="nm-teach-toggle"
          style={{ position: 'fixed', left: 'calc(16px + env(safe-area-inset-left, 0px))', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', zIndex: 55,
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: '1.8px solid #4338ca', background: '#fff', color: '#4338ca',
            fontFamily: HAND, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 14px rgba(67,56,202,.18)' }}>
          <span aria-hidden>✎</span> Teach mode
        </button>, document.body)}
    </>
  );
}
