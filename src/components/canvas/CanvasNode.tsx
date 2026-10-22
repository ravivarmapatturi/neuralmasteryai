import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useVizTokens, RADIUS, FONT_FAMILY } from '../../theme/vizTokens';
import type { CanvasNodeType } from '../../lib/practiceProblem';

export interface CanvasNodeData {
  componentType: CanvasNodeType;
  label: string;
  role: string;
  description: string;
  badge?: string;
  icon?: string;
  onDeleteNode?: (id: string) => void;
}

const TYPE_CONFIG: Record<
  CanvasNodeType,
  { defaultIcon: string; defaultBadge: string; colorKey: 'accentPurple' | 'accentSecondary' | 'accentTeal' | 'accentWarn' | 'accentPrimary' }
> = {
  reasoner: { defaultIcon: '', defaultBadge: 'LLM HUB', colorKey: 'accentPurple' },
  tool: { defaultIcon: '', defaultBadge: 'EXTERNAL', colorKey: 'accentSecondary' },
  memory: { defaultIcon: '', defaultBadge: 'STATE', colorKey: 'accentTeal' },
  database: { defaultIcon: '', defaultBadge: 'PERSISTENCE', colorKey: 'accentWarn' },
  final_answer: { defaultIcon: '', defaultBadge: 'TERMINATION', colorKey: 'accentPrimary' },
};

function CanvasNodeComponent({ id, data, selected }: NodeProps) {
  const t = useVizTokens();
  const nodeData = (data || {}) as unknown as CanvasNodeData;
  const componentType = nodeData.componentType || 'reasoner';
  const config = TYPE_CONFIG[componentType] || TYPE_CONFIG.reasoner;

  const accentColor = t[config.colorKey];
  const icon = nodeData.icon || config.defaultIcon;
  const badge = nodeData.badge || config.defaultBadge;

  const handleStyle = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: accentColor,
    border: `2px solid ${t.surface}`,
    transition: 'transform 0.15s ease',
  };

  return (
    <div
      style={{
        width: 220,
        background: t.surface,
        borderRadius: RADIUS.md,
        border: `2px solid ${selected ? t.textPrimary : accentColor}`,
        boxShadow: selected
          ? `0 0 16px ${accentColor}66, 0 4px 12px rgba(0,0,0,0.5)`
          : `0 4px 12px rgba(0,0,0,0.3)`,
        padding: '10px 12px',
        fontFamily: FONT_FAMILY,
        color: t.textPrimary,
        position: 'relative',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'grab',
      }}
    >
      {/* Ports / Handles: Top, Right, Bottom, Left.
          Each position stacks a source + target handle at the identical
          pixel so a connection can be dragged either way from any side --
          but React Flow hit-tests the DOM-topmost (last-rendered) element
          at that pixel, so the one meant to be grabbed (the visible,
          titled one) must always be rendered LAST, not first. Rendering
          the invisible one last (the original bug) silently swapped
          source/target on Right and Bottom, reversing the arrow direction
          for any edge dragged from those sides. */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ ...handleStyle, top: -5, opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ ...handleStyle, top: -5 }}
        title="Connect input here"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ ...handleStyle, right: -5, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ ...handleStyle, right: -5 }}
        title="Connect output from here"
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ ...handleStyle, bottom: -5, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ ...handleStyle, bottom: -5 }}
        title="Connect output from here"
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ ...handleStyle, left: -5, opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ ...handleStyle, left: -5 }}
        title="Connect input here"
      />

      {/* Header with Icon, Badge & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: RADIUS.sm,
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }}
          >
            {badge}
          </span>
        </div>

        {nodeData.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDeleteNode?.(id);
            }}
            title="Remove node"
            style={{
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 4px',
              borderRadius: RADIUS.sm,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = t.accentDanger)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = t.textMuted)}
          >
            ×
          </button>
        )}
      </div>

      {/* Node Title */}
      <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
        {nodeData.label || componentType}
      </div>

      {/* Node Role */}
      <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 6, textTransform: 'uppercase' }}>
        {nodeData.role}
      </div>

      {/* Node Description (What it has to do) */}
      <div style={{ fontSize: 11, color: t.textSecondary, lineHeight: 1.35 }}>
        {nodeData.description}
      </div>
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
