export const BOX_TYPES = ['client', 'API', 'queue', 'cache', 'database', 'model server', 'vector store', 'worker'] as const;
export interface SketchNode { id: string; label: string; x: number; y: number }
export interface SketchEdge { from: string; to: string; label?: string }
export interface SystemDesignSketch { nodes: SketchNode[]; edges: SketchEdge[] }
export const emptySketch = (): SystemDesignSketch => ({ nodes: [], edges: [] });
/** Bound imported/account data before rendering or storing it. Invalid graphs are omitted. */
export function normalizeSketch(value: unknown): SystemDesignSketch | undefined {
  if (!value || typeof value !== 'object') return;
  const s = value as SystemDesignSketch;
  if (!Array.isArray(s.nodes) || !Array.isArray(s.edges) || s.nodes.length > 24 || s.edges.length > 48) return;
  const ids = new Set<string>();
  for (const n of s.nodes) {
    if (!n || typeof n.id !== 'string' || !n.id || n.id.length > 80 || ids.has(n.id)
      || typeof n.label !== 'string' || !n.label.trim() || n.label.length > 100
      || !Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 0 || n.x > 72 || n.y < 0 || n.y > 86) return;
    ids.add(n.id);
  }
  if (s.edges.some(e => !e || !ids.has(e.from) || !ids.has(e.to) || e.from === e.to
    || (e.label !== undefined && (typeof e.label !== 'string' || e.label.length > 120)))) return;
  return { nodes: s.nodes.map(({ id, label, x, y }) => ({ id, label, x, y })),
    edges: s.edges.map(({ from, to, label }) => ({ from, to, ...(label ? { label } : {}) })) };
}
