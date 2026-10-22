import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVizTokens, RADIUS, FONT_FAMILY } from '../../theme/vizTokens';
import { CanvasNode, type CanvasNodeData } from './CanvasNode';
import {
  gradeArchitecture,
  type ArchitectureGradeResult,
} from '../../lib/canvasGrading';
import type { CanvasComponentDefinition, CanvasSpec } from '../../lib/practiceProblem';
import { useGamification } from '../../contexts/GamificationContext';
import { hasAward } from '../../lib/gamification';
import { triggerConfetti } from '../ui/Confetti';
import { loadCanvasState, saveCanvasState } from '../../lib/practicePersistence';

interface CanvasAgentBuilderProps {
  canvasSpec: CanvasSpec;
  problemId: string;
  permalink: string;
  modeToggle?: React.ReactNode;
}

const nodeTypes: NodeTypes = {
  agentComponent: CanvasNode,
};

export default function CanvasAgentBuilder({
  canvasSpec,
  problemId,
  permalink,
  modeToggle,
}: CanvasAgentBuilderProps) {
  const t = useVizTokens();
  const { events, awardArchitectureCompleted } = useGamification();

  // Check if this problem's architecture was previously solved/awarded
  const isAlreadyAwarded = useMemo(() => {
    return hasAward(events, permalink, 'architecture') || hasAward(events, `/practice/${problemId}`, 'architecture');
  }, [events, permalink, problemId]);

  // Convert canvasSpec initialNodes into React Flow Node objects
  const defaultNodes: Node[] = useMemo(() => {
    return canvasSpec.initialNodes.map((init) => {
      const compDef = canvasSpec.availableComponents.find((c) => c.type === init.type);
      return {
        id: init.id,
        type: 'agentComponent',
        position: init.position,
        data: {
          componentType: init.type,
          label: init.label || compDef?.label || init.type,
          role: init.role || compDef?.role || '',
          description: init.description || compDef?.description || '',
          badge: compDef?.badge,
          icon: compDef?.icon,
        } satisfies CanvasNodeData,
      };
    });
  }, [canvasSpec]);

  const defaultEdges: Edge[] = useMemo(() => {
    return (canvasSpec.initialEdges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: t.edge },
      style: { stroke: t.edge, strokeWidth: 2 },
    }));
  }, [canvasSpec, t.edge]);

  // Restore the learner's own saved layout/wiring (if any) rather than
  // always resetting to the unwired default on every page load -- this is
  // the same real localStorage-backed pattern practicePersistence.ts
  // already uses for the code editor and layout splitters.
  const persisted = useMemo(() => loadCanvasState(problemId), [problemId]);

  const initialNodes: Node[] = useMemo(() => {
    if (!persisted) return defaultNodes;
    const savedPositions = new Map(persisted.nodes.map((n) => [n.id, n.position]));
    return defaultNodes.map((n) => (savedPositions.has(n.id) ? { ...n, position: savedPositions.get(n.id)! } : n));
  }, [defaultNodes, persisted]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!persisted || persisted.edges.length === 0) return defaultEdges;
    const nodeIds = new Set(initialNodes.map((n) => n.id));
    return persisted.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: t.accentSecondary },
        style: { stroke: t.accentSecondary, strokeWidth: 2 },
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEdges, persisted, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [gradeResult, setGradeResult] = useState<ArchitectureGradeResult | null>(() =>
    initialEdges.length > 0 ? gradeArchitecture(initialNodes, initialEdges) : null,
  );
  const [isFreshlyAwarded, setIsFreshlyAwarded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Real bug this fixes: on mobile, PracticeWorkspace mounts this component
  // while its own tab is still hidden (display:none) behind the default
  // "Problem" tab -- fitView's one-shot initial calculation runs against a
  // zero-size container and never recalculates, so the canvas renders with
  // nodes stuck far outside the visible viewport once the tab becomes
  // visible. A ResizeObserver re-fits whenever the real (non-zero) size
  // becomes available, which also covers window resize/orientation change.
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  useEffect(() => {
    const el = flowWrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        flowInstanceRef.current?.fitView({ padding: 0.2 });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Persist the learner's own layout/wiring on every real change (drag,
  // connect, delete, reset) -- never award/celebrate here, only Verify
  // Architecture does that; this just keeps their work from vanishing on
  // reload.
  useEffect(() => {
    saveCanvasState(problemId, {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
      edges: edges.map((e) => ({ id: e.id, source: e.source as string, target: e.target as string, label: typeof e.label === 'string' ? e.label : undefined })),
    });
  }, [problemId, nodes, edges]);

  // Helper to delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setGradeResult(null);
    },
    [setNodes, setEdges],
  );

  // Bind delete callback to nodes' data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...((node.data as unknown as CanvasNodeData) || {}),
          onDeleteNode: handleDeleteNode,
        },
      })),
    );
  }, [handleDeleteNode, setNodes]);

  // Connect handler
  const onConnect = useCallback(
    (params: Connection) => {
      // Create edge with stylish arrow marker and animated pulse
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      const sourceType = (sourceNode?.data as unknown as CanvasNodeData)?.componentType;
      const targetType = (targetNode?.data as unknown as CanvasNodeData)?.componentType;

      let edgeLabel: string | undefined;
      if (sourceType === 'reasoner' && targetType === 'tool') edgeLabel = 'Action';
      else if (sourceType === 'tool' && targetType === 'reasoner') edgeLabel = 'Observation';
      else if (sourceType === 'reasoner' && targetType === 'final_answer') edgeLabel = 'Final Answer';
      else if (sourceType === 'reasoner' && targetType === 'memory') edgeLabel = 'Read/Write';
      else if (sourceType === 'memory' && targetType === 'database') edgeLabel = 'Checkpoint';
      else if (sourceType === 'database' && targetType === 'memory') edgeLabel = 'Restore';

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label: edgeLabel,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: t.accentSecondary,
            },
            style: {
              stroke: t.accentSecondary,
              strokeWidth: 2,
            },
            labelStyle: {
              fill: t.textSecondary,
              fontWeight: 600,
              fontSize: 10,
              fontFamily: FONT_FAMILY,
            },
            labelBgStyle: {
              fill: t.surface,
              stroke: t.border,
              strokeWidth: 1,
              rx: 4,
              ry: 4,
            },
          },
          eds,
        ),
      );
      setGradeResult(null); // Clear previous grade until verified again
    },
    [nodes, setEdges, t],
  );

  // Add a component node from the palette
  const handleAddComponent = useCallback(
    (comp: CanvasComponentDefinition) => {
      const id = `node-${comp.type}-${Date.now()}`;
      // Spawn near the center
      const newPos = {
        x: 200 + (nodes.length % 4) * 40,
        y: 150 + (nodes.length % 3) * 50,
      };

      const newNode: Node = {
        id,
        type: 'agentComponent',
        position: newPos,
        data: {
          componentType: comp.type,
          label: comp.label,
          role: comp.role,
          description: comp.description,
          badge: comp.badge,
          icon: comp.icon,
          onDeleteNode: handleDeleteNode,
        } satisfies CanvasNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
      setGradeResult(null);
    },
    [handleDeleteNode, nodes.length, setNodes],
  );

  // Reset to initial topology
  const handleResetLayout = useCallback(() => {
    setNodes(defaultNodes);
    setEdges(defaultEdges);
    setGradeResult(null);
    setIsFreshlyAwarded(false);
  }, [defaultNodes, defaultEdges, setNodes, setEdges]);

  // Clear all connections
  const handleClearEdges = useCallback(() => {
    setEdges([]);
    setGradeResult(null);
  }, [setEdges]);

  // Expose test helper for Playwright integration tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __setCanvasEdges?: (edges: Edge[]) => void }).__setCanvasEdges = (newEdges: Edge[]) => {
        setEdges(newEdges);
      };
      (window as unknown as { __getCanvasGrade?: () => ArchitectureGradeResult }).__getCanvasGrade = () => {
        return gradeArchitecture(nodes, edges);
      };
    }
  }, [nodes, edges, setEdges]);

  // Run Architecture Verification
  const handleVerify = useCallback(() => {
    const result = gradeArchitecture(nodes, edges);
    setGradeResult(result);
    setDrawerOpen(true);

    if (result.isCorrect) {
      triggerConfetti();
      setIsFreshlyAwarded(true);
      // Award real points (+50 XP) via existing gamification machinery
      awardArchitectureCompleted(permalink);
    }
  }, [nodes, edges, permalink, awardArchitectureCompleted]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--nm-surface-alt, #020617)',
        border: '1px solid var(--nm-border, rgba(255,255,255,0.1))',
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
        position: 'relative',
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: '6px 12px',
          borderBottom: `1px solid ${t.border}`,
          background: t.surface,
          zIndex: 20,
        }}
      >
        {/* Left: Mode toggle & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {modeToggle}

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: RADIUS.sm,
              background: isAlreadyAwarded || isFreshlyAwarded ? `${t.accentPrimary}22` : `${t.accentSecondary}15`,
              color: isAlreadyAwarded || isFreshlyAwarded ? t.accentPrimary : t.accentSecondary,
              border: `1px solid ${isAlreadyAwarded || isFreshlyAwarded ? t.accentPrimary : t.accentSecondary}44`,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isAlreadyAwarded || isFreshlyAwarded ? '✓ Solved (+50 XP)' : 'Topology Unsolved'}
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleClearEdges}
            title="Clear all wire connections"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: RADIUS.sm,
              background: 'transparent',
              color: t.textSecondary,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
            }}
          >
            Clear Wires
          </button>

          <button
            type="button"
            onClick={handleResetLayout}
            title="Reset to default components"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: RADIUS.sm,
              background: 'transparent',
              color: t.textSecondary,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleVerify}
            data-testid="verify-architecture-btn"
            style={{
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: RADIUS.sm,
              background: t.accentPrimary,
              color: '#0A0A0B',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 0 12px ${t.accentPrimary}55`,
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
            onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.97)')}
            onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
          >
            Verify Architecture
          </button>
        </div>
      </div>

      {/* Component Palette Tray */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: t.surfaceAlt,
          borderBottom: `1px solid ${t.border}`,
          overflowX: 'auto',
          zIndex: 15,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          Add Node:
        </span>
        {canvasSpec.availableComponents.map((comp) => (
          <button
            key={comp.type}
            type="button"
            onClick={() => handleAddComponent(comp)}
            title={`Add ${comp.label}: ${comp.description}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: RADIUS.sm,
              background: t.surface,
              color: t.textPrimary,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = t.accentSecondary;
              (e.currentTarget as HTMLElement).style.background = t.surfaceAlt;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
              (e.currentTarget as HTMLElement).style.background = t.surface;
            }}
          >
            <span>{comp.icon}</span>
            <span>+ {comp.label}</span>
          </button>
        ))}
      </div>

      {/* Canvas Area */}
      <div ref={flowWrapperRef} style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { flowInstanceRef.current = instance; }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background color={t.border} gap={20} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>

        {/* Floating Instruction Banner (Subtle hint for user) */}
        {!gradeResult && edges.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: `${t.surface}F0`,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${t.accentSecondary}44`,
              borderRadius: RADIUS.md,
              padding: '8px 16px',
              fontSize: 12,
              color: t.textPrimary,
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <span style={{ fontWeight: 700, color: t.accentSecondary }}>Tip: </span>
            Drag from handles on the node edges to connect components into a ReAct loop.
          </div>
        )}
      </div>

      {/* Verification Results Drawer / Panel */}
      {gradeResult && (
        <div
          data-testid="verification-results-panel"
          style={{
            borderTop: `1px solid ${gradeResult.isCorrect ? t.accentPrimary : t.accentWarn}`,
            background: t.surface,
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
            transition: 'max-height 0.25s ease',
            maxHeight: drawerOpen ? 260 : 42,
            overflowY: 'auto',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            onClick={() => setDrawerOpen((o) => !o)}
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: gradeResult.isCorrect ? `${t.accentPrimary}15` : `${t.accentWarn}15`,
              borderBottom: drawerOpen ? `1px solid ${t.border}` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{gradeResult.isCorrect ? '✓' : '✗'}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: gradeResult.isCorrect ? t.accentPrimary : t.accentWarn,
                }}
              >
                {gradeResult.isCorrect
                  ? 'Architecture Verified! Correct Production ReAct Topology (+50 XP)'
                  : `Verification Failed (${gradeResult.passedCount}/${gradeResult.totalCount} rules passed)`}
              </span>
            </div>

            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: t.textMuted,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {drawerOpen ? '▼ Collapse' : '▲ Details'}
            </button>
          </div>

          {/* Drawer Content */}
          {drawerOpen && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Common Mistake Callout (Database-direct-to-Reasoner) */}
              {gradeResult.commonMistakeFeedback && (
                <div
                  data-testid="common-mistake-callout"
                  style={{
                    background: t.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                    border: '1px solid #EF4444',
                    borderRadius: RADIUS.sm,
                    padding: '10px 12px',
                    color: t.mode === 'dark' ? '#FEE2E2' : '#991B1B',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      color: t.mode === 'dark' ? '#FCA5A5' : '#B91C1C',
                      marginBottom: 4,
                    }}
                  >
                    Architecture Anti-Pattern Detected
                  </div>
                  <div>{gradeResult.commonMistakeFeedback}</div>
                </div>
              )}

              {/* Checklist items */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {gradeResult.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: t.surfaceAlt,
                      border: `1px solid ${item.passed ? `${t.accentPrimary}44` : `${t.accentDanger}44`}`,
                      borderRadius: RADIUS.sm,
                      padding: '8px 10px',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 2 }}>
                      <span style={{ color: item.passed ? t.accentPrimary : t.accentDanger }}>
                        {item.passed ? '✓' : '✗'}
                      </span>
                      <span style={{ color: t.textPrimary }}>{item.label}</span>
                    </div>
                    <div
                      style={{
                        color: item.passed ? t.textSecondary : (t.mode === 'dark' ? '#FCA5A5' : '#DC2626'),
                        lineHeight: 1.35,
                      }}
                    >
                      {item.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
