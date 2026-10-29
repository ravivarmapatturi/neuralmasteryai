import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

type Mode = 'dumb_inlining' | 'map_and_manual';

export default function InstructionBudgetVisualizer() {
  const t = useVizTokens();
  const [fileCount, setFileCount] = useState<number>(60);
  const [mode, setMode] = useState<Mode>('map_and_manual');

  // Naive inlining: each file averages ~1,800 tokens
  const naiveTokens = fileCount * 1800;

  // Map & Manual: AST map uses ~40 tokens per file + constant 8,000 token system & rule budget
  const mapTokens = 8000 + fileCount * 45;
  const contextCeiling = 32000;

  const currentTokens = mode === 'dumb_inlining' ? naiveTokens : mapTokens;
  const percentage = Math.min(100, Math.round((currentTokens / contextCeiling) * 100));
  const isOverflow = currentTokens > contextCeiling;

  const activeColor = isOverflow ? t.accentDanger : percentage > 75 ? t.accentWarn : t.accentPrimary;

  return (
    <VisualizationContainer footer="The Map vs Manual architecture prevents 'Context Anxiety' and attention dispersion. In an agent-first world, dumping raw files into the prompt wastes 95% of your token budget on syntax noise. An AST-extracted repository skeleton provides spatial navigation in under 4,000 tokens.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPurple }}>
            OpenAI & Anthropic Context Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Instruction Budget & Map vs Manual Simulator
          </div>
        </div>
        <PillSelect<Mode>
          label="Context Strategy"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'dumb_inlining', label: 'Naive File Inlining' },
            { value: 'map_and_manual', label: 'Map vs Manual Pattern' },
          ]}
        />
      </div>

      {/* Slider Controls */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Repository Scale: <span style={{ color: t.accentPrimary }}>{fileCount} Python Files</span>
          </label>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeColor }}>
            {currentTokens.toLocaleString()} / {contextCeiling.toLocaleString()} tokens ({percentage}%)
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={fileCount}
          onChange={(e) => setFileCount(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          <span>10 files (Microservice)</span>
          <span>100 files (Standard Application)</span>
          <span>300 files (Enterprise Monorepo)</span>
        </div>
      </div>

      {/* Visual Token Allocation Bar */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>
          Context Window Pressure (32k Token Ceiling):
        </div>
        <div
          style={{
            height: 28,
            width: '100%',
            background: t.background,
            borderRadius: 6,
            overflow: 'hidden',
            border: `1px solid ${t.border}`,
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (currentTokens / contextCeiling) * 100)}%`,
              background: activeColor,
              transition: 'width 0.25s ease, background-color 0.25s ease',
            }}
          />
          {isOverflow && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              CRITICAL OVERFLOW: +{(currentTokens - contextCeiling).toLocaleString()} TOKENS BEYOND BUDGET
            </div>
          )}
        </div>

        {/* Breakdown Tags */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          {mode === 'map_and_manual' ? (
            <>
              <div style={{ fontSize: 11, background: t.background, padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}` }}>
                <span style={{ color: t.accentPurple }}>●</span> Core AGENTS.md Rules: <strong>3,500 tok</strong>
              </div>
              <div style={{ fontSize: 11, background: t.background, padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}` }}>
                <span style={{ color: t.accentTeal }}>●</span> AST Repository Map: <strong>{(fileCount * 45).toLocaleString()} tok</strong>
              </div>
              <div style={{ fontSize: 11, background: t.background, padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}` }}>
                <span style={{ color: t.accentPrimary }}>●</span> Verification State: <strong>2,000 tok</strong>
              </div>
              <div style={{ fontSize: 11, background: t.background, padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}` }}>
                <span style={{ color: t.accentWarn }}>●</span> Dynamic Tool Headroom: <strong>{Math.max(0, contextCeiling - currentTokens).toLocaleString()} tok</strong>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: t.accentDanger }}>
              ⚠ Dumping {fileCount} full source files wastes {(fileCount * 1800).toLocaleString()} tokens on import headers, docstrings, and boilerplate.
            </div>
          )}
        </div>
      </div>

      {/* Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.accentDanger, textTransform: 'uppercase', marginBottom: 6 }}>
            Naive Context Strategy
          </div>
          <p style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5, margin: 0 }}>
            Model receives the complete contents of source files. When the codebase exceeds 15 files, attention decay kicks in: the model skips edge cases, ignores project conventions in `AGENTS.md`, and incurs high API costs.
          </p>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.accentPrimary, textTransform: 'uppercase', marginBottom: 6 }}>
            The Map vs Manual Strategy
          </div>
          <p style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5, margin: 0 }}>
            The harness parses Python AST to extract signatures, docstrings, and exports into an index. The agent navigates this map and requests detailed file reads strictly on demand. <strong>Savings: 93% token economy</strong>.
          </p>
        </div>
      </div>
    </VisualizationContainer>
  );
}
