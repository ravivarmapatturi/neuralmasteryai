import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Scenario = 'unmanaged' | 'engineered';

interface LayerToken {
  name: string;
  tokens: number;
  colorKey: 'accentPrimary' | 'accentSecondary' | 'accentDanger' | 'accentWarn' | 'accentTeal';
}

const UNMANAGED_LAYERS: LayerToken[] = [
  { name: 'System Prompt & Guidelines', tokens: 4200, colorKey: 'accentPrimary' },
  { name: '40 Inlined Tool Schemas', tokens: 12000, colorKey: 'accentDanger' },
  { name: 'Raw File Dumps (4 files)', tokens: 28000, colorKey: 'accentDanger' },
  { name: 'Unpruned Conversation History', tokens: 36000, colorKey: 'accentDanger' },
  { name: 'Free Attention Headroom', tokens: 47800, colorKey: 'accentTeal' },
];

const ENGINEERED_LAYERS: LayerToken[] = [
  { name: 'Curated Root Contract', tokens: 1800, colorKey: 'accentPrimary' },
  { name: 'Deferred Tool Discovery (Names Only)', tokens: 600, colorKey: 'accentSecondary' },
  { name: 'AST-Extracted Repository Map', tokens: 1400, colorKey: 'accentSecondary' },
  { name: 'Compacted Working Memory', tokens: 4200, colorKey: 'accentTeal' },
  { name: 'Free Attention Headroom', tokens: 120000, colorKey: 'accentTeal' },
];

export default function ContextBudgetWaterfallVisualizer() {
  const t = useVizTokens();
  const [scenario, setScenario] = useState<Scenario>('engineered');

  const layers = scenario === 'unmanaged' ? UNMANAGED_LAYERS : ENGINEERED_LAYERS;
  const totalWindow = 128000;
  const usedTokens = layers.slice(0, -1).reduce((acc, l) => acc + l.tokens, 0);

  return (
    <VisualizationContainer
      title="Context Budget Allocation Waterfall"
      footer={
        scenario === 'unmanaged'
          ? 'Unmanaged Context: Inlining raw files and full schemas consumes 80,200 tokens (62.6% of window), triggering severe attention dispersion and lost-in-the-middle degradation.'
          : 'Engineered Context: Deferred schema discovery, AST maps, and two-pass compaction keep active context at 8,000 tokens (6.2% of window), preserving 93.8% free headroom.'
      }
    >
      <VisualizationHeader
        eyebrow="CONTEXT ARCHITECTURE"
        title="Token Budgeting & Allocation Breakdown"
        description="Inspect how context engineering techniques prevent attention rot by controlling token density across inference turns."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<Scenario>
          label="Context Strategy"
          value={scenario}
          onChange={setScenario}
          options={[
            { value: 'engineered', label: '1. Engineered Context (Curated)' },
            { value: 'unmanaged', label: '2. Unmanaged Context (Inlined)' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 240" width="100%" role="img" aria-label="Context Budget Waterfall">
        {/* Total window background */}
        <rect x={40} y={40} width={600} height={32} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />

        {/* Stacked segmented bar */}
        {(() => {
          let currentX = 40;
          return layers.map((layer) => {
            const width = Math.max(4, (layer.tokens / totalWindow) * 600);
            const fill = t[layer.colorKey];
            const thisX = currentX;
            currentX += width;
            return (
              <rect
                key={layer.name}
                x={thisX}
                y={40}
                width={width}
                height={32}
                fill={fill}
                stroke={t.border}
                strokeWidth={0.5}
              />
            );
          });
        })()}

        {/* Stats overlay */}
        <text x={40} y={95} fontSize={13} fontWeight={700} fill={t.textPrimary}>
          Total Window: 128,000 tokens · Used: {usedTokens.toLocaleString()} tokens ({((usedTokens / totalWindow) * 100).toFixed(1)}%)
        </text>

        {/* Legend table */}
        {layers.map((layer, idx) => {
          const ly = 120 + idx * 22;
          return (
            <g key={layer.name}>
              <rect x={40} y={ly} width={12} height={12} rx={2} fill={t[layer.colorKey]} />
              <text x={60} y={ly + 10} fontSize={12} fill={t.textPrimary}>
                {layer.name}
              </text>
              <text x={420} y={ly + 10} fontSize={12} fontWeight={600} fill={t.textSecondary}>
                {layer.tokens.toLocaleString()} tokens
              </text>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
