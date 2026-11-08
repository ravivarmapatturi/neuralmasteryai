import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

type ObjType = 'commit' | 'tree' | 'blob';
interface Node {
  id: string;
  type: ObjType;
  label: string;
  hash: string;
  x: number;
  y: number;
  children?: string[];
  parent?: string;
}

const NODES: Node[] = [
  { id: 'c2', type: 'commit', label: 'commit "fix bug"', hash: 'a1b2c3', x: 340, y: 20, children: ['t2'], parent: 'c1' },
  { id: 'c1', type: 'commit', label: 'commit "init"', hash: 'f9e8d7', x: 180, y: 20, children: ['t1'] },
  { id: 't2', type: 'tree', label: 'tree (root)', hash: '4d5e6f', x: 340, y: 90, children: ['blob2', 'blob1'] },
  { id: 't1', type: 'tree', label: 'tree (root)', hash: '9c8b7a', x: 180, y: 90, children: ['blob1'] },
  { id: 'blob2', type: 'blob', label: 'blob: train.py (v2)', hash: '11a22b', x: 380, y: 160 },
  { id: 'blob1', type: 'blob', label: 'blob: train.py (v1)', hash: '33c44d', x: 220, y: 160 },
];

const COLOR_KEY: Record<ObjType, 'query' | 'attention' | 'key'> = { commit: 'query', tree: 'attention', blob: 'key' };

export default function GitObjectModelDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<string>('c2');
  const node = NODES.find((n) => n.id === selected)!;

  const WIDTH = 460;
  const HEIGHT = 210;

  return (
    <VisualizationContainer
      footer={
        node.type === 'commit'
          ? `A commit points to one tree (the full snapshot at that point) and its parent commit -- ${node.parent ? `${node.id} -> parent ${node.parent}` : 'this is the root, no parent'}. Note: c1 and c2 share the SAME blob1 (train.py v1) -- unchanged file content is never duplicated.`
          : node.type === 'tree'
            ? 'A tree lists the blobs (files) and other trees (subdirectories) that make up a directory snapshot, each identified by content hash.'
            : "A blob is just compressed file content, identified by the SHA-1 hash of that content. Identical content anywhere in the repo's history -- even across unrelated commits -- is stored exactly once."
      }
    >
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg">
        <defs>
          <marker id="git-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={t.textMuted} />
          </marker>
          <marker id="git-tree-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.border} />
          </marker>
        </defs>
        {NODES.map((n) =>
          (n.children ?? []).map((childId) => {
            const child = NODES.find((c) => c.id === childId)!;
            return <line key={`${n.id}-${childId}`} x1={n.x} y1={n.y + 14} x2={child.x} y2={child.y - 14} stroke={t.border} strokeWidth={1.5} markerEnd="url(#git-tree-arrow)" />;
          }),
        )}
        {NODES.filter((n) => n.parent).map((n) => {
          const parent = NODES.find((p) => p.id === n.parent)!;
          return (
            <g key={`${n.id}-parent`}>
              <line x1={n.x - 55} y1={n.y} x2={parent.x + 55 + 2} y2={parent.y} stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#git-arrow)" />
              <text x={(n.x - 55 + parent.x + 55) / 2} y={n.y - 5} textAnchor="middle" fontSize={8} fill={t.textMuted}>parent</text>
            </g>
          );
        })}
        {NODES.map((n) => {
          const color = getConceptColor(t, COLOR_KEY[n.type]);
          const isSelected = n.id === selected;
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(n.id)}>
              <rect x={n.x - 55} y={n.y - 14} width={110} height={28} rx={6} fill={isSelected ? `${color}22` : t.surfaceAlt} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={n.x} y={n.y - 1} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{n.label}</text>
              <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={t.textMuted}>{n.hash}</text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
